import { z } from 'zod';

const categoryEnum = z.enum(['SCORER', 'MVP', 'FAIR_PLAY', 'CHAMPION', 'BEST_DEFENSE']);
const levelEnum = z.enum(['GOLD', 'SILVER', 'BRONZE']);

/** POST /awards */
export const awardCreateSchema = z.object({
  userId: z.string().uuid(),
  leagueId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  category: categoryEnum,
  level: levelEnum,
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  awardedAt: z.coerce.date(),
});
export type AwardCreateDto = z.infer<typeof awardCreateSchema>;

/** PATCH /awards/:id */
export const awardUpdateSchema = awardCreateSchema.partial();
export type AwardUpdateDto = z.infer<typeof awardUpdateSchema>;

/** POST /leagues/:id/awards/seed */
export const awardSeedSchema = z.object({
  force: z.boolean().optional(),
  awardedAt: z.coerce.date().optional(),
});
export type AwardSeedDto = z.infer<typeof awardSeedSchema>;

/** GET /awards query */
export const awardListQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  leagueId: z.string().uuid().optional(),
  category: categoryEnum.optional(),
});
export type AwardListQueryDto = z.infer<typeof awardListQuerySchema>;

export { categoryEnum as awardCategoryEnum, levelEnum as awardLevelEnum };
