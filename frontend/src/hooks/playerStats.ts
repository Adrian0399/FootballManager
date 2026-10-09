// Player & referee stats hooks (Paso 8).

import { asyncResolve, useAsync, type AsyncState } from './useAsync';
import { apiClient } from '../api/axios';
import { profileApi, type RecentMatchDto, type RefereeMatchDto } from '../api/profile';
import { usersApi } from '../api/users';
import type { SuccessEnvelope } from '../types/user';
import { MOCK_MATCH_EVENTS } from '../mocks/matchEvents';
import { getMatchesByLeague } from '../mocks/matches';
import { getLeagueTeamsByLeague } from '../mocks/leagueTeams';
import { MOCK_TEAMS } from '../mocks/teams';
import {
  buildPlayerRecentMatches,
  computePlayerStatsForLeague,
  computeRefereeStats,
  type PlayerLeagueStats,
  type PlayerRecentMatch,
  type RefereeStats,
} from '../utils/playerStats';
import type { User } from '../types/user';
import type { LeagueStats, LeagueHighlights } from '../types/stats';

export type { LeagueHighlights, LeagueStats };

export type LeaderboardCategory = 'GOALS' | 'ASSISTS' | 'MVPS' | 'FAIR_PLAY';

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  /** The primary stat being ranked. */
  value: number;
  /** Optional secondary stat shown in the row. */
  secondary: number;
  /** Pretty label for the value. */
  label: string;
}

interface LeagueLeaderboardsResult {
  goals: LeaderboardEntry[];
  assists: LeaderboardEntry[];
  mvps: LeaderboardEntry[];
  fairPlay: LeaderboardEntry[];
  totalPlayers: number;
}

// ----- Hooks ----------------------------------------------------------------

/**
 * Compute the top-N leaderboards for a league (Goleadores, Asistidores,
 * MVPs, Fair play). v1.1: reads from the backend (`GET /leagues/:id/stats`).
 */
export function useLeagueLeaderboards(
  leagueId: string | null | undefined,
  limit = 20,
): AsyncState<LeagueLeaderboardsResult> {
  const key = `${leagueId ?? '__none__'}:${limit}`;
  const loader = (_k: string) =>
    leagueId
      ? apiClient
          .get<SuccessEnvelope<LeagueStats>>(`/leagues/${leagueId}/stats`)
          .then((r) => {
            const d = r.data.data;
            // The backend returns entries without `label`. The frontend
            // computes it from the value + secondary.
            // The backend already resolves playerName / teamName (v1.2);
            // keep a readable fallback but never fall back to the raw id.
            const addLabel = (
              e: {
                rank: number;
                playerId: string;
                playerName?: string;
                teamId: string;
                teamName?: string;
                value: number;
                secondary: number;
              },
              suffix: string,
            ): LeaderboardEntry => ({
              rank: e.rank,
              playerId: e.playerId,
              playerName: e.playerName || 'Jugador',
              teamId: e.teamId,
              teamName: e.teamName || '—',
              value: e.value,
              secondary: e.secondary,
              label: `${e.value} ${suffix}`,
            });
            return {
              goals: d.goals.slice(0, limit).map((e) => addLabel(e, 'goles')),
              assists: d.assists.slice(0, limit).map((e) => addLabel(e, 'asist.')),
              mvps: d.mvps.slice(0, limit).map((e) => addLabel(e, 'MVP')),
              fairPlay: d.fairPlay.slice(0, limit).map((e) => addLabel(e, 'pts')),
              totalPlayers:
                d.goals.length + d.assists.length + d.mvps.length + d.fairPlay.length,
            };
          })
      : asyncResolve<LeagueLeaderboardsResult>({
          goals: [], assists: [], mvps: [], fairPlay: [], totalPlayers: 0,
        });
  return useAsync<LeagueLeaderboardsResult>(loader, key);
}

