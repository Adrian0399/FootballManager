import { z } from 'zod';

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color like #FFE600');

const teamRoleEnum = z.enum(['PLAYER', 'DT', 'ASSISTANT']);

const fieldPositionEnum = z.enum(['GK', 'DEF', 'MID', 'FWD', 'FIXO', 'ALA', 'PIVOT']);

export const teamCreateSchema = z.object({
  name: z.string().min(2).max(100),
  shortName: z.string().min(1).max(10),
  emoji: z.string().max(10).optional().nullable(),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  homeFieldId: z.string().uuid().optional().nullable(),
  currentLeagueId: z.string().uuid().optional().nullable(),
});

export const teamUpdateSchema = teamCreateSchema.partial();

export const membershipCreateSchema = z.object({
  userId: z.string().uuid(),
  membershipRole: teamRoleEnum,
  // Meaningful only when membershipRole = PLAYER. Nulled out otherwise.
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().nullable(),
  position: fieldPositionEnum.optional().nullable(),
  isCaptain: z.boolean().optional(),
});

export const membershipUpdateSchema = z.object({
  membershipRole: teamRoleEnum.optional(),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().nullable(),
  position: fieldPositionEnum.optional().nullable(),
  isCaptain: z.boolean().optional(),
});

export type TeamCreateDto = z.infer<typeof teamCreateSchema>;
export type TeamUpdateDto = z.infer<typeof teamUpdateSchema>;
export type MembershipCreateDto = z.infer<typeof membershipCreateSchema>;
export type MembershipUpdateDto = z.infer<typeof membershipUpdateSchema>;
