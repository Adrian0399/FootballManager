import { apiClient } from './axios';
import type { SuccessEnvelope, ErrorEnvelope } from '../types/user';
import type {
  Match,
  Matchday,
  MatchCreateInput,
  MatchUpdateInput,
  MatchScoreInput,
  MatchStatusInput,
} from '../types/match';
import type {
  MatchEvent,
  MatchEventCreateInput,
  MatchEventType,
} from '../types/matchEvent';

/**
 * API client for `/api/v1/matches`, `/api/v1/matchdays` and
 * `/api/v1/leagues/:id/matchdays`. See `backend/src/modules/matches` for the
 * contract.
 *
 * Authorization:
 *   - GET: any authenticated user.
 *   - POST / PATCH / DELETE (match + events): ADMIN only.
 *
 * NOTE on field naming: the backend event row stores the player under
 * `userId` (FK to users), while the v1.0.0 frontend `MatchEvent` shape uses
 * `playerId`. The two mapping helpers below bridge the gap so the rest of the
 * UI keeps using `MatchEvent`.
 */

interface ServerPerson {
  id: string;
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
  nickname?: string | null;
}

interface ServerEvent {
  id: string;
  matchId: string;
  minute: number;
  type: MatchEventType;
  teamId: string;
  userId: string;
  secondaryUserId: string | null;
  notes: string | null;
  user?: ServerPerson | null;
  secondaryUser?: ServerPerson | null;
}

function personName(p: ServerPerson | null | undefined): string | undefined {
  if (!p) return undefined;
  return `${p.firstName} ${p.paternalSurname}`.trim();
}

function fromServerEvent(e: ServerEvent): MatchEvent {
  return {
    id: e.id,
    matchId: e.matchId,
    minute: e.minute,
    type: e.type,
    teamId: e.teamId,
    playerId: e.userId,
    secondaryPlayerId: e.secondaryUserId ?? null,
    playerName: personName(e.user),
    secondaryPlayerName: personName(e.secondaryUser),
    notes: e.notes ?? null,
    createdAt: '',
  };
}

function toServerEvent(input: Partial<MatchEventCreateInput>) {
  return {
    ...(input.minute !== undefined ? { minute: input.minute } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
    ...(input.playerId !== undefined ? { userId: input.playerId } : {}),
    ...(input.secondaryPlayerId !== undefined
      ? { secondaryUserId: input.secondaryPlayerId }
      : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
}

export const matchesApi = {
  // ----- Matches -----------------------------------------------------------

  async list(params?: { leagueId?: string; matchdayId?: string }): Promise<Match[]> {
    const { data } = await apiClient.get<SuccessEnvelope<Match[]>>('/matches', {
      params,
    });
    return data.data;
  },

  async getById(id: string): Promise<Match> {
    const { data } = await apiClient.get<SuccessEnvelope<Match>>(`/matches/${id}`);
    return data.data;
  },

  async create(input: MatchCreateInput): Promise<Match> {
    const { data } = await apiClient.post<SuccessEnvelope<Match>>('/matches', input);
    return data.data;
  },

  async update(id: string, input: MatchUpdateInput): Promise<Match> {
    const { data } = await apiClient.patch<SuccessEnvelope<Match>>(
      `/matches/${id}`,
      input,
    );
    return data.data;
  },

  async setScore(id: string, input: MatchScoreInput): Promise<Match> {
    const { data } = await apiClient.patch<SuccessEnvelope<Match>>(
      `/matches/${id}/score`,
      input,
    );
    return data.data;
  },

  async setStatus(id: string, input: MatchStatusInput): Promise<Match> {
    const { data } = await apiClient.patch<SuccessEnvelope<Match>>(
      `/matches/${id}/status`,
      input,
    );
    return data.data;
  },

  async remove(id: string): Promise<{ deleted: boolean }> {
    const { data } = await apiClient.delete<
      SuccessEnvelope<{ deleted: boolean }>
    >(`/matches/${id}`);
    return data.data;
  },

  // ----- Matchdays ---------------------------------------------------------

  async listMatchdaysByLeague(leagueId: string): Promise<Matchday[]> {
    const { data } = await apiClient.get<SuccessEnvelope<Matchday[]>>(
      `/leagues/${leagueId}/matchdays`,
    );
    return data.data;
  },

  async getMatchday(id: string): Promise<Matchday> {
    const { data } = await apiClient.get<SuccessEnvelope<Matchday>>(
      `/matchdays/${id}`,
    );
    return data.data;
  },

  // ----- Events ------------------------------------------------------------

  async listEvents(matchId: string): Promise<MatchEvent[]> {
    const { data } = await apiClient.get<SuccessEnvelope<ServerEvent[]>>(
      `/matches/${matchId}/events`,
    );
    return data.data.map(fromServerEvent);
  },

  async createEvent(
    matchId: string,
    input: MatchEventCreateInput,
  ): Promise<MatchEvent> {
    const { data } = await apiClient.post<SuccessEnvelope<ServerEvent>>(
      `/matches/${matchId}/events`,
      toServerEvent(input),
    );
    return fromServerEvent(data.data);
  },

  async updateEvent(
    eventId: string,
    input: Partial<MatchEventCreateInput>,
  ): Promise<MatchEvent> {
    const { data } = await apiClient.patch<SuccessEnvelope<ServerEvent>>(
      `/events/${eventId}`,
      toServerEvent(input),
    );
    return fromServerEvent(data.data);
  },

  async removeEvent(eventId: string): Promise<{ deleted: boolean }> {
    const { data } = await apiClient.delete<
      SuccessEnvelope<{ deleted: boolean }>
    >(`/events/${eventId}`);
    return data.data;
  },
};

/** Shape of an error response — useful for typed catch blocks. */
export type MatchApiError = ErrorEnvelope;
