// Fase C — Profile aggregation service.
//
// Computes the player profile (stats, recent matches, awards, teams,
// career) and the referee profile (stats, recent matches) directly from
// the database, so the profile pages no longer depend on mock data.
//
// The shapes mirror `frontend/src/types/profile.ts` 1:1 so the UI does
// not need to change.

import { prisma } from '../../shared/prisma/prisma.client.js';

/** Match result from the profile owner's perspective. */
type MatchResult = 'WIN' | 'LOSS' | 'DRAW';

// ----- DTOs (contract with the frontend) -----

export interface ProfileStatsDto {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  goals: number;
  assists: number;
  mvpAwards: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
  winRate: number;
  currentStreak: number;
  ranking: number;
}

export interface RecentMatchDto {
  id: string;
  date: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  result: MatchResult;
  field: string;
  goals: number;
  assists: number;
}

export interface AwardDto {
  id: string;
  title: string;
  category: string;
  level: string;
  season: string;
  competition: string;
  awardedAt: string;
  description?: string;
}

export interface CareerSeasonDto {
  id: string;
  season: string;
  team: string;
  matches: number;
  goals: number;
  assists: number;
  isCurrent: boolean;
}

export interface UserTeamDto {
  teamId: string;
  teamName: string;
  teamShortName: string;
  teamEmoji: string | null;
  primaryColor: string;
  secondaryColor: string;
  membershipRole: string;
  jerseyNumber: number | null;
  position: string | null;
  isCaptain: boolean;
  leagueId: string | null;
  leagueName: string | null;
}

export interface RefereeStatsDto {
  matchesOfficiated: number;
  yellowCardsGiven: number;
  redCardsGiven: number;
  mvpDesignated: number;
  leagues: { leagueId: string; leagueName: string; matches: number }[];
}

export interface RefereeMatchDto {
  id: string;
  date: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  field: string;
}

export interface ProfileBundleDto {
  teams: UserTeamDto[];
  stats: ProfileStatsDto;
  recentMatches: RecentMatchDto[];
  awards: AwardDto[];
  career: CareerSeasonDto[];
}

export interface PlayerLeagueStatsDto {
  leagueId: string;
  leagueName: string;
  leagueSeason: string;
  playerId: string;
  playerName: string;
  teamId: string | null;
  teamName: string | null;
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  mvpCount: number;
  cleanSheets: number;
  goalsRank: number | null;
  fairPlay: number;
}

const RESULT_WIN: MatchResult = 'WIN';
const RESULT_LOSS: MatchResult = 'LOSS';
const RESULT_DRAW: MatchResult = 'DRAW';

const EMPTY_STATS: ProfileStatsDto = {
  matchesPlayed: 0,
  matchesWon: 0,
  matchesLost: 0,
  matchesDrawn: 0,
  goals: 0,
  assists: 0,
  mvpAwards: 0,
  yellowCards: 0,
  redCards: 0,
  cleanSheets: 0,
  winRate: 0,
  currentStreak: 0,
  ranking: 0,
};

interface PlayerMatchRow {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  scheduledAt: Date;
  leagueId: string;
  fieldId: string | null;
}

/** Resolves the profile owner's team ids (only where they are a PLAYER). */
async function loadPlayerTeamIds(userId: string): Promise<string[]> {
  const memberships = await prisma.teamMembership.findMany({
    where: { userId },
    select: { teamId: true, membershipRole: true },
  });
  return memberships.filter((m) => m.membershipRole === 'PLAYER').map((m) => m.teamId);
}

function sideResult(match: PlayerMatchRow, teamIds: Set<string>): {
  result: MatchResult;
  scored: number;
  conceded: number;
} | null {
  const isHome = teamIds.has(match.homeTeamId);
  const isAway = teamIds.has(match.awayTeamId);
  if (!isHome && !isAway) return null;
  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;
  // If the user has both teams (unlikely), treat as home.
  const scored = isHome ? home : away;
  const conceded = isHome ? away : home;
  const result = scored > conceded ? RESULT_WIN : scored < conceded ? RESULT_LOSS : RESULT_DRAW;
  return { result, scored, conceded };
}

