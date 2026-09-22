// Match events hooks (Paso 6).

import { useAsync, type AsyncState } from './useAsync';
import { matchesApi } from '../api/matches';
import { MOCK_MATCH_EVENTS } from '../mocks/matchEvents';
import { MOCK_USERS } from '../mocks/teams';
import { MOCK_TEAMS } from '../mocks/teams';
import type { MatchEvent, MatchEventCreateInput } from '../types/matchEvent';

// ----- Hooks ----------------------------------------------------------------

/** All events for a match, ordered by minute (real backend). */
export function useMatchEvents(matchId: string | null | undefined): AsyncState<MatchEvent[]> {
  const key = matchId ?? '__none__';
  const loader = (_k: string) =>
    matchId ? matchesApi.listEvents(matchId) : Promise.resolve<MatchEvent[]>([]);
  return useAsync<MatchEvent[]>(loader, key);
}

/**
 * Event mutations against the real backend. Callers should `refetch()` the
 * events (and often the match, since GOAL recomputes the score server-side)
 * after each mutation resolves.
 */
export function useMatchEventMutations(matchId: string | null | undefined) {
  async function addEvent(input: MatchEventCreateInput): Promise<MatchEvent> {
    if (!matchId) throw new Error('matchId requerido');
    return matchesApi.createEvent(matchId, input);
  }

  async function removeEvent(eventId: string): Promise<void> {
    await matchesApi.removeEvent(eventId);
  }

  return { addEvent, removeEvent };
}

// ----- Pure helpers (non-hook) ---------------------------------------------

export function getPlayerName(playerId: string): string {
  const u = MOCK_USERS.find((x) => x.id === playerId);
  return u ? `${u.firstName} ${u.paternalSurname}` : playerId;
}

export function getTeamName(teamId: string): string {
  return MOCK_TEAMS.find((t) => t.id === teamId)?.name ?? teamId;
}

export { MOCK_MATCH_EVENTS };
