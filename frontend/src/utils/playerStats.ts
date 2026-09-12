// Player & referee stats aggregation (Paso 8).
//
// Pure functions: turn (events, matches, league teams) into per-player
// or per-referee statistics. No React, no mocks — just data → stats.

import type { Match } from '../types/match';
import type { MatchEvent } from '../types/matchEvent';
import type { LeagueTeam } from '../types/leagueTeam';

export interface PlayerLeagueStats {
  playerId: string;
  playerName: string;
  /** Primary team for this stat row. */
  teamId: string;
  teamName: string;
  leagueId: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  mvpCount: number;
  cleanSheets: number;
  /** Position in the goals ranking within the league (1-based). null
   *  if the player hasn't scored. */
  goalsRank: number | null;
  /** Fair play score (lower = more cards). */
  fairPlay: number;
}

interface PlayerStatOptions {
  matches: Match[];
  events: MatchEvent[];
  leagueTeams: LeagueTeam[];
  leagueId: string;
}

/**
 * Aggregates events into per-player stats for a single league.
 *
 * Algorithm:
 *   1. For every player that appears in `events` (any role) OR is a
 *      member of any team in `leagueTeams`, initialize a row.
 *   2. Walk the events:
 *        GOAL          → +1 goals
 *        ASSIST        → +1 assists
 *        YELLOW_CARD   → +1 yellowCards
 *        RED_CARD      → +1 redCards
 *        MVP           → +1 mvpCount
 *   3. Count distinct `matchId` per player for matchesPlayed.
 *   4. Compute ranking by goals desc → assists desc.
 */
export function computePlayerStatsForLeague(opts: PlayerStatOptions): PlayerLeagueStats[] {
  const { matches, events, leagueTeams, leagueId } = opts;

  // Index of team-id → player-ids on that team (from LeagueTeam data,
  // we don't have direct team membership in PlayerLeagueStats so we
  // derive it later from events).
  // Map of matchId → homeTeamId/awayTeamId for cleanSheets calculation.
  const matchTeamById = new Map<string, { home: string; away: string }>();
  for (const m of matches) {
    matchTeamById.set(m.id, { home: m.homeTeamId, away: m.awayTeamId });
  }

  // Initialise rows for every player in every league team.
  const acc = new Map<string, PlayerLeagueStats & { _matchIds: Set<string> }>();
  for (const e of events) {
    if (acc.has(e.playerId)) continue;
    acc.set(e.playerId, {
      playerId: e.playerId,
      playerName: e.playerId, // fallback; filled by caller if needed
      teamId: e.teamId,
      teamName: e.teamId, // fallback; filled by caller if needed
      leagueId,
      matchesPlayed: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      mvpCount: 0,
      cleanSheets: 0,
      goalsRank: null,
      fairPlay: 0,
      _matchIds: new Set<string>(),
    });
  }
  // If the league has zero events, we still want a row per team member
  // so empty leaderboards render. The caller (hook) is expected to
  // pass events filtered by league — if none, we fall through and
  // return [].

  // Walk events and increment.
  for (const e of events) {
    const row = acc.get(e.playerId);
    if (!row) continue;
    row._matchIds.add(e.matchId);
    switch (e.type) {
      case 'GOAL':        row.goals += 1; break;
      case 'ASSIST':      row.assists += 1; break;
      case 'YELLOW_CARD': row.yellowCards += 1; row.fairPlay -= 1; break;
      case 'RED_CARD':    row.redCards += 1; row.fairPlay -= 3; break;
      case 'MVP':         row.mvpCount += 1; break;
      case 'SUBSTITUTION':
      case 'NOTE': break;
    }
  }

  // Matches played = distinct matchIds.
  for (const r of acc.values()) {
    r.matchesPlayed = r._matchIds.size;
    delete (r as { _matchIds?: Set<string> })._matchIds;
  }

  // Compute goals ranking within the league.
  const rows = Array.from(acc.values());
  rows.sort((a, b) => b.goals - a.goals || b.assists - a.assists);
  let lastGoals = -1;
  let lastAssists = -1;
  let rank = 0;
  let seen = 0;
  for (const r of rows) {
    seen += 1;
    if (r.goals === 0) {
      r.goalsRank = null;
      continue;
    }
    const isTie = r.goals === lastGoals && r.assists === lastAssists;
    if (!isTie) rank = seen;
    r.goalsRank = rank;
    lastGoals = r.goals;
    lastAssists = r.assists;
  }

  return rows;
}