export const profileService = {
  async getStats(userId: string): Promise<ProfileStatsDto> {
    const teamIds = await loadPlayerTeamIds(userId);
    if (teamIds.length === 0) return { ...EMPTY_STATS };

    const ids = teamIds;
    const [matches, events, mvpAwards, goalRanking] = await Promise.all([
      prisma.match.findMany({
        where: {
          status: 'COMPLETED',
          homeScore: { not: null },
          awayScore: { not: null },
          OR: [{ homeTeamId: { in: ids } }, { awayTeamId: { in: ids } }],
        },
        select: {
          id: true,
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          scheduledAt: true,
          leagueId: true,
          fieldId: true,
        },
      }),
      prisma.matchEvent.findMany({
        where: { OR: [{ userId }, { secondaryUserId: userId }] },
        select: { type: true, userId: true, secondaryUserId: true },
      }),
      prisma.match.count({ where: { mvpUserId: userId, status: 'COMPLETED' } }),
      prisma.matchEvent.groupBy({
        by: ['userId'],
        where: { type: 'GOAL' },
        _count: { _all: true },
      }),
    ]);

    const set = new Set(ids);
    let played = 0;
    let won = 0;
    let lost = 0;
    let drawn = 0;
    let cleanSheets = 0;
    const ordered = [...matches].sort(
      (a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime(),
    );
    for (const m of matches) {
      const r = sideResult(m, set);
      if (!r) continue;
      played += 1;
      if (r.result === RESULT_WIN) won += 1;
      else if (r.result === RESULT_LOSS) lost += 1;
      else drawn += 1;
      if (r.conceded === 0) cleanSheets += 1;
    }

    let currentStreak = 0;
    for (const m of ordered) {
      const r = sideResult(m, set);
      if (!r) continue;
      if (r.result === RESULT_WIN) currentStreak += 1;
      else break;
    }

    const goals = events.filter((e) => e.type === 'GOAL' && e.userId === userId).length;
    const assists = events.filter(
      (e) => e.type === 'GOAL' && e.secondaryUserId === userId,
    ).length;
    const yellowCards = events.filter(
      (e) => e.type === 'YELLOW_CARD' && e.userId === userId,
    ).length;
    const redCards = events.filter(
      (e) => e.type === 'RED_CARD' && e.userId === userId,
    ).length;

    const ranked = [...goalRanking].sort((a, b) => b._count._all - a._count._all);
    const ranking = ranked.findIndex((r) => r.userId === userId) + 1;

    return {
      matchesPlayed: played,
      matchesWon: won,
      matchesLost: lost,
      matchesDrawn: drawn,
      goals,
      assists,
      mvpAwards,
      yellowCards,
      redCards,
      cleanSheets,
      winRate: played > 0 ? Math.round((won / played) * 100) : 0,
      currentStreak,
      ranking: ranking === 0 ? ranked.length + 1 : ranking,
    };
  },

  async getRecentMatches(userId: string, limit = 4): Promise<RecentMatchDto[]> {
    const teamIds = await loadPlayerTeamIds(userId);
    if (teamIds.length === 0) return [];

    const ids = teamIds;
    const matches = await prisma.match.findMany({
      where: {
        status: 'COMPLETED',
        homeScore: { not: null },
        awayScore: { not: null },
        OR: [{ homeTeamId: { in: ids } }, { awayTeamId: { in: ids } }],
      },
      orderBy: { scheduledAt: 'desc' },
      take: limit,
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        league: { select: { name: true } },
        field: { select: { name: true } },
      },
    });

    const matchIds = matches.map((m) => m.id);
    const events = matchIds.length
      ? await prisma.matchEvent.findMany({
          where: {
            matchId: { in: matchIds },
            type: 'GOAL',
            OR: [{ userId }, { secondaryUserId: userId }],
          },
          select: { matchId: true, userId: true, secondaryUserId: true },
        })
      : [];

    const goalsByMatch = new Map<string, number>();
    const assistsByMatch = new Map<string, number>();
    for (const e of events) {
      if (e.userId === userId) {
        goalsByMatch.set(e.matchId, (goalsByMatch.get(e.matchId) ?? 0) + 1);
      }
      if (e.secondaryUserId === userId) {
        assistsByMatch.set(e.matchId, (assistsByMatch.get(e.matchId) ?? 0) + 1);
      }
    }

    const set = new Set(teamIds);
    return matches.map((m) => {
      const isHome = set.has(m.homeTeamId);
      const r = sideResult(m, set);
      return {
        id: m.id,
        date: m.scheduledAt.toISOString(),
        competition: m.league.name,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeScore: m.homeScore ?? 0,
        awayScore: m.awayScore ?? 0,
        result: r ? r.result : isHome ? RESULT_DRAW : RESULT_DRAW,
        field: m.field?.name ?? 'Cancha por definir',
        goals: goalsByMatch.get(m.id) ?? 0,
        assists: assistsByMatch.get(m.id) ?? 0,
      };
    });
  },

  async getAwards(userId: string): Promise<AwardDto[]> {
    const awards = await prisma.award.findMany({
      where: { userId, deletedAt: null },
      orderBy: { awardedAt: 'desc' },
      include: {
        league: { select: { name: true, season: true } },
      },
    });
    return awards.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      level: a.level,
      season: a.league?.season ?? '',
      competition: a.league?.name ?? '',
      awardedAt: a.awardedAt.toISOString(),
      ...(a.description ? { description: a.description } : {}),
    }));
  },

  async getTeams(userId: string): Promise<UserTeamDto[]> {
    const memberships = await prisma.teamMembership.findMany({
      where: { userId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            emoji: true,
            primaryColor: true,
            secondaryColor: true,
            currentLeagueId: true,
            currentLeague: { select: { id: true, name: true } },
          },
        },
      },
    });
    return memberships.map((m) => ({
      teamId: m.team.id,
      teamName: m.team.name,
      teamShortName: m.team.shortName,
      teamEmoji: m.team.emoji,
      primaryColor: m.team.primaryColor,
      secondaryColor: m.team.secondaryColor,
      membershipRole: m.membershipRole,
      jerseyNumber: m.jerseyNumber,
      position: m.position,
      isCaptain: m.isCaptain,
      leagueId: m.team.currentLeague?.id ?? m.team.currentLeagueId ?? null,
      leagueName: m.team.currentLeague?.name ?? null,
    }));
  },

  async getCareer(userId: string): Promise<CareerSeasonDto[]> {
    const teamIds = await loadPlayerTeamIds(userId);
    if (teamIds.length === 0) return [];

    const ids = teamIds;
    const matches = await prisma.match.findMany({
      where: {
        status: 'COMPLETED',
        homeScore: { not: null },
        awayScore: { not: null },
        OR: [{ homeTeamId: { in: ids } }, { awayTeamId: { in: ids } }],
      },
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        leagueId: true,
        league: { select: { name: true, season: true, isActive: true } },
      },
    });

    const matchIds = matches.map((m) => m.id);
    const events = matchIds.length
      ? await prisma.matchEvent.findMany({
          where: {
            matchId: { in: matchIds },
            type: 'GOAL',
            OR: [{ userId }, { secondaryUserId: userId }],
          },
          select: { matchId: true, userId: true, secondaryUserId: true },
        })
      : [];

    const byMatch = new Map<string, { goals: number; assists: number }>();
    for (const e of events) {
      const cur = byMatch.get(e.matchId) ?? { goals: 0, assists: 0 };
      if (e.userId === userId) cur.goals += 1;
      if (e.secondaryUserId === userId) cur.assists += 1;
      byMatch.set(e.matchId, cur);
    }

    const byLeague = new Map<
      string,
      { id: string; season: string; team: string; matches: number; goals: number; assists: number; isCurrent: boolean }
    >();
    for (const m of matches) {
      const existing = byLeague.get(m.leagueId) ?? {
        id: m.leagueId,
        season: m.league.season ?? m.league.name,
        team: '',
        matches: 0,
        goals: 0,
        assists: 0,
        isCurrent: m.league.isActive,
      };
      existing.matches += 1;
      const stats = byMatch.get(m.id);
      if (stats) {
        existing.goals += stats.goals;
        existing.assists += stats.assists;
      }
      byLeague.set(m.leagueId, existing);
    }

    return [...byLeague.values()].sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1));
  },

  /** Per-league player stats (feeds the "stats by league" tab). */
  async getStatsByLeague(userId: string): Promise<PlayerLeagueStatsDto[]> {
    const teamIds = await loadPlayerTeamIds(userId);
    if (teamIds.length === 0) return [];

    const ids = teamIds;
    const [me, memberships, matches, events] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, paternalSurname: true },
      }),
      prisma.teamMembership.findMany({
        where: { userId, membershipRole: 'PLAYER' },
        select: { teamId: true, team: { select: { name: true } } },
      }),
      prisma.match.findMany({
        where: {
          status: 'COMPLETED',
          homeScore: { not: null },
          awayScore: { not: null },
          OR: [{ homeTeamId: { in: ids } }, { awayTeamId: { in: ids } }],
        },
        select: {
          id: true,
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          leagueId: true,
          league: { select: { name: true, season: true } },
        },
      }),
      prisma.matchEvent.findMany({
        where: { OR: [{ userId }, { secondaryUserId: userId }] },
        select: { matchId: true, type: true, userId: true, secondaryUserId: true },
      }),
    ]);

    const teamNameByTeamId = new Map<string, string>();
    for (const m of memberships) teamNameByTeamId.set(m.teamId, m.team.name);

    const eventsByMatch = new Map<
      string,
      { goals: number; assists: number; yellow: number; red: number }
    >();
    for (const e of events) {
      const cur = eventsByMatch.get(e.matchId) ?? { goals: 0, assists: 0, yellow: 0, red: 0 };
      if (e.type === 'GOAL' && e.userId === userId) cur.goals += 1;
      if (e.type === 'GOAL' && e.secondaryUserId === userId) cur.assists += 1;
      if (e.type === 'YELLOW_CARD' && e.userId === userId) cur.yellow += 1;
      if (e.type === 'RED_CARD' && e.userId === userId) cur.red += 1;
      eventsByMatch.set(e.matchId, cur);
    }

    const set = new Set(ids);
    const playerName = me ? `${me.firstName} ${me.paternalSurname}`.trim() : '';

    interface Acc {
      leagueId: string;
      leagueName: string;
      leagueSeason: string;
      teamId: string | null;
      teamName: string | null;
      matchesPlayed: number;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
      mvpCount: number;
      cleanSheets: number;
    }
    const byLeague = new Map<string, Acc>();
    for (const m of matches) {
      const isHome = set.has(m.homeTeamId);
      const isAway = set.has(m.awayTeamId);
      if (!isHome && !isAway) continue;
      const teamId = isHome ? m.homeTeamId : m.awayTeamId;
      const acc = byLeague.get(m.leagueId) ?? {
        leagueId: m.leagueId,
        leagueName: m.league.name,
        leagueSeason: m.league.season ?? '',
        teamId,
        teamName: teamNameByTeamId.get(teamId) ?? null,
        matchesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        mvpCount: 0,
        cleanSheets: 0,
      };
      acc.matchesPlayed += 1;
      const conceded = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
      if (conceded === 0) acc.cleanSheets += 1;
      const ev = eventsByMatch.get(m.id);
      if (ev) {
        acc.goals += ev.goals;
        acc.assists += ev.assists;
        acc.yellowCards += ev.yellow;
        acc.redCards += ev.red;
      }
      byLeague.set(m.leagueId, acc);
    }

    const mvpMatches = await prisma.match.findMany({
      where: { mvpUserId: userId, status: 'COMPLETED', leagueId: { in: [...byLeague.keys()] } },
      select: { leagueId: true },
    });
    for (const m of mvpMatches) {
      const acc = byLeague.get(m.leagueId);
      if (acc) acc.mvpCount += 1;
    }

    const result: PlayerLeagueStatsDto[] = [];
    for (const acc of byLeague.values()) {
      const goalGroups = await prisma.matchEvent.groupBy({
        by: ['userId'],
        where: { type: 'GOAL', match: { leagueId: acc.leagueId } },
        _count: { _all: true },
      });
      const ranked = [...goalGroups].sort((a, b) => b._count._all - a._count._all);
      const idx = ranked.findIndex((r) => r.userId === userId);
      result.push({
        leagueId: acc.leagueId,
        leagueName: acc.leagueName,
        leagueSeason: acc.leagueSeason,
        playerId: userId,
        playerName,
        teamId: acc.teamId,
        teamName: acc.teamName,
        matchesPlayed: acc.matchesPlayed,
        goals: acc.goals,
        assists: acc.assists,
        yellowCards: acc.yellowCards,
        redCards: acc.redCards,
        mvpCount: acc.mvpCount,
        cleanSheets: acc.cleanSheets,
        goalsRank: idx >= 0 ? idx + 1 : null,
        fairPlay: Math.max(0, 100 - acc.yellowCards * 5 - acc.redCards * 15),
      });
    }
    return result;
  },

  async getProfile(userId: string): Promise<ProfileBundleDto> {
    const [teams, stats, recentMatches, awards, career] = await Promise.all([
      this.getTeams(userId),
      this.getStats(userId),
      this.getRecentMatches(userId, 4),
      this.getAwards(userId),
      this.getCareer(userId),
    ]);
    return { teams, stats, recentMatches, awards, career };
  },

  async getRefereeStats(userId: string): Promise<RefereeStatsDto> {
    const matches = await prisma.match.findMany({
      where: { refereeId: userId },
      select: {
        id: true,
        mvpUserId: true,
        leagueId: true,
        league: { select: { name: true } },
      },
    });
    const matchIds = matches.map((m) => m.id);
    const cardEvents = matchIds.length
      ? await prisma.matchEvent.findMany({
          where: { matchId: { in: matchIds }, type: { in: ['YELLOW_CARD', 'RED_CARD'] } },
          select: { type: true },
        })
      : [];

    const leagueMap = new Map<string, { leagueId: string; leagueName: string; matches: number }>();
    for (const m of matches) {
      const cur = leagueMap.get(m.leagueId) ?? {
        leagueId: m.leagueId,
        leagueName: m.league.name,
        matches: 0,
      };
      cur.matches += 1;
      leagueMap.set(m.leagueId, cur);
    }

    return {
      matchesOfficiated: matches.length,
      yellowCardsGiven: cardEvents.filter((e) => e.type === 'YELLOW_CARD').length,
      redCardsGiven: cardEvents.filter((e) => e.type === 'RED_CARD').length,
      mvpDesignated: matches.filter((m) => m.mvpUserId !== null).length,
      leagues: [...leagueMap.values()].sort((a, b) => b.matches - a.matches),
    };
  },

  async getRefereeMatches(userId: string, limit = 5): Promise<RefereeMatchDto[]> {
    const matches = await prisma.match.findMany({
      where: { refereeId: userId },
      orderBy: { scheduledAt: 'desc' },
      take: limit,
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        league: { select: { name: true } },
        field: { select: { name: true } },
      },
    });
    return matches.map((m) => ({
      id: m.id,
      date: m.scheduledAt.toISOString(),
      competition: m.league.name,
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      field: m.field?.name ?? 'Cancha por definir',
    }));
  },
};
