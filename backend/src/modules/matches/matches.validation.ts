import { z } from 'zod';

const matchStatusEnum = z.enum([
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'POSTPONED',
  'CANCELLED',
]);

const scoringModeEnum = z.enum(['LIVE', 'POST_MATCH']);

const knockoutStageEnum = z.enum([
  'ROUND_OF_16',
  'QUARTERS',
  'SEMIS',
  'FINAL',
  'THIRD_PLACE',
]);

export const matchCreateSchema = z.object({
  leagueId: z.string().uuid(),
  matchdayId: z.string().uuid(),
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
  fieldId: z.string().uuid().optional().nullable(),
  scheduledAt: z.coerce.date(),
  status: matchStatusEnum.optional(),
  refereeId: z.string().uuid().optional().nullable(),
  mvpUserId: z.string().uuid().optional().nullable(),
  scoringMode: scoringModeEnum.optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  knockoutStage: knockoutStageEnum.optional().nullable(),
  knockoutPosition: z.coerce.number().int().positive().optional().nullable(),
  knockoutFeedsIntoMatchId: z.string().uuid().optional().nullable(),
});

export const matchUpdateSchema = matchCreateSchema.partial();

export const matchScoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
  // Optional convenience: mark the match completed in the same call.
  status: matchStatusEnum.optional(),
});

export const matchStatusSchema = z.object({
  status: matchStatusEnum,
});

export type MatchCreateDto = z.infer<typeof matchCreateSchema>;
export type MatchUpdateDto = z.infer<typeof matchUpdateSchema>;
export type MatchScoreDto = z.infer<typeof matchScoreSchema>;
export type MatchStatusDto = z.infer<typeof matchStatusSchema>;