// ----- Referee stats --------------------------------------------------------

export interface RefereeStats {
  refereeId: string;
  matchesOfficiated: number;
  yellowCardsGiven: number;
  redCardsGiven: number;
  mvpDesignated: number;
  /** Distinct leagues. */
  leagues: number;
}

/**
 * Aggregates events into per-referee stats. Today the mock matches
 * have `refereeId: null`, so the result is empty. When the backend
 * wires `refereeId` to events, this will populate automatically.
 */
export function computeRefereeStats(
  events: MatchEvent[],
  matches: Match[],
  refereeId: string,
): RefereeStats {
  void events;
  const myMatches = matches.filter((m) => m.refereeId === refereeId);
  const leagues = new Set(myMatches.map((m) => m.leagueId));
  let yellow = 0;
  let red = 0;
  let mvp = 0;
  for (const e of events) {
    if (e.matchId && myMatches.some((m) => m.id === e.matchId)) {
      if (e.type === 'YELLOW_CARD') yellow += 1;
      else if (e.type === 'RED_CARD') red += 1;
      else if (e.type === 'MVP') mvp += 1;
    }
  }
  return {
    refereeId,
    matchesOfficiated: myMatches.length,
    yellowCardsGiven: yellow,
    redCardsGiven: red,
    mvpDesignated: mvp,
    leagues: leagues.size,
  };
}

// ----- League "highlights" (Top Scorer / GK / Best Attack / Best Defense) ----

export interface GoalkeeperRanking {
  playerId: string;
  teamId: string;
  cleanSheets: number;
  matchesPlayed: number;
}

export interface TeamHighlight {
  teamId: string;
  value: number;
  /** Goals scored (for best attack) or conceded (for best defense). */
}

/**
 * Best goalkeeper of a league: the player with `position: 'GK'` on
 * any team in the league who has the most clean sheets. A clean
 * sheet is credited to a GK when their team didn't concede in a
 * COMPLETED match. If a match ends 0-0, both GKs get a clean sheet.
 *
 * The roster lookup is done against the global MOCK_MEMBERSHIPS so
 * the function stays a pure derivation.
 */
export function computeBestGoalkeepers(
  matches: Match[],
  memberships: Array<{ teamId: string; userId: string; position: string | null; membershipRole: string }>,
  limit = 10,
): GoalkeeperRanking[] {
  const completed = matches.filter((m) => m.status === 'COMPLETED');
  // Map teamId → GK userId (there can be more than one, but we pick the first).
  const gkByTeam = new Map<string, string>();
  for (const m of memberships) {
    if (m.membershipRole === 'PLAYER' && m.position === 'GK') {
      if (!gkByTeam.has(m.teamId)) gkByTeam.set(m.teamId, m.userId);
    }
  }

  const cleanSheets = new Map<string, number>(); // userId → count
  const matchesPlayed = new Map<string, number>(); // userId → count
  for (const m of completed) {
    // The GK of each side "played" this match.
    const homeGk = gkByTeam.get(m.homeTeamId);
    const awayGk = gkByTeam.get(m.awayTeamId);
    if (homeGk) {
      matchesPlayed.set(homeGk, (matchesPlayed.get(homeGk) ?? 0) + 1);
      if ((m.awayScore ?? 0) === 0) {
        cleanSheets.set(homeGk, (cleanSheets.get(homeGk) ?? 0) + 1);
      }
    }
    if (awayGk) {
      matchesPlayed.set(awayGk, (matchesPlayed.get(awayGk) ?? 0) + 1);
      if ((m.homeScore ?? 0) === 0) {
        cleanSheets.set(awayGk, (cleanSheets.get(awayGk) ?? 0) + 1);
      }
    }
  }

  const rows: GoalkeeperRanking[] = [];
  for (const [playerId, cs] of cleanSheets) {
    rows.push({
      playerId,
      teamId: '',
      cleanSheets: cs,
      matchesPlayed: matchesPlayed.get(playerId) ?? 0,
    });
  }
  // Backfill teamId (the GK's first team — there's only one in practice).
  for (const row of rows) {
    const found = memberships.find((m) => m.userId === row.playerId);
    if (found) row.teamId = found.teamId;
  }
  rows.sort((a, b) => b.cleanSheets - a.cleanSheets || b.matchesPlayed - a.matchesPlayed);
  return rows.slice(0, limit);
}

