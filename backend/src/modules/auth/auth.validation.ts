import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one digit');

const phoneSchema = z
  .string()
  .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number (E.164 preferred)');

export const registerSchema = z.object({
  firstName: z.string().min(2).max(100),
  paternalSurname: z.string().min(2).max(100),
  maternalSurname: z.string().min(2).max(100),
  birthDate: z.coerce.date().refine((d) => d < new Date(), 'birthDate must be in the past'),
  role: z
    .enum(['ADMIN', 'REFEREE', 'TECHNICAL_DIRECTOR', 'ASSISTANT', 'PLAYER'])
    .default('PLAYER')
    // Self-registration may only create PLAYER/ASSISTANT accounts;
    // privileged roles are provisioned by an ADMIN via POST /users.
    .refine((r) => r === 'PLAYER' || r === 'ASSISTANT', {
      message: 'El registro público solo permite crear Jugador o Auxiliar',
    }),
  nickname: z.string().max(80).optional(),
  phoneNumber: phoneSchema,
  email: z.string().email().max(255),
  curp: z
    .string()
    .regex(/^[A-Z]{4}[0-9]{6}[A-Z]{6}[0-9]{2}$/, 'Invalid CURP format (18 chars)'),
  password: passwordSchema,
  // Optional: registering from an invitation link locks the role and
  // associates the account with the inviting team.
  inviteToken: z.string().max(64).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;