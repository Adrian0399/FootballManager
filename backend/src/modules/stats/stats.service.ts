// Stats service — leaderboards + highlights for a league.
//
// Computes top scorers, top assisters, MVPs, fair play, best goalkeeper,
// best attacking team, and best defensive team from COMPLETED matches.

import { prisma } from '../../shared/prisma/prisma.client.js';

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  value: number;
  secondary: number;
}

export interface LeagueHighlights {
  topScorer: { playerId: string; playerName: string; teamName: string; goals: number; assists: number } | null;
  topAssister: { playerId: string; playerName: string; teamName: string; assists: number; goals: number } | null;
  bestGoalkeeper: { playerId: string; playerName: string; teamName: string; cleanSheets: number; matchesPlayed: number } | null;
  bestAttackingTeam: { teamId: string; teamName: string; goals: number } | null;
  bestDefensiveTeam: { teamId: string; teamName: string; conceded: number } | null;
}

export interface LeagueStats {
  goals: LeaderboardEntry[];
  assists: LeaderboardEntry[];
  mvps: LeaderboardEntry[];
  fairPlay: LeaderboardEntry[];
  highlights: LeagueHighlights;
}

export const statsService = {
  async computeForLeague(leagueId: string): Promise<LeagueStats> {
    const matchesPromise = prisma.match.findMany({
      where: { leagueId, status: 'COMPLETED' },
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        mvpUserId: true,
      },
    });
    const leagueTeamsPromise = prisma.leagueTeam.findMany({
      where: { leagueId },
      select: { teamId: true, groupLabel: true },
    });
    const [matches, leagueTeamsRaw] = await Promise.all([matchesPromise, leagueTeamsPromise]);
    const leagueTeams = leagueTeamsRaw as Array<{ teamId: string; groupLabel: string | null }>;
    const teams = await prisma.team.findMany({
      where: { id: { in: leagueTeams.map((lt) => lt.teamId) } },
      select: { id: true, name: true },
    });

    const teamNames = new Map(teams.map((t) => [t.id, t.name]));

    // Player names: resolved in bulk so the leaderboards never expose a
    // raw playerId. The ids come from the events loaded just below.
    const playerNames = new Map<string, string>();

    // Aggregate per-player stats.
    const playerStats = new Map<string, {
      goals: number;
      assists: number;
      mvpCount: number;
      yellowCards: number;
      redCards: number;
      cleanSheets: number;
      matchesPlayed: number;
      teamId: string;
    }>();

    // Get all events for these matches.
    const matchIds = matches.map((m) => m.id);
    const events = await prisma.matchEvent.findMany({
      where: { matchId: { in: matchIds } },
      include: { user: true },
    });

    // Index events by match.
    const eventsByMatch = new Map<string, typeof events>();
    for (const e of events) {
      const list = eventsByMatch.get(e.matchId) ?? [];
      list.push(e);
      eventsByMatch.set(e.matchId, list);
    }

    const playerIds = [...new Set(events.map((e) => e.userId).filter(Boolean))] as string[];
    const players = await prisma.user.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, firstName: true, paternalSurname: true, nickname: true },
    });
    for (const u of players) {
      playerNames.set(
        u.id,
        (u.nickname ?? `${u.firstName} ${u.paternalSurname}`.trim()),
      );
    }

    // Build player stats from events.
    for (const e of events) {
      const ps = playerStats.get(e.userId) ?? {
        goals: 0, assists: 0, mvpCount: 0, yellowCards: 0, redCards: 0,
        cleanSheets: 0, matchesPlayed: 0, teamId: e.teamId,
      };
      switch (e.type) {
        case 'GOAL':
          ps.goals += 1;
          // The seed stores the assister as `secondaryUserId` on the GOAL
          // event (instead of a separate ASSIST event). Count it here so
          // assists leaderboards work without a dedicated event row.
          if (e.secondaryUserId) {
            const assist = playerStats.get(e.secondaryUserId) ?? {
              goals: 0, assists: 0, mvpCount: 0, yellowCards: 0, redCards: 0,
              cleanSheets: 0, matchesPlayed: 0, teamId: e.teamId,
            };
            assist.assists += 1;
            playerStats.set(e.secondaryUserId, assist);
          }
          break;
        case 'ASSIST': ps.assists += 1; break;
        case 'MVP': ps.mvpCount += 1; break;
        case 'YELLOW_CARD': ps.yellowCards += 1; break;
        case 'RED_CARD': ps.redCards += 1; break;
      }
      playerStats.set(e.userId, ps);
    }

    // Count matches played per player (from team memberships).
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId: { in: leagueTeams.map((lt) => lt.teamId) } },
      select: { userId: true, teamId: true, membershipRole: true },
    });
    for (const m of memberships) {
      if (m.membershipRole !== 'PLAYER') continue;
      const ps = playerStats.get(m.userId) ?? {
        goals: 0, assists: 0, mvpCount: 0, yellowCards: 0, redCards: 0,
        cleanSheets: 0, matchesPlayed: 0, teamId: m.teamId,
      };
      // Count matches where this player's team played.
      const teamMatches = matches.filter(
        (match) => match.homeTeamId === m.teamId || match.awayTeamId === m.teamId,
      );
      ps.matchesPlayed = teamMatches.length;
      // Clean sheets: team didn't concede.
      for (const match of teamMatches) {
        const conceded = match.homeTeamId === m.teamId
          ? (match.awayScore ?? 0)
          : (match.homeScore ?? 0);
        if (conceded === 0) ps.cleanSheets += 1;
      }
      playerStats.set(m.userId, ps);
    }

    // Goals leaderboard.
    const goals: LeaderboardEntry[] = [];
    for (const [pid, ps] of playerStats) {
      if (ps.goals > 0) {
        goals.push({
          rank: 0,
          playerId: pid,
          playerName: playerNames.get(pid) ?? 'Jugador',
          teamId: ps.teamId,
          teamName: teamNames.get(ps.teamId) ?? ps.teamId,
          value: ps.goals,
          secondary: ps.assists,
        });
      }
    }
    goals.sort((a, b) => b.value - a.value || b.secondary - a.secondary);
    goals.forEach((g, i) => { g.rank = i + 1; });

    // Assists leaderboard.
    const assists: LeaderboardEntry[] = [];
    for (const [pid, ps] of playerStats) {
      if (ps.assists > 0) {
        assists.push({
          rank: 0,
          playerId: pid,
          playerName: playerNames.get(pid) ?? 'Jugador',
          teamId: ps.teamId,
          teamName: teamNames.get(ps.teamId) ?? ps.teamId,
          value: ps.assists,
          secondary: ps.goals,
        });
      }
    }
    assists.sort((a, b) => b.value - a.value || b.secondary - a.secondary);
    assists.forEach((a, i) => { a.rank = i + 1; });

    // MVPs leaderboard.
    const mvps: LeaderboardEntry[] = [];
    for (const [pid, ps] of playerStats) {
      if (ps.mvpCount > 0) {
        mvps.push({
          rank: 0,
          playerId: pid,
          playerName: playerNames.get(pid) ?? 'Jugador',
          teamId: ps.teamId,
          teamName: teamNames.get(ps.teamId) ?? ps.teamId,
          value: ps.mvpCount,
          secondary: ps.matchesPlayed,
        });
      }
    }
    mvps.sort((a, b) => b.value - a.value || b.secondary - a.secondary);
    mvps.forEach((m, i) => { m.rank = i + 1; });

    // Fair play (fewer cards = better).
    const fairPlay: LeaderboardEntry[] = [];
    for (const [pid, ps] of playerStats) {
      const cards = ps.yellowCards + ps.redCards;
      if (cards > 0) {
        fairPlay.push({
          rank: 0,
          playerId: pid,
          playerName: playerNames.get(pid) ?? 'Jugador',
          teamId: ps.teamId,
          teamName: teamNames.get(ps.teamId) ?? ps.teamId,
          value: -cards, // negative so fewer cards = higher rank
          secondary: ps.matchesPlayed,
        });
      }
    }
    fairPlay.sort((a, b) => b.value - a.value || b.secondary - a.secondary);
    fairPlay.forEach((f, i) => { f.rank = i + 1; });

    // Highlights.
    const topScorer = goals[0] ?? null;
    const topAssister = assists[0] ?? null;
    const bestGk = Array.from(playerStats.entries())
      .filter(([, ps]) => ps.cleanSheets > 0)
      .sort((a, b) => b[1].cleanSheets - a[1].cleanSheets)[0];
    const bestAttacking = teams
      .map((t) => {
        const teamMatches = matches.filter(
          (m) => m.homeTeamId === t.id || m.awayTeamId === t.id,
        );
        const goals = teamMatches.reduce(
          (sum, m) => sum + (m.homeTeamId === t.id ? (m.homeScore ?? 0) : (m.awayScore ?? 0)),
          0,
        );
        return { teamId: t.id, teamName: t.name, goals };
      })
      .sort((a, b) => b.goals - a.goals)[0] ?? null;
    const bestDefensive = teams
      .map((t) => {
        const teamMatches = matches.filter(
          (m) => m.homeTeamId === t.id || m.awayTeamId === t.id,
        );
        const conceded = teamMatches.reduce(
          (sum, m) => sum + (m.homeTeamId === t.id ? (m.awayScore ?? 0) : (m.homeScore ?? 0)),
          0,
        );
        return { teamId: t.id, teamName: t.name, conceded };
      })
      .sort((a, b) => a.conceded - b.conceded)[0] ?? null;

    // Fill player names from events.
    const userIds = new Set<string>();
    for (const e of events) {
      userIds.add(e.userId);
      if (e.secondaryUserId) userIds.add(e.secondaryUserId);
    }
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, firstName: true, paternalSurname: true, maternalSurname: true },
    });
    const userNames = new Map(users.map((u) => [u.id, `${u.firstName} ${u.paternalSurname} ${u.maternalSurname}`.trim()]));

    const fillName = (e: LeaderboardEntry): LeaderboardEntry => ({
      ...e,
      playerName: userNames.get(e.playerId) ?? e.playerId,
    });

    return {
      goals: goals.map(fillName),
      assists: assists.map(fillName),
      mvps: mvps.map(fillName),
      fairPlay: fairPlay.map(fillName),
      highlights: {
        topScorer: topScorer
          ? {
              playerId: topScorer.playerId,
              playerName: userNames.get(topScorer.playerId) ?? topScorer.playerId,
              teamName: topScorer.teamName,
              goals: topScorer.value,
              assists: topScorer.secondary,
            }
          : null,
        topAssister: topAssister
          ? {
              playerId: topAssister.playerId,
              playerName: userNames.get(topAssister.playerId) ?? topAssister.playerId,
              teamName: topAssister.teamName,
              assists: topAssister.value,
              goals: topAssister.secondary,
            }
          : null,
        bestGoalkeeper: bestGk
          ? {
              playerId: bestGk[0]!,
              playerName: userNames.get(bestGk[0]!) ?? bestGk[0]!,
              teamName: teamNames.get(bestGk[1]!.teamId) ?? bestGk[1]!.teamId,
              cleanSheets: bestGk[1]!.cleanSheets,
              matchesPlayed: bestGk[1]!.matchesPlayed,
            }
          : null,
        bestAttackingTeam: bestAttacking
          ? { teamId: bestAttacking.teamId, teamName: bestAttacking.teamName, goals: bestAttacking.goals }
          : null,
        bestDefensiveTeam: bestDefensive
          ? { teamId: bestDefensive.teamId, teamName: bestDefensive.teamName, conceded: bestDefensive.conceded }
          : null,
      },
    };
  },
};