/** Best attacking team: most goals scored. */
export function computeBestAttackingTeam(
  matches: Match[],
  leagueTeams: Array<{ teamId: string }>,
): TeamHighlight | null {
  const completed = matches.filter((m) => m.status === 'COMPLETED');
  const validTeamIds = new Set(leagueTeams.map((lt) => lt.teamId));
  const goals = new Map<string, number>();
  for (const m of completed) {
    if (validTeamIds.has(m.homeTeamId)) {
      goals.set(m.homeTeamId, (goals.get(m.homeTeamId) ?? 0) + (m.homeScore ?? 0));
    }
    if (validTeamIds.has(m.awayTeamId)) {
      goals.set(m.awayTeamId, (goals.get(m.awayTeamId) ?? 0) + (m.awayScore ?? 0));
    }
  }
  let bestTeam: string | null = null;
  let bestValue = -1;
  for (const [teamId, value] of goals) {
    if (value > bestValue) {
      bestValue = value;
      bestTeam = teamId;
    }
  }
  if (!bestTeam) return null;
  return { teamId: bestTeam, value: bestValue };
}

/** Best defensive team: fewest goals conceded (only teams that have played). */
export function computeBestDefensiveTeam(
  matches: Match[],
  leagueTeams: Array<{ teamId: string }>,
): TeamHighlight | null {
  const completed = matches.filter((m) => m.status === 'COMPLETED');
  const validTeamIds = new Set(leagueTeams.map((lt) => lt.teamId));
  const conceded = new Map<string, number>();
  const played = new Set<string>();
  for (const m of completed) {
    if (validTeamIds.has(m.homeTeamId)) {
      conceded.set(m.homeTeamId, (conceded.get(m.homeTeamId) ?? 0) + (m.awayScore ?? 0));
      played.add(m.homeTeamId);
    }
    if (validTeamIds.has(m.awayTeamId)) {
      conceded.set(m.awayTeamId, (conceded.get(m.awayTeamId) ?? 0) + (m.homeScore ?? 0));
      played.add(m.awayTeamId);
    }
  }
  let bestTeam: string | null = null;
  let bestValue = Infinity;
  for (const teamId of played) {
    const value = conceded.get(teamId) ?? 0;
    if (value < bestValue) {
      bestValue = value;
      bestTeam = teamId;
    }
  }
  if (!bestTeam) return null;
  return { teamId: bestTeam, value: bestValue };
}

// ----- Recent match helper --------------------------------------------------

export interface PlayerRecentMatch {
  match: Match;
  result: 'WIN' | 'LOSS' | 'DRAW' | 'N/A';
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  wasMvp: boolean;
}

/** Builds the "recent matches" view-model for a player. */
export function buildPlayerRecentMatches(
  playerId: string,
  events: MatchEvent[],
  matches: Match[],
  limit = 5,
): PlayerRecentMatch[] {
  const myEvents = events.filter((e) => e.playerId === playerId);
  const matchIds = Array.from(new Set(myEvents.map((e) => e.matchId)));
  const myMatches = matches
    .filter((m) => matchIds.includes(m.id))
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
    .slice(0, limit);

  return myMatches.map((m) => {
    const evs = myEvents.filter((e) => e.matchId === m.id);
    const goals = evs.filter((e) => e.type === 'GOAL').length;
    const assists = evs.filter((e) => e.type === 'ASSIST').length;
    const yellow = evs.filter((e) => e.type === 'YELLOW_CARD').length;
    const red = evs.filter((e) => e.type === 'RED_CARD').length;
    const wasMvp = evs.some((e) => e.type === 'MVP');

    let result: 'WIN' | 'LOSS' | 'DRAW' | 'N/A' = 'N/A';
    if (m.status === 'COMPLETED' && m.homeScore != null && m.awayScore != null) {
      const onHome = m.homeTeamId && myEvents.some((e) => e.teamId === m.homeTeamId);
      const onAway = m.awayTeamId && myEvents.some((e) => e.teamId === m.awayTeamId);
      const myTeamGoals = onHome ? m.homeScore : onAway ? m.awayScore : null;
      const oppGoals = onHome ? m.awayScore : onAway ? m.homeScore : null;
      if (myTeamGoals != null && oppGoals != null) {
        if (myTeamGoals > oppGoals) result = 'WIN';
        else if (myTeamGoals < oppGoals) result = 'LOSS';
        else result = 'DRAW';
      }
    }
    return { match: m, result, goals, assists, yellowCards: yellow, redCards: red, wasMvp };
  });
}
