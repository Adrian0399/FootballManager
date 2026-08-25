import { z } from 'zod';

export const fieldCreateSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().max(255).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
});

export const fieldUpdateSchema = fieldCreateSchema.partial();

export type FieldCreateDto = z.infer<typeof fieldCreateSchema>;
export type FieldUpdateDto = z.infer<typeof fieldUpdateSchema>;
