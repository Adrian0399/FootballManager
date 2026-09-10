// Match event types (v1.0.0 Paso 6).
//
// Every action that happens during a match is an event with a minute
// and a type. The Match Card in Paso 6 renders these as a chronological
// timeline; the Stats engine in Paso 8 aggregates them per player/team.

export type MatchEventType =
  | 'GOAL'
  | 'ASSIST'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'SUBSTITUTION'
  | 'MVP'
  | 'NOTE';

export const EVENT_LABEL: Record<MatchEventType, string> = {
  GOAL: 'Gol',
  ASSIST: 'Asistencia',
  YELLOW_CARD: 'Tarjeta amarilla',
  RED_CARD: 'Tarjeta roja',
  SUBSTITUTION: 'Sustitución',
  MVP: 'MVP',
  NOTE: 'Nota',
};

export const EVENT_TONE: Record<MatchEventType, 'success' | 'cyan' | 'warning' | 'coral' | 'magenta' | 'default'> = {
  GOAL: 'success',
  ASSIST: 'cyan',
  YELLOW_CARD: 'warning',
  RED_CARD: 'coral',
  SUBSTITUTION: 'default',
  MVP: 'magenta',
  NOTE: 'default',
};

export const EVENT_ICON: Record<MatchEventType, 'goal' | 'assist' | 'yellow' | 'red' | 'sub' | 'mvp' | 'note'> = {
  GOAL: 'goal',
  ASSIST: 'assist',
  YELLOW_CARD: 'yellow',
  RED_CARD: 'red',
  SUBSTITUTION: 'sub',
  MVP: 'mvp',
  NOTE: 'note',
};

export interface MatchEvent {
  id: string;
  matchId: string;
  /** Minute of the match (0..120). For stoppage time, the integer carries the
   *  base minute and a `+N` suffix can be derived from notes if needed. */
  minute: number;
  type: MatchEventType;
  /** The team responsible. For 1v1, the homeTeamId or awayTeamId. */
  teamId: string;
  playerId: string;
  /** For SUBSTITUTION: the player coming IN. For GOAL+ASSIST (rare): the
   *  assister. For SUBSTITUTION this is the second actor. */
  secondaryPlayerId?: string | null;
  /** Resolved display names (populated from the backend response). */
  playerName?: string;
  secondaryPlayerName?: string;
  notes?: string | null;
  createdAt: string;
}

/** Body for POST /api/v1/matches/:id/events. */
export type MatchEventCreateInput = {
  minute: number;
  type: MatchEventType;
  teamId: string;
  playerId: string;
  secondaryPlayerId?: string | null;
  notes?: string | null;
};
