// Matches / fixture data hooks (Paso 5).
//
// Today these read from `mocks/matches.ts`. When the real backend
// lands, swap the loader bodies for `apiClient.get(...)` calls — the
// component contract is stable.

import { useMemo, useState } from 'react';
import { asyncResolve, useAsync, type AsyncState } from './useAsync';
import { apiClient } from '../api/axios';
import { leaguesApi } from '../api/leagues';
import { matchesApi } from '../api/matches';
import type { SuccessEnvelope } from '../types/user';
import {
  MOCK_MATCHDAYS,
  MOCK_MATCHES,
  getMatchdaysByLeague,
  getMatchesByMatchday,
  getMatchesByLeague,
  getMatchById,
  getMatchdayById,
} from '../mocks/matches';
import { MOCK_TEAMS } from '../mocks/teams';
import type { Match, Matchday } from '../types/match';

// ----- Hooks ----------------------------------------------------------------

/** All matchdays for a league, ordered by number. */
export function useMatchdays(leagueId: string | null | undefined): AsyncState<Matchday[]> {
  const key = leagueId ?? '__none__';
  const loader = (_k: string) =>
    leagueId
      ? apiClient
          .get<SuccessEnvelope<Matchday[]>>(`/leagues/${leagueId}/matchdays`)
          .then((r) => r.data.data)
      : asyncResolve<Matchday[]>([]);
  return useAsync<Matchday[]>(loader, key);
}

/** All matches for a league, ordered by scheduled time. */
export function useMatches(leagueId: string | null | undefined): AsyncState<Match[]> {
  const key = leagueId ?? '__none__';
  const loader = (_k: string) =>
    leagueId
      ? apiClient
          .get<SuccessEnvelope<Match[]>>('/matches', { params: { leagueId } })
          .then((r) => r.data.data)
      : asyncResolve<Match[]>([]);
  return useAsync<Match[]>(loader, key);
}

/** All matches in one matchday, ordered by time. */
export function useMatchesByMatchday(matchdayId: string | null | undefined): AsyncState<Match[]> {
  const key = matchdayId ?? '__none__';
  const loader = (_k: string) =>
    matchdayId
      ? apiClient
          .get<SuccessEnvelope<Match[]>>('/matches', { params: { matchdayId } })
          .then((r) => r.data.data)
      : asyncResolve<Match[]>([]);
  return useAsync<Match[]>(loader, key);
}

export function useMatch(matchId: string | null | undefined): AsyncState<Match | null> {
  const key = matchId ?? '__none__';
  const loader = (_k: string) =>
    matchId
      ? apiClient
          .get<SuccessEnvelope<Match>>(`/matches/${matchId}`)
          .then((r) => r.data.data)
      : asyncResolve<Match | null>(null);
  return useAsync<Match | null>(loader, key);
}

export function useMatchday(matchdayId: string | null | undefined): AsyncState<Matchday | null> {
  const key = matchdayId ?? '__none__';
  const loader = (_k: string) =>
    matchdayId
      ? apiClient
          .get<SuccessEnvelope<Matchday>>(`/matchdays/${matchdayId}`)
          .then((r) => r.data.data)
      : asyncResolve<Matchday | null>(null);
  return useAsync<Matchday | null>(loader, key);
}

// ----- Fixture state (real backend) ----------------------------------------
//
// Reads matchdays + matches from the API and exposes async mutations for
// the admin toolbar: generate (L-3), reset (refetch) and reassign a match
// to another matchday (PATCH /matches/:id).

export interface RegenerateOptions {
  /** Randomize the team order before generating. */
  shuffle?: boolean;
  /** Allow regeneration even if the league already has played matches. */
  force?: boolean;
  /** Optional ISO start date override. */
  startDate?: string;
}

export interface GeneratedFixture {
  matchdays: Matchday[];
  matches: Match[];
}

export function useFixtureState(leagueId: string | null | undefined) {
  const matchdaysState = useMatchdays(leagueId);
  const matchesState = useMatches(leagueId);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const matchdays = matchdaysState.data ?? [];
  const matches = matchesState.data ?? [];

  // Group matches by matchdayId for the UI.
  const matchesByMatchday = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      const list = map.get(m.matchdayId) ?? [];
      list.push(m);
      map.set(m.matchdayId, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    }
    return map;
  }, [matches]);

  const refresh = () => {
    matchdaysState.refetch();
    matchesState.refetch();
  };

  const describeError = (err: unknown): string => {
    const e = err as { response?: { data?: { error?: { message?: string } } } };
    return e.response?.data?.error?.message ?? 'No se pudo completar la operación.';
  };

  /** L-3 — Regenerate the fixture on the server. */
  async function regenerate(opts: RegenerateOptions = {}): Promise<void> {
    if (!leagueId) return;
    setIsSaving(true);
    setActionError(null);
    try {
      await leaguesApi.generateFixture(leagueId, {
        shuffle: opts.shuffle,
        force: opts.force ?? true,
        startDate: opts.startDate,
      });
      refresh();
    } catch (err) {
      setActionError(describeError(err));
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  /** Refetch the server fixture (there is no local override anymore). */
  function resetToServer(): void {
    setActionError(null);
    refresh();
  }

  /** Move a match to another matchday (PATCH /matches/:id). */
  async function reassignMatch(matchId: string, newMatchdayId: string): Promise<void> {
    setIsSaving(true);
    setActionError(null);
    try {
      await matchesApi.update(matchId, { matchdayId: newMatchdayId });
      refresh();
    } catch (err) {
      setActionError(describeError(err));
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    matchdays,
    matches,
    matchesByMatchday,
    isLoading: matchdaysState.isLoading || matchesState.isLoading,
    error: matchdaysState.error ?? matchesState.error,
    actionError,
    isSaving,
    regenerate,
    resetToServer,
    reassignMatch,
  };
}

// Re-export the public surface for convenience.
export {
  MOCK_MATCHDAYS,
  MOCK_MATCHES,
  getMatchdaysByLeague,
  getMatchesByMatchday,
  getMatchesByLeague,
};

// Convenience getter that the league fixture page uses to compose
// `matchday` + `matches` view-models with team/league data attached.
export interface MatchRow {
  match: Match;
  homeTeam: ReturnType<typeof getTeamOrPlaceholder>;
  awayTeam: ReturnType<typeof getTeamOrPlaceholder>;
}

function getTeamOrPlaceholder(teamId: string) {
  return MOCK_TEAMS.find((t) => t.id === teamId) ?? null;
}

export function buildMatchRows(matches: Match[]): MatchRow[] {
  return matches.map((m) => ({
    match: m,
    homeTeam: getTeamOrPlaceholder(m.homeTeamId),
    awayTeam: getTeamOrPlaceholder(m.awayTeamId),
  }));
}
