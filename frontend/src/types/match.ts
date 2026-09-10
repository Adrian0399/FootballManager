// Match + Matchday domain types (v1.0.0 Paso 5).
//
// A `Matchday` groups matches that are played on the same round
// (jornada). A `Match` is a single fixture between two teams (or two
// players in 1v1). Status flows:
//   SCHEDULED → IN_PROGRESS → COMPLETED
//                       ↘ POSTPONED
//                       ↘ CANCELLED
//
// `scoringMode` is a hint for the UI (the Match Card in Paso 6 will
// branch on it): the referee can capture events in real time (LIVE)
// or do a bulk entry at the end (POST_MATCH).

import type { WeekDay, TimeSlot } from './league';

export type MatchStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'POSTPONED'
  | 'CANCELLED';

export type ScoringMode = 'LIVE' | 'POST_MATCH';

export type MatchdayStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

/** Bracket stage. Null/undefined = round-robin match. */
export type KnockoutStage = 'QUARTERS' | 'SEMIS' | 'FINAL';

export interface Matchday {
  id: string;
  leagueId: string;
  /** 1-based jornada number. Matchday 1 is the opening round. */
  number: number;
  /** YYYY-MM-DD. */
  date: string;
  status: MatchdayStatus;
}

/** Lightweight team summary embedded in a match response (v1.1). */
export interface MatchTeamSummary {
  id: string;
  name: string;
  shortName: string;
  emoji: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export interface Match {
  id: string;
  leagueId: string;
  matchdayId: string;
  /** Home team id (or 1v1 competitor id). */
  homeTeamId: string;
  /** Away team id. */
  awayTeamId: string;
  /** Field where the match is played. */
  fieldId: string | null;
  /** ISO datetime. */
  scheduledAt: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  refereeId: string | null;
  mvpPlayerId: string | null;
  scoringMode: ScoringMode | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** Set for knockout-stage matches; null/undefined for round-robin. */
  knockoutStage?: KnockoutStage | null;
  /** 1-based position within the stage (1..N/2 for that stage). */
  knockoutPosition?: number | null;
  /** The winner of this match advances to this match. */
  knockoutFeedsIntoMatchId?: string | null;
  /** Embedded team summaries returned by the backend list/detail (v1.1). */
  homeTeam?: MatchTeamSummary | null;
  awayTeam?: MatchTeamSummary | null;
  /** The backend names the MVP column `mvpUserId`. */
  mvpUserId?: string | null;
}

// ----- Write bodies (mirror the backend Zod schemas) ------------------------

export type ScoringModeInput = ScoringMode;
export type KnockoutStageInput = KnockoutStage | 'ROUND_OF_16' | 'THIRD_PLACE';

/** Body for POST /api/v1/matches. Mirrors `matchCreateSchema`. */
export interface MatchCreateInput {
  leagueId: string;
  matchdayId: string;
  homeTeamId: string;
  awayTeamId: string;
  fieldId?: string | null;
  scheduledAt: string;
  status?: MatchStatus;
  refereeId?: string | null;
  mvpUserId?: string | null;
  scoringMode?: ScoringMode | null;
  notes?: string | null;
  knockoutStage?: KnockoutStageInput | null;
  knockoutPosition?: number | null;
  knockoutFeedsIntoMatchId?: string | null;
}

/** Body for PATCH /api/v1/matches/:id. All keys optional. */
export type MatchUpdateInput = Partial<MatchCreateInput>;

/** Body for PATCH /api/v1/matches/:id/score. */
export interface MatchScoreInput {
  homeScore: number;
  awayScore: number;
  status?: MatchStatus;
}

/** Body for PATCH /api/v1/matches/:id/status. */
export interface MatchStatusInput {
  status: MatchStatus;
}

// ----- Helpers --------------------------------------------------------------

/** Default scheduled time per time slot, as "HH:mm". */
export const TIME_SLOT_HOUR: Record<TimeSlot, string> = {
  MORNING: '09:00',
  AFTERNOON: '14:00',
  EVENING: '19:00',
  NIGHT: '21:00',
};

/** JS Date.getDay() index (0=Sun) for each WeekDay. */
export const WEEKDAY_JS_INDEX: Record<WeekDay, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export const STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: 'Pendiente',
  IN_PROGRESS: 'En juego',
  COMPLETED: 'Finalizado',
  POSTPONED: 'Pospuesto',
  CANCELLED: 'Cancelado',
};

export const STAGE_LABEL: Record<KnockoutStage, string> = {
  QUARTERS: 'Cuartos de final',
  SEMIS: 'Semifinales',
  FINAL: 'Final',
};

export const STAGE_SHORT: Record<KnockoutStage, string> = {
  QUARTERS: 'Cuartos',
  SEMIS: 'Semis',
  FINAL: 'Final',
};

export const STATUS_TONE: Record<
  MatchStatus,
  'default' | 'lime' | 'success' | 'warning' | 'coral'
> = {
  SCHEDULED: 'default',
  IN_PROGRESS: 'lime',
  COMPLETED: 'success',
  POSTPONED: 'warning',
  CANCELLED: 'coral',
};
