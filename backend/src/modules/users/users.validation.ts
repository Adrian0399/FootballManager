import { z } from 'zod';

const phoneSchema = z
  .string()
  .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number (E.164 preferred)');

/**
 * Update schema for the authenticated user's profile.
 * `age` is intentionally NOT here — the server computes it from `birthDate`.
 * `.strict()` rejects any extra field, including `age`.
 */
export const updateUserSchema = z
  .object({
    firstName: z.string().min(2).max(100).optional(),
    paternalSurname: z.string().min(2).max(100).optional(),
    maternalSurname: z.string().min(2).max(100).optional(),
    birthDate: z
      .coerce.date()
      .refine((d) => d < new Date(), 'birthDate must be in the past')
      .optional(),
    nickname: z.string().max(80).nullable().optional(),
    phoneNumber: phoneSchema.optional(),
  })
  .strict();

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

/**
 * Query schema for GET /users (admin list / search).
 * `page` is 1-based; `size` is capped at 100.
 */
export const listUsersQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z
    .enum(['ADMIN', 'REFEREE', 'TECHNICAL_DIRECTOR', 'ASSISTANT', 'PLAYER'])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;

/**
 * Create schema for admin user provisioning (POST /users).
 * `age` is derived server-side from `birthDate`.
 */
export const userCreateSchema = z
  .object({
    firstName: z.string().min(2).max(100),
    paternalSurname: z.string().min(2).max(100),
    maternalSurname: z.string().min(2).max(100),
    birthDate: z
      .coerce.date()
      .refine((d) => d < new Date(), 'birthDate must be in the past'),
    role: z.enum(['ADMIN', 'REFEREE', 'TECHNICAL_DIRECTOR', 'ASSISTANT', 'PLAYER']),
    nickname: z.string().max(80).nullable().optional(),
    phoneNumber: phoneSchema,
    email: z.string().email().max(255),
    curp: z.string().length(18).transform((v) => v.toUpperCase()),
    password: z.string().min(8).max(72),
  })
  .strict();

export type UserCreateDto = z.infer<typeof userCreateSchema>;

/**
 * Admin update schema (PATCH /users/:id). Same editable surface as create,
 * plus `isActive`, minus `password`.
 */
export const adminUpdateUserSchema = z
  .object({
    firstName: z.string().min(2).max(100).optional(),
    paternalSurname: z.string().min(2).max(100).optional(),
    maternalSurname: z.string().min(2).max(100).optional(),
    birthDate: z
      .coerce.date()
      .refine((d) => d < new Date(), 'birthDate must be in the past')
      .optional(),
    role: z
      .enum(['ADMIN', 'REFEREE', 'TECHNICAL_DIRECTOR', 'ASSISTANT', 'PLAYER'])
      .optional(),
    nickname: z.string().max(80).nullable().optional(),
    phoneNumber: phoneSchema.optional(),
    email: z.string().email().max(255).optional(),
    curp: z
      .string()
      .length(18)
      .transform((v) => v.toUpperCase())
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type AdminUpdateUserDto = z.infer<typeof adminUpdateUserSchema>;