/** Per-player per-league stats, all entries (not just top N). */
export function usePlayerStatsInLeague(
  playerId: string | null | undefined,
  leagueId: string | null | undefined,
): AsyncState<PlayerLeagueStats | null> {
  const key = `${playerId ?? '_'}-${leagueId ?? '_'}`;
  const loader = (_k: string) => {
    if (!playerId || !leagueId) return asyncResolve<PlayerLeagueStats | null>(null);
    const leagueMatches = getMatchesByLeague(leagueId);
    const leagueTeams = getLeagueTeamsByLeague(leagueId);
    const leagueEvents = MOCK_MATCH_EVENTS.filter((e) => {
      return leagueMatches.some((m) => m.id === e.matchId) && e.playerId === playerId;
    });
    const stats = computePlayerStatsForLeague({
      matches: leagueMatches,
      events: leagueEvents,
      leagueTeams,
      leagueId,
    });
    return asyncResolve(stats.find((s) => s.playerId === playerId) ?? null);
  };
  return useAsync<PlayerLeagueStats | null>(loader, key);
}

/**
 * All-league stats for a player: a list of {league, stats} pairs.
 * Used by the PlayerProfilePage.
 */
export function usePlayerStatsAllLeagues(
  playerId: string | null | undefined,
): AsyncState<Array<{ league: { id: string; name: string }; stats: PlayerLeagueStats }>> {
  const key = playerId ?? '__none__';
  const loader = (_k: string) => {
    if (!playerId) {
      return Promise.resolve(
        [] as Array<{ league: { id: string; name: string }; stats: PlayerLeagueStats }>,
      );
    }
    return profileApi.getStatsByLeague(playerId).then((rows) =>
      rows.map((r) => ({
        league: { id: r.leagueId, name: r.leagueName },
        stats: {
          playerId: r.playerId,
          playerName: r.playerName,
          teamId: r.teamId ?? '',
          teamName: r.teamName ?? '',
          leagueId: r.leagueId,
          matchesPlayed: r.matchesPlayed,
          goals: r.goals,
          assists: r.assists,
          yellowCards: r.yellowCards,
          redCards: r.redCards,
          mvpCount: r.mvpCount,
          cleanSheets: r.cleanSheets,
          goalsRank: r.goalsRank,
          fairPlay: r.fairPlay,
        },
      })),
    );
  };
  return useAsync<Array<{ league: { id: string; name: string }; stats: PlayerLeagueStats }>>(
    loader,
    key,
  );
}

/** Recent matches for a player across all leagues. */
export function usePlayerRecentMatches(
  playerId: string | null | undefined,
  limit = 5,
): AsyncState<RecentMatchDto[]> {
  const key = `${playerId ?? '_'}-${limit}`;
  const loader = (_k: string) => {
    if (!playerId) return Promise.resolve([] as RecentMatchDto[]);
    return profileApi.getRecentMatches(playerId, limit);
  };
  return useAsync<RecentMatchDto[]>(loader, key);
}

/** Per-referee aggregated stats. */
export function useRefereeStats(
  refereeId: string | null | undefined,
): AsyncState<RefereeStats | null> {
  const key = refereeId ?? '__none__';
  const loader = (_k: string) => {
    if (!refereeId) return Promise.resolve(null);
    return profileApi.getRefereeStats(refereeId).then((d) => ({
      refereeId,
      matchesOfficiated: d.matchesOfficiated,
      yellowCardsGiven: d.yellowCardsGiven,
      redCardsGiven: d.redCardsGiven,
      mvpDesignated: d.mvpDesignated,
      leagues: d.leagues.length,
    }));
  };
  return useAsync<RefereeStats | null>(loader, key);
}

/** A user by id (re-exported for convenience in player profile). */
export function useUserById(userId: string | null | undefined): AsyncState<User | null> {
  const key = userId ?? '__none__';
  const loader = (_k: string) => {
    if (!userId) return Promise.resolve(null);
    return usersApi.getById(userId);
  };
  return useAsync<User | null>(loader, key);
}

