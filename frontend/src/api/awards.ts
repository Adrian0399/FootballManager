import { apiClient } from './axios';
import type { SuccessEnvelope, ErrorEnvelope } from '../types/user';

/* ------------------------------------------------------------------ *
 * Awards API (Fase C). Mirrors `backend/src/modules/awards`.
 *   - read:  any authenticated user.
 *   - write: ADMIN only.
 * ------------------------------------------------------------------ */

export interface PublicAward {
  id: string;
  userId: string;
  userName: string;
  leagueId: string | null;
  leagueName: string | null;
  teamId: string | null;
  teamName: string | null;
  category: string;
  level: string;
  title: string;
  description: string | null;
  awardedAt: string;
}

export interface AwardCreateInput {
  userId: string;
  leagueId?: string | null;
  teamId?: string | null;
  category: string;
  level: string;
  title: string;
  description?: string | null;
  awardedAt: string;
}

export interface AwardListParams {
  userId?: string;
  leagueId?: string;
  category?: string;
}

export const awardsApi = {
  async list(params: AwardListParams = {}): Promise<PublicAward[]> {
    const { data } = await apiClient.get<SuccessEnvelope<PublicAward[]>>('/awards', {
      params,
    });
    return data.data;
  },

  async create(input: AwardCreateInput): Promise<PublicAward> {
    const { data } = await apiClient.post<SuccessEnvelope<PublicAward>>(
      '/awards',
      input,
    );
    return data.data;
  },

  async update(id: string, input: Partial<AwardCreateInput>): Promise<PublicAward> {
    const { data } = await apiClient.patch<SuccessEnvelope<PublicAward>>(
      `/awards/${id}`,
      input,
    );
    return data.data;
  },

  async remove(id: string): Promise<{ deleted: boolean }> {
    const { data } = await apiClient.delete<SuccessEnvelope<{ deleted: boolean }>>(
      `/awards/${id}`,
    );
    return data.data;
  },

  /** A-5 — Auto-generate the league's awards (champion, scorers, MVP, fair play). */
  async seedForLeague(
    leagueId: string,
    input: { force?: boolean; awardedAt?: string } = {},
  ): Promise<{ created: number }> {
    const { data } = await apiClient.post<SuccessEnvelope<{ created: number }>>(
      `/leagues/${leagueId}/awards/seed`,
      input,
    );
    return data.data;
  },
};

export type AwardApiError = ErrorEnvelope;
