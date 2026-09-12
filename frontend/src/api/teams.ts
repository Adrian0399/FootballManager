import { apiClient } from './axios';
import type { SuccessEnvelope, ErrorEnvelope } from '../types/user';
import type {
  Team,
  TeamCreateInput,
  TeamUpdateInput,
  TeamMemberPublic,
  MembershipCreateInput,
  MembershipUpdateInput,
} from '../types/team';

/**
 * API client for `/api/v1/teams`. See `docs/api.md` §5 and
 * `backend/src/modules/teams/teams.routes.ts` for the full contract.
 *
 * Authorization is enforced server-side:
 *   - GET (list / getById / members): any authenticated user.
 *   - POST / PATCH / DELETE (team + roster): ADMIN only
 *     (returns 403 AUTH_FORBIDDEN otherwise).
 */
export const teamsApi = {
  async list(leagueId?: string): Promise<Team[]> {
    const { data } = await apiClient.get<SuccessEnvelope<Team[]>>('/teams', {
      params: leagueId ? { leagueId } : undefined,
    });
    return data.data;
  },

  async getById(id: string): Promise<Team & { members: TeamMemberPublic[] }> {
    const { data } = await apiClient.get<
      SuccessEnvelope<Team & { members: TeamMemberPublic[] }>
    >(`/teams/${id}`);
    return data.data;
  },

  async create(input: TeamCreateInput): Promise<Team> {
    const { data } = await apiClient.post<SuccessEnvelope<Team>>('/teams', input);
    return data.data;
  },

  async update(id: string, input: TeamUpdateInput): Promise<Team> {
    const { data } = await apiClient.patch<SuccessEnvelope<Team>>(
      `/teams/${id}`,
      input,
    );
    return data.data;
  },

  async remove(id: string): Promise<{ deleted: boolean }> {
    const { data } = await apiClient.delete<
      SuccessEnvelope<{ deleted: boolean }>
    >(`/teams/${id}`);
    return data.data;
  },

  // ----- Roster ------------------------------------------------------------

  async addMember(
    teamId: string,
    input: MembershipCreateInput,
  ): Promise<TeamMemberPublic> {
    const { data } = await apiClient.post<SuccessEnvelope<TeamMemberPublic>>(
      `/teams/${teamId}/members`,
      input,
    );
    return data.data;
  },

  async updateMember(
    teamId: string,
    userId: string,
    input: MembershipUpdateInput,
  ): Promise<TeamMemberPublic> {
    const { data } = await apiClient.patch<SuccessEnvelope<TeamMemberPublic>>(
      `/teams/${teamId}/members/${userId}`,
      input,
    );
    return data.data;
  },

  async removeMember(
    teamId: string,
    userId: string,
  ): Promise<{ deleted: boolean }> {
    const { data } = await apiClient.delete<
      SuccessEnvelope<{ deleted: boolean }>
    >(`/teams/${teamId}/members/${userId}`);
    return data.data;
  },
};

/** Shape of an error response — useful for typed catch blocks. */
export type TeamApiError = ErrorEnvelope;
