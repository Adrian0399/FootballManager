import type { Field } from './field';

/** Number of players per team on the field. */
export type LeagueFormat =
  | '1V1'
  | '3V3'
  | '5V5'
  | '6V6'
  | '7V7'
  | '9V9'
  | '11V11';

/** Day of the week for weekly leagues. Some leagues (e.g. Copa) leave this
 *  unset and instead set explicit `startDate`/`endDate` per matchday. */
export type WeekDay =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

/** Time slot for the league's default match window. */
export type TimeSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

/** How the league's match calendar is structured. */
export type LeagueType = 'ROUND_ROBIN' | 'GROUPS_KNOCKOUT' | 'KNOCKOUT_ONLY';

/** Roster size for a given format (players on the field per team). */
export const FORMAT_PLAYERS_ON_FIELD: Record<LeagueFormat, number> = {
  '1V1': 1,
  '3V3': 3,
  '5V5': 5,
  '6V6': 6,
  '7V7': 7,
  '9V9': 9,
  '11V11': 11,
};

/** Friendly Spanish label for a format. */
export const FORMAT_LABEL: Record<LeagueFormat, string> = {
  '1V1': '1 vs 1',
  '3V3': '3 vs 3',
  '5V5': '5 vs 5',
  '6V6': '6 vs 6',
  '7V7': '7 vs 7',
  '9V9': '9 vs 9',
  '11V11': '11 vs 11',
};

/** Friendly Spanish label for a time slot. */
export const TIME_SLOT_LABEL: Record<TimeSlot, string> = {
  MORNING: 'Matutina',
  AFTERNOON: 'Vespertina',
  EVENING: 'Vespertina-noche',
  NIGHT: 'Nocturna',
};

/** Short label for a day of the week (Spanish, 3 chars). */
export const WEEK_DAY_SHORT: Record<WeekDay, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mié',
  THURSDAY: 'Jue',
  FRIDAY: 'Vie',
  SATURDAY: 'Sáb',
  SUNDAY: 'Dom',
};

/**
 * Public League shape — mirrors the backend's `PublicLeague` in
 * `backend/src/modules/leagues/leagues.service.ts`.
 *
 * The backend flattens the M:N join into both `fields[]` (full Field
 * objects, with soft-deleted ones filtered out) and `fieldIds[]` (UUIDs).
 * Both are present in every response.
 *
 * The fields below the "v1.0.0 roadmap additions" comment are NEW for
 * v1.0.0 and may be absent on responses from the current backend. They
 * are typed as optional so the existing LeaguesPage keeps compiling
 * while we work on the backend.
 */
export interface League {
  id: string;
  name: string;
  description: string | null;
  season: string | null;
  /** ISO date string (YYYY-MM-DD) or null. */
  startDate: string | null;
  /** ISO date string (YYYY-MM-DD) or null. */
  endDate: string | null;
  isActive: boolean;
  fields: Field[];
  fieldIds: string[];
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;

  // ----- v1.0.0 roadmap additions (optional until backend lands) -----
  /** Players on the field per team. */
  format?: LeagueFormat;
  /** Free-text category. e.g. "LIBRE", "SUB-17", "JUVENIL MATUTINA". */
  category?: string | null;
  /** Tournament structure. */
  type?: LeagueType;
  /** Number of matchdays in the round-robin phase. */
  matchdays?: number;
  /** True if home/away is played twice per pairing (round-robin phase). */
  homeAndAway?: boolean;
  /** True if the playoff (liguilla) ties are played home/away (two legs). */
  knockoutHomeAndAway?: boolean;
  /** Maximum number of teams allowed in the league. */
  maxTeams?: number;
  /** Default day of the week for matches. */
  dayOfWeek?: WeekDay | null;
  /** Default time slot for matches. */
  timeSlot?: TimeSlot | null;
  /** Aggregated status of the league. */
  status?: 'PLANNED' | 'IN_PROGRESS' | 'FINISHED';
}

/** League lifecycle status. */
export type LeagueStatus = 'PLANNED' | 'IN_PROGRESS' | 'FINISHED';

/**
 * Body for POST /api/v1/leagues. Mirrors `leagueCreateSchema`.
 *
 * NOTE: the API client translates between the frontend's display format
 * (`'7V7'`) and the backend enum (`'SEVEN_V_SEVEN'`), and between
 * `matchdays` (frontend) and `matchdaysCount` (backend column).
 */
export type LeagueCreateInput = {
  name: string;
  description?: string | null;
  season?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  /** At least one field is required to create a league. */
  fieldIds: string[];

  // ----- v1.1 fields -----
  format?: LeagueFormat | null;
  category?: string | null;
  type?: LeagueType | null;
  /** Number of matchdays in the round-robin phase. */
  matchdays?: number | null;
  homeAndAway?: boolean | null;
  /** True if the playoff (liguilla) ties are played home/away (two legs). */
  knockoutHomeAndAway?: boolean | null;
  maxTeams?: number | null;
  dayOfWeek?: WeekDay | null;
  timeSlot?: TimeSlot | null;
  status?: LeagueStatus | null;
};

/** Body for PATCH /api/v1/leagues/:id. All keys optional. */
export type LeagueUpdateInput = Partial<Omit<LeagueCreateInput, 'name'>> & {
  name?: string;
};
