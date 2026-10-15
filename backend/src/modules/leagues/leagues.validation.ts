import { z } from 'zod';

const uuidArray = z.array(z.string().uuid()).min(1, 'At least one field is required');

const leagueFormatEnum = z.enum([
  'ONE_V_ONE',
  'THREE_V_THREE',
  'FIVE_V_FIVE',
  'SIX_V_SIX',
  'SEVEN_V_SEVEN',
  'NINE_V_NINE',
  'ELEVEN_V_ELEVEN',
]);

const leagueTypeEnum = z.enum(['ROUND_ROBIN', 'GROUPS_KNOCKOUT', 'KNOCKOUT_ONLY']);

const weekDayEnum = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

const timeSlotEnum = z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']);

const leagueStatusEnum = z.enum(['PLANNED', 'IN_PROGRESS', 'FINISHED']);

export const leagueCreateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional().nullable(),
  season: z.string().max(50).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  fieldIds: uuidArray,
  // ----- v1.1 tournament fields -----
  format: leagueFormatEnum.optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  type: leagueTypeEnum.optional().nullable(),
  matchdaysCount: z.coerce.number().int().positive().optional().nullable(),
  homeAndAway: z.boolean().optional().nullable(),
  knockoutHomeAndAway: z.boolean().optional().nullable(),
  maxTeams: z.coerce.number().int().positive().optional().nullable(),
  dayOfWeek: weekDayEnum.optional().nullable(),
  timeSlot: timeSlotEnum.optional().nullable(),
  status: leagueStatusEnum.optional().nullable(),
});

export const leagueUpdateSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(1000).optional().nullable(),
    season: z.string().max(50).optional().nullable(),
    startDate: z.coerce.date().optional().nullable(),
    endDate: z.coerce.date().optional().nullable(),
    fieldIds: uuidArray.optional(),
    format: leagueFormatEnum.optional().nullable(),
    category: z.string().max(50).optional().nullable(),
    type: leagueTypeEnum.optional().nullable(),
    matchdaysCount: z.coerce.number().int().positive().optional().nullable(),
    homeAndAway: z.boolean().optional().nullable(),
    knockoutHomeAndAway: z.boolean().optional().nullable(),
    maxTeams: z.coerce.number().int().positive().optional().nullable(),
    dayOfWeek: weekDayEnum.optional().nullable(),
    timeSlot: timeSlotEnum.optional().nullable(),
    status: leagueStatusEnum.optional().nullable(),
  })
  .refine(
    (d) =>
      d.startDate === undefined ||
      d.startDate === null ||
      d.endDate === undefined ||
      d.endDate === null ||
      d.startDate <= d.endDate,
    { message: 'startDate must be before or equal to endDate', path: ['endDate'] },
  );

export type LeagueCreateDto = z.infer<typeof leagueCreateSchema>;
export type LeagueUpdateDto = z.infer<typeof leagueUpdateSchema>;

// =====================================================================
// Fase B — Tournament engine (fixture + knockout + enrollment)
// =====================================================================

/** POST /leagues/:id/fixture/generate */
export const fixtureGenerateSchema = z.object({
  /** Randomize the seed order before generating. */
  shuffle: z.boolean().optional(),
  /** Override the start date (defaults to league.startDate or today). */
  startDate: z.coerce.date().optional(),
  /** Allow regeneration even if the league already has played matches. */
  force: z.boolean().optional(),
});
export type FixtureGenerateDto = z.infer<typeof fixtureGenerateSchema>;

/** POST /leagues/:id/knockout/generate */
export const knockoutGenerateSchema = z.object({
  /** Allow regeneration even if a bracket already exists. */
  force: z.boolean().optional(),
  /** Override the playoff start date (defaults to a week after the last matchday). */
  startDate: z.coerce.date().optional(),
});
export type KnockoutGenerateDto = z.infer<typeof knockoutGenerateSchema>;

/** POST /leagues/:id/teams */
export const leagueTeamAddSchema = z.object({
  teamId: z.string().uuid(),
  /** Desired seed (1-based). Defaults to the next free slot. */
  seed: z.coerce.number().int().positive().optional(),
  /** Group label for GROUPS_KNOCKOUT leagues (e.g. "A"). */
  groupLabel: z.string().max(5).optional().nullable(),
});
export type LeagueTeamAddDto = z.infer<typeof leagueTeamAddSchema>;

/** PATCH /leagues/:id/teams/:teamId */
export const leagueTeamUpdateSchema = z.object({
  seed: z.coerce.number().int().positive().optional(),
  groupLabel: z.string().max(5).optional().nullable(),
});
export type LeagueTeamUpdateDto = z.infer<typeof leagueTeamUpdateSchema>;

// ----- Matchdays (L-5, L-6, L-7) -----

const matchdayStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']);

/** POST /leagues/:id/matchdays */
export const matchdayCreateSchema = z.object({
  number: z.coerce.number().int().positive().optional(),
  date: z.coerce.date(),
  status: matchdayStatusEnum.optional(),
});
export type MatchdayCreateDto = z.infer<typeof matchdayCreateSchema>;

/** PATCH /matchdays/:id */
export const matchdayUpdateSchema = z.object({
  number: z.coerce.number().int().positive().optional(),
  date: z.coerce.date().optional(),
  status: matchdayStatusEnum.optional(),
});
export type MatchdayUpdateDto = z.infer<typeof matchdayUpdateSchema>;
