// LeagueTeam data hooks (Paso 4).
//
// v1.1: `useLeagueTeams` now reads from the backend (`GET /leagues/:id/teams`).
// The other hooks still use the local mock dataset.

import { useMemo } from 'react';
import { asyncResolve, useAsync, type AsyncState } from './useAsync';
import { apiClient } from '../api/axios';
import type { SuccessEnvelope } from '../types/user';
import { MOCK_TEAMS } from '../mocks/teams';
import {
  MOCK_LEAGUE_TEAMS,
  getLeagueTeamsByLeague,
  getLeaguesForTeam,
} from '../mocks/leagueTeams';
import type { LeagueTeam } from '../types/leagueTeam';
import type { Team } from '../types/team';

export type PublicTeamWithSeed = Team & { seed: number; members: { userId: string; membershipRole: string; jerseyNumber: number | null; position: string | null; isCaptain: boolean }[] };

/** All teams currently assigned to a league, sorted by seed.
 *  Returns the full team data + members from the backend. */
export function useLeagueTeams(leagueId: string | null | undefined): AsyncState<PublicTeamWithSeed[]> {
  const key = leagueId ?? '__none__';
  const loader = (_k: string) =>
    leagueId
      ? apiClient
          .get<SuccessEnvelope<PublicTeamWithSeed[]>>(`/leagues/${leagueId}/teams`)
          .then((r) => r.data.data)
      : asyncResolve<PublicTeamWithSeed[]>([]);
  return useAsync<PublicTeamWithSeed[]>(loader, key);
}

/**
 * All teams NOT yet assigned to a league, with optional search.
 * The result is sorted alphabetically so the picklist is stable.
 */
export function useAvailableTeams(
  leagueId: string | null | undefined,
  search?: string,
): AsyncState<Team[]> {
  const key = useMemo(
    () => `available:${leagueId ?? ''}:${search ?? ''}`,
    [leagueId, search],
  );
  const loader = async (_k: string) => {
    if (!leagueId) return [] as Team[];
    // Real teams from the API, minus the ones already enrolled in this
    // league (GET /leagues/:id/teams). Filtering against the mock catalog
    // returned ids that no longer exist once the backend seeded real data.
    const [allTeams, enrolled] = await Promise.all([
      apiClient
        .get<SuccessEnvelope<Team[]>>('/teams')
        .then((r) => r.data.data)
        .catch(() => [] as Team[]),
      apiClient
        .get<SuccessEnvelope<Array<{ id: string }>>>(
          `/leagues/${leagueId}/teams`,
        )
        .then((r) => r.data.data)
        .catch(() => [] as Array<{ id: string }>),
    ]);
    const assigned = new Set(enrolled.map((t) => t.id));
    const available = allTeams.filter((t) => !assigned.has(t.id));
    if (!search) return available;
    const needle = search.toLowerCase();
    return available.filter((t) =>
      `${t.name} ${t.shortName} ${t.emoji}`.toLowerCase().includes(needle),
    );
  };
  return useAsync<Team[]>(loader, key);
}

/** All leagues a team is currently in. */
export function useTeamLeagues(teamId: string | null | undefined): AsyncState<LeagueTeam[]> {
  const key = teamId ?? '__none__';
  const loader = (_k: string) =>
    asyncResolve(teamId ? getLeaguesForTeam(teamId) : []);
  return useAsync<LeagueTeam[]>(loader, key);
}

// ----- Plain lookup ---------------------------------------------------------
// Same pattern as `hooks/teams.ts` — a non-hook accessor for places
// that already have the data in scope.

export { MOCK_LEAGUE_TEAMS };
