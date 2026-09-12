import { apiClient } from './axios';
import type { SuccessEnvelope, ErrorEnvelope } from '../types/user';
import type {
  League,
  LeagueCreateInput,
  LeagueUpdateInput,
  LeagueFormat,
} from '../types/league';
import type {
  LeagueTeam,
  LeagueTeamAssignInput,
  LeagueTeamUpdateInput,
} from '../types/leagueTeam';

/* ------------------------------------------------------------------ *
 * Format translation: frontend display  <->  backend Prisma enum.
 * ------------------------------------------------------------------ */

const DISPLAY_TO_API_FORMAT: Record<LeagueFormat, string> = {
  '1V1': 'ONE_V_ONE',
  '3V3': 'THREE_V_THREE',
  '5V5': 'FIVE_V_FIVE',
  '6V6': 'SIX_V_SIX',
  '7V7': 'SEVEN_V_SEVEN',
  '9V9': 'NINE_V_NINE',
  '11V11': 'ELEVEN_V_ELEVEN',
};

const API_TO_DISPLAY_FORMAT: Record<string, LeagueFormat> = Object.fromEntries(
  (Object.entries(DISPLAY_TO_API_FORMAT) as [LeagueFormat, string][]).map(
    ([display, api]) => [api, display],
  ),
);

/** Raw league shape returned by the backend (subset we touch). */
interface RawLeague {
  format?: string | null;
  matchdaysCount?: number | null;
  [key: string]: unknown;
}

function toDisplayFormat(value: unknown): LeagueFormat | undefined {
  if (typeof value !== 'string') return undefined;
  return API_TO_DISPLAY_FORMAT[value];
}

function toApiFormat(value: LeagueFormat | null | undefined): string | null {
  if (value == null) return null;
  return DISPLAY_TO_API_FORMAT[value] ?? null;
}

/**
 * Normalize a raw API league into the frontend `League` shape:
 *   - `format`     SEVEN_V_SEVEN -> '7V7'
 *   - matchdaysCount -> `matchdays`
 */
function normalizeLeague(raw: RawLeague): League {
  const { matchdaysCount, format, ...rest } = raw;
  return {
    ...(rest as unknown as League),
    format: toDisplayFormat(format),
    matchdays: matchdaysCount ?? undefined,
  };
}

/**
 * Serialize a frontend create/update payload for the backend:
 *   - `format`     '7V7' -> SEVEN_V_SEVEN
 *   - `matchdays`  -> matchdaysCount
 */
function serializeLeagueInput(
  input: LeagueCreateInput | LeagueUpdateInput,
): Record<string, unknown> {
  const { format, matchdays, ...rest } = input as LeagueCreateInput;
  const out: Record<string, unknown> = { ...rest };
  if ('format' in input) out.format = toApiFormat(format);
  if ('matchdays' in input) out.matchdaysCount = matchdays ?? null;
  return out;
}

/**
 * API client for `/api/v1/leagues`. See `docs/api.md` §5 and
 * `backend/src/modules/leagues/leagues.routes.ts` for the full contract.
 *
 * Authorization is enforced server-side:
 *   - GET (list / getById): any authenticated user.
 *   - POST / PATCH / DELETE: ADMIN only (returns 403 AUTH_FORBIDDEN otherwise).
 */
export const leaguesApi = {
  async list(includeInactive = false): Promise<League[]> {
    const { data } = await apiClient.get<SuccessEnvelope<RawLeague[]>>('/leagues', {
      params: { includeInactive },
    });
    return data.data.map(normalizeLeague);
  },

  async getById(id: string): Promise<League> {
    const { data } = await apiClient.get<SuccessEnvelope<RawLeague>>(`/leagues/${id}`);
    return normalizeLeague(data.data);
  },

  async create(input: LeagueCreateInput): Promise<League> {
    const { data } = await apiClient.post<SuccessEnvelope<RawLeague>>(
      '/leagues',
      serializeLeagueInput(input),
    );
    return normalizeLeague(data.data);
  },

  async update(id: string, input: LeagueUpdateInput): Promise<League> {
    const { data } = await apiClient.patch<SuccessEnvelope<RawLeague>>(
      `/leagues/${id}`,
      serializeLeagueInput(input),
    );
    return normalizeLeague(data.data);
  },

  async remove(id: string): Promise<{ deleted: boolean }> {
    const { data } = await apiClient.delete<
      SuccessEnvelope<{ deleted: boolean }>
    >(`/leagues/${id}`);
    return data.data;
  },

  // ----- Fase B: tournament engine + enrollment -----

  /** L-3 — Generate the round-robin fixture (replaces the current one). */
  async generateFixture(
    id: string,
    input: { shuffle?: boolean; startDate?: string; force?: boolean } = {},
  ): Promise<{ matchdayCount: number; matchCount: number }> {
    const { data } = await apiClient.post<
      SuccessEnvelope<{ matchdayCount: number; matchCount: number }>
    >(`/leagues/${id}/fixture/generate`, input);
    return data.data;
  },

  /** L-4 — Generate the 8-team knockout bracket. */
  async generateKnockout(
    id: string,
    input: { force?: boolean; startDate?: string } = {},
  ): Promise<{
    quarters: number;
    semis: number;
    final: number;
    thirdPlace: number;
    matchdayId: string;
  }> {
    const { data } = await apiClient.post<
      SuccessEnvelope<{
        quarters: number;
        semis: number;
        final: number;
        thirdPlace: number;
        matchdayId: string;
      }>
    >(`/leagues/${id}/knockout/generate`, input);
    return data.data;
  },

  /** L-8 — Enroll a team into the league. */
  async addTeam(id: string, input: LeagueTeamAssignInput): Promise<LeagueTeam> {
    const { data } = await apiClient.post<SuccessEnvelope<LeagueTeam>>(
      `/leagues/${id}/teams`,
      input,
    );
    return data.data;
  },

  /** L-9 — Reorder the seed / regroup an enrolled team. */
  async updateTeam(
    id: string,
    teamId: string,
    input: LeagueTeamUpdateInput,
  ): Promise<LeagueTeam> {
    const { data } = await apiClient.patch<SuccessEnvelope<LeagueTeam>>(
      `/leagues/${id}/teams/${teamId}`,
      input,
    );
    return data.data;
  },

  /** L-10 — Remove a team from the league. */
  async removeTeam(id: string, teamId: string): Promise<{ deleted: boolean }> {
    const { data } = await apiClient.delete<
      SuccessEnvelope<{ deleted: boolean }>
    >(`/leagues/${id}/teams/${teamId}`);
    return data.data;
  },
};

/** Shape of an error response — useful for typed catch blocks. */
export type LeagueApiError = ErrorEnvelope;