/** Recent matches officiated by a referee. */
export function useRefereeMatches(
  refereeId: string | null | undefined,
  limit = 5,
): AsyncState<RefereeMatchDto[]> {
  const key = `${refereeId ?? '_'}-${limit}`;
  const loader = (_k: string) => {
    if (!refereeId) return Promise.resolve([] as RefereeMatchDto[]);
    return profileApi.getRefereeMatches(refereeId, limit);
  };
  return useAsync<RefereeMatchDto[]>(loader, key);
}

// ----- Helpers --------------------------------------------------------------

function topN(
  rows: PlayerLeagueStats[],
  primary: (s: PlayerLeagueStats) => number,
  secondary: (s: PlayerLeagueStats) => number,
  label: (s: PlayerLeagueStats) => string,
  limit: number,
): LeaderboardEntry[] {
  // Filter out players with 0 in the primary stat.
  const eligible = rows.filter((r) => primary(r) > 0);
  eligible.sort((a, b) => {
    const pa = primary(a);
    const pb = primary(b);
    if (pa !== pb) return pb - pa;
    return secondary(b) - secondary(a);
  });
  return rank(eligible.slice(0, limit), primary, label);
}

function topNAsc(
  rows: PlayerLeagueStats[],
  primary: (s: PlayerLeagueStats) => number,
  secondary: (s: PlayerLeagueStats) => number,
  label: (s: PlayerLeagueStats) => string,
  limit: number,
): LeaderboardEntry[] {
  // Filter out players with 0 cards (no signal).
  const eligible = rows.filter((r) => primary(r) !== 0);
  eligible.sort((a, b) => {
    const pa = primary(a);
    const pb = primary(b);
    if (pa !== pb) return pa - pb; // ascending — fewer cards better
    return secondary(a) - secondary(b);
  });
  return rank(eligible.slice(0, limit), primary, label);
}

function rank(
  rows: PlayerLeagueStats[],
  primary: (s: PlayerLeagueStats) => number,
  label: (s: PlayerLeagueStats) => string,
): LeaderboardEntry[] {
  const out: LeaderboardEntry[] = [];
  let lastP: number | null = null;
  let lastS: number | null = null;
  let rank = 0;
  let seen = 0;
  for (const r of rows) {
    seen += 1;
    const p = primary(r);
    // For FAIR_PLAY the "secondary" passed in is yellow+red; for others it's another stat.
    // We use the value field for the "primary", so the rank here uses the
    // *sorted* order (already correct).
    const isTie = lastP === p; // Simple tie-by-primary. Good enough for v1.
    if (!isTie) rank = seen;
    out.push({
      rank,
      playerId: r.playerId,
      playerName: r.playerName ?? r.playerId,
      teamId: r.teamId,
      teamName: r.teamName ?? r.teamId,
      value: p,
      secondary: 0,
      label: label(r),
    });
    lastP = p;
    lastS = p;
  }
  return out;
}

// ----- League highlights (top scorer / top assister / best GK / best attack / best defense)
//
// v1.1: highlights come from the backend (`GET /leagues/:id/stats`,
// field `highlights`). The backend computes everything from the DB.

export function useLeagueHighlights(
  leagueId: string | null | undefined,
): AsyncState<LeagueHighlights> {
  const key = leagueId ?? '__none__';
  const loader = (_k: string) =>
    leagueId
      ? apiClient
          .get<SuccessEnvelope<LeagueStats>>(`/leagues/${leagueId}/stats`)
          .then((r) => r.data.data.highlights)
      : asyncResolve<LeagueHighlights>(emptyHighlights());
  return useAsync<LeagueHighlights>(loader, key);
}

function emptyHighlights(): LeagueHighlights {
  return {
    topScorer: null,
    topAssister: null,
    bestGoalkeeper: null,
    bestAttackingTeam: null,
    bestDefensiveTeam: null,
  };
}

export { MOCK_TEAMS };
