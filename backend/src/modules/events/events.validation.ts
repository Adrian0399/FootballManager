import { z } from 'zod';

const eventTypeEnum = z.enum([
  'GOAL',
  'ASSIST',
  'YELLOW_CARD',
  'RED_CARD',
  'SUBSTITUTION',
  'MVP',
  'NOTE',
]);

export const eventCreateSchema = z.object({
  minute: z.coerce.number().int().min(0).max(120),
  type: eventTypeEnum,
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
  // For GOAL events this is the assisting player; for SUBSTITUTION it can be
  // the player coming off; for NOTE it is free.
  secondaryUserId: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const eventUpdateSchema = z.object({
  minute: z.coerce.number().int().min(0).max(120).optional(),
  type: eventTypeEnum.optional(),
  teamId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  secondaryUserId: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type EventCreateDto = z.infer<typeof eventCreateSchema>;
export type EventUpdateDto = z.infer<typeof eventUpdateSchema>;
