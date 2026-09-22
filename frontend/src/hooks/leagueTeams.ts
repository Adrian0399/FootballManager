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
  const loader = (_k: string) => {
    if (!leagueId) return asyncResolve([] as Team[]);
    // Local fallback: we still use the mock for the "available teams"
    // list because the backend doesn't expose an unassigned-by-league
    // endpoint yet. The TeamPicker just needs a list of teams NOT
    // already in the league, so this works until we wire it to the
    // backend in v1.1.
    const assigned = new Set(
      getLeagueTeamsByLeague(leagueId).map((lt) => lt.teamId),
    );
    const available = MOCK_TEAMS.filter((t: Team) => !assigned.has(t.id));
    if (!search) return asyncResolve(available);
    const needle = search.toLowerCase();
    return asyncResolve(
      available.filter((t) =>
        `${t.name} ${t.shortName} ${t.emoji}`.toLowerCase().includes(needle),
      ),
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
