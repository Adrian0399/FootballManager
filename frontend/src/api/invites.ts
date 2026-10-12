import { apiClient } from './axios';
import type { SuccessEnvelope } from '../types/user';

export interface TeamInvitePublic {
  id: string;
  role: 'PLAYER' | 'DT' | 'ASSISTANT';
  token: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface InviteResolved {
  token: string;
  role: 'PLAYER' | 'DT' | 'ASSISTANT';
  team: { id: string; name: string; shortName: string };
  expiresAt: string;
}

export const invitesApi = {
  async create(teamId: string, role: 'PLAYER' | 'DT' | 'ASSISTANT') {
    const { data } = await apiClient.post<SuccessEnvelope<{ token: string; role: string }>>(
      `/teams/${teamId}/invites`,
      { role },
    );
    return data.data;
  },

  async listByTeam(teamId: string): Promise<TeamInvitePublic[]> {
    const { data } = await apiClient.get<SuccessEnvelope<TeamInvitePublic[]>>(
      `/teams/${teamId}/invites`,
    );
    return data.data;
  },

  /** Public: no auth — used by the register page. */
  async resolve(token: string): Promise<InviteResolved> {
    const { data } = await apiClient.get<SuccessEnvelope<InviteResolved>>(`/invites/${token}`);
    return data.data;
  },
};

/** Builds the absolute registration link for an invite token. */
export function inviteLink(token: string): string {
  const base = window.location.origin;
  return `${base}/register?invite=${token}`;
}