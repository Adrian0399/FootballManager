// Standings hooks (Paso 7).
//
// v1.1: standings are now computed server-side. The hook just fetches
// `/leagues/:id/standings` and exposes the result. The local
// `computeStandings` is still re-exported for non-hook callers (and
// for the "through N" filter, which the server doesn't yet support).

import { useMemo, useState } from 'react';
import { useAsync, asyncResolve } from './useAsync';
import { apiClient } from '../api/axios';
import type { SuccessEnvelope } from '../types/user';
import { MOCK_MATCHDAYS } from '../mocks/matches';
import { computeStandings, type StandingRow, type StandingsResult } from '../utils/standings';

interface UseStandingsOptions {
  /** "Through matchday N" filter. null/undefined = all matchdays. */
  throughMatchday?: number | null;
}

interface UseStandingsResult {
  overall: StandingRow[];
  groups: Record<string, StandingRow[]>;
  throughMatchday: number | null;
  setThroughMatchday: (n: number | null) => void;
  totalMatchdays: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Computes the live standings for a league from the mock match +
 * event datasets. In v1.0.0 mock mode this is a pure derivation; in
 * v1.1 the body will be a `apiClient.get<Standings>(`/leagues/${id}/standings`)` call.
 */
export function useStandings(
  leagueId: string | null | undefined,
  opts: UseStandingsOptions = {},
): UseStandingsResult {
  const { throughMatchday = null } = opts;
  const [matchdayFilter, setMatchdayFilter] = useState<number | null>(throughMatchday);

  // Load the standings from the backend. The "through N" filter is
  // applied client-side for now; the backend returns the full table.
  const standingsAsync = useAsync<StandingsResult>(
    (_k: string) =>
      leagueId
        ? apiClient
            .get<SuccessEnvelope<StandingsResult>>(`/leagues/${leagueId}/standings`)
            .then((r) => r.data.data)
        : asyncResolve<StandingsResult>({ overall: [], groups: {} }),
    leagueId ?? '__none__',
  );

  // Apply the "through N" filter client-side (only overall for now).
  const data = useMemo<StandingsResult | null>(() => {
    const base = standingsAsync.data;
    if (!base) return null;
    if (matchdayFilter == null) return base;
    // We don't have a per-matchday standings endpoint, so we just
    // return the full table when a filter is set. The frontend shows
    // a notice to the user.
    return base;
  }, [standingsAsync.data, matchdayFilter]);

  const totalMatchdays = useMemo(() => {
    if (!leagueId) return 0;
    return MOCK_MATCHDAYS.filter((m) => m.leagueId === leagueId).length;
  }, [leagueId]);

  return {
    overall: data?.overall ?? [],
    groups: data?.groups ?? {},
    throughMatchday: matchdayFilter,
    setThroughMatchday: setMatchdayFilter,
    totalMatchdays,
    isLoading: standingsAsync.isLoading,
    error: standingsAsync.error,
  };
}

// ----- Plain getters (non-hook) --------------------------------------------

export { computeStandings, type StandingRow, type StandingsResult };
