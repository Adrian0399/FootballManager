// Teams data hooks.
//
// All hooks return `{ data, isLoading, error }`. v1.0.0 mode reads from
// the in-memory mocks in `../mocks/teams`. The contract is identical to a
// real API call — swap the body of each loader for
// `apiClient.get(...).then(r => r.data.data)` and the UI is unaffected.
//
// v1.1 status:
//   - useLeagues  → reads from backend (GET /leagues)
//   - useLeague   → reads from backend (GET /leagues/:id)
//   - useTeams / useTeam / useTeamMembers / useLeagueTeams
//                 → read from backend (GET /teams, GET /teams/:id, etc.)
//   - useUser     → still on mocks (until we create GET /users/:id with the
//                   public profile). In practice the dashboard passes the
//                   current user from the auth store, so this is rarely hit.

import { useMemo } from 'react';
import { asyncResolve, useAsync, type AsyncState } from './useAsync';
import { apiClient } from '../api/axios';
import { leaguesApi } from '../api/leagues';
import { profileApi } from '../api/profile';
import type { SuccessEnvelope } from '../types/user';
import type { Team, TeamMembership, TeamMemberPublic } from '../types/team';
import type { User } from '../types/user';
import type { League } from '../types/league';
import {
  MOCK_USERS,
  getUserById,
  getMembershipsByUser,
} from '../mocks/teams';

// ----- Filters --------------------------------------------------------------

export interface TeamFilters {
  /** Filter by league id (matches `currentLeagueId`). */
  leagueId?: string;
  /** Filter by league format (e.g. '7V7'). */
  format?: string;
  /** Search by name (case-insensitive, contains). */
  q?: string;
}

function applyTeamFilters(teams: Team[], filters?: TeamFilters): Team[] {
  if (!filters) return teams;
  return teams.filter((t) => {
    if (filters.leagueId && t.currentLeagueId !== filters.leagueId) return false;
    if (filters.format && t.currentLeagueFormat !== filters.format) return false;
    if (filters.q) {
      const needle = filters.q.toLowerCase();
      const hay = `${t.name} ${t.shortName} ${t.emoji}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

// ----- Hooks ----------------------------------------------------------------

/** All teams, with optional filters. Enriches each team with its league's
 *  format so the client-side format filter works (the backend does not
 *  return `currentLeagueFormat`). */
export function useTeams(filters?: TeamFilters): AsyncState<Team[]> {
  const key = useMemo(
    () => `teams:${filters?.leagueId ?? ''}:${filters?.format ?? ''}:${filters?.q ?? ''}`,
    [filters?.leagueId, filters?.format, filters?.q],
  );
  const loader = async (_k: string) => {
    const [teams, leagues] = await Promise.all([
      apiClient
        .get<SuccessEnvelope<Team[]>>('/teams', {
          params: { leagueId: filters?.leagueId, q: filters?.q },
        })
        .then((r) => r.data.data),
      leaguesApi.list().catch(() => [] as League[]),
    ]);
    const formatByLeague = new Map(leagues.map((l) => [l.id, l.format ?? null]));
    const enriched = teams.map((t) => ({
      ...t,
      logoUrl: t.logoUrl ?? null,
      currentLeagueFormat: t.currentLeagueId
        ? formatByLeague.get(t.currentLeagueId) ?? null
        : null,
    }));
    return applyTeamFilters(enriched, filters);
  };
  return useAsync<Team[]>(loader, key);
}

/** A single team by id (with its members). */
export function useTeam(teamId: string | null | undefined): AsyncState<Team | null> {
  const key = teamId ?? '__none__';
  const loader = (_k: string) =>
    teamId
      ? apiClient
          .get<SuccessEnvelope<Team & { members: TeamMemberPublic[] }>>(`/teams/${teamId}`)
          .then((r) => r.data.data)
      : asyncResolve(null);
  return useAsync<Team | null>(loader, key);
}

/** All members of a team (DT, assistants, players). */
export function useTeamMembers(teamId: string | null | undefined): AsyncState<TeamMemberPublic[]> {
  const key = teamId ?? '__none__';
  const loader = (_k: string) =>
    teamId
      ? apiClient
          .get<SuccessEnvelope<(Team & { members: TeamMemberPublic[] })>>(`/teams/${teamId}`)
          .then((r) => r.data.data.members)
      : asyncResolve<TeamMemberPublic[]>([]);
  return useAsync<TeamMemberPublic[]>(loader, key);
}

/** All teams a user belongs to (across leagues). Reads from the backend
 *  `GET /users/:id/teams` (UserTeamDto) and maps it to the local
 *  `Team & { membership }` shape the dashboards expect. */
export function useUserTeams(userId: string | null | undefined): AsyncState<Array<Team & { membership: TeamMembership }>> {
  const key = userId ?? '__none__';
  const loader = (id: string) => {
    if (!id) return Promise.resolve<Array<Team & { membership: TeamMembership }>>([]);
    return profileApi.getTeams(id).then((rows) =>
      rows.map((row) => {
        const team: Team = {
          id: row.teamId,
          name: row.teamName,
          shortName: row.teamShortName,
          logoUrl: null,
          emoji: row.teamEmoji ?? '⚽',
          primaryColor: row.primaryColor,
          secondaryColor: row.secondaryColor,
          homeFieldId: null,
          currentLeagueId: row.leagueId,
          currentLeagueFormat: null,
          isActive: true,
          createdAt: '',
          updatedAt: '',
        };
        const membership: TeamMembership = {
          id: `${row.teamId}-${row.membershipRole}`,
          teamId: row.teamId,
          userId: id,
          membershipRole: row.membershipRole,
          jerseyNumber: row.jerseyNumber,
          position: row.position as TeamMembership['position'],
          isCaptain: row.isCaptain,
          joinedAt: '',
        };
        return { ...team, membership };
      }),
    );
  };
  return useAsync<Array<Team & { membership: TeamMembership }>>(loader, key);
}

/** A single user by id. */
export function useUser(userId: string | null | undefined): AsyncState<User | null> {
  const key = userId ?? '__none__';
  const loader = (_k: string) => asyncResolve(userId ? getUserById(userId) : null);
  return useAsync<User | null>(loader, key);
}

/** A single league by id (from the backend). Uses `leaguesApi` so enum
 *  fields are normalized (`SEVEN_V_SEVEN` → `'7V7'`, `matchdaysCount` →
 *  `matchdays`). */
export function useLeague(leagueId: string | null | undefined): AsyncState<League | null> {
  const key = leagueId ?? '__none__';
  const loader = (_k: string) =>
    leagueId ? leaguesApi.getById(leagueId) : asyncResolve<League | null>(null);
  return useAsync<League | null>(loader, key);
}

/** All leagues from the backend (normalized via `leaguesApi`). */
export function useLeagues(): AsyncState<League[]> {
  return useAsync<League[]>((_k: string) => leaguesApi.list(), 'leagues');
}

// ----- Plain getters (non-hook) --------------------------------------------
//
// Useful when you already have the data in scope and don't want a hook
// re-render cycle. These are direct lookups against the mock dataset.

export function getMembershipsByUserSync(userId: string): TeamMembership[] {
  return getMembershipsByUser(userId);
}

export { MOCK_USERS };
