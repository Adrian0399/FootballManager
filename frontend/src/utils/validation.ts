import { z } from 'zod';

const curpRegex = /^[A-Z]{4}[0-9]{6}[A-Z]{6}[0-9]{2}$/;
const phoneRegex = /^\+?[0-9]{10,15}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    firstName: z.string().min(2, 'Min 2 characters').max(100),
    paternalSurname: z.string().min(2, 'Min 2 characters').max(100),
    maternalSurname: z.string().min(2, 'Min 2 characters').max(100),
    birthDate: z
      .string()
      .min(1, 'Required')
      .refine((v) => {
        const d = new Date(v);
        return !Number.isNaN(d.getTime()) && d < new Date();
      }, 'Birth date must be in the past'),
    role: z
      .enum(['ADMIN', 'REFEREE', 'TECHNICAL_DIRECTOR', 'ASSISTANT', 'PLAYER'])
      .default('PLAYER'),
    nickname: z.string().max(80).optional().or(z.literal('')),
    phoneNumber: z
      .string()
      .regex(phoneRegex, 'Invalid phone number (10-15 digits, optional +)'),
    email: z.string().email('Invalid email').max(255),
    curp: z
      .string()
      .regex(curpRegex, 'Invalid CURP (4 letters, 6 digits, 6 letters, 2 digits)'),
    password: z
      .string()
      .regex(
        passwordRegex,
        'Min 8 chars, must include letters and numbers',
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Edit profile schema.
 * `age` is NOT here. The form only collects `birthDate`; the server recomputes age.
 */
export const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'Min 2 characters').max(100),
  paternalSurname: z.string().min(2, 'Min 2 characters').max(100),
  maternalSurname: z.string().min(2, 'Min 2 characters').max(100),
  birthDate: z
    .string()
    .min(1, 'Required')
    .refine((v) => {
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && d < new Date();
    }, 'Birth date must be in the past'),
  nickname: z.string().max(80).optional().or(z.literal('')),
  phoneNumber: z
    .string()
    .regex(phoneRegex, 'Invalid phone number (10-15 digits, optional +)'),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

// =====================================================================
// Fields (canchas)
//
// Schemas are intentionally plain ZodObject (no `.transform()`) so that
// `.partial()` keeps working for the update variant and so that the
// form state type matches what the user types: a string for capacity,
// '' for empty optionals. Conversion to the API payload shape (nulls,
// number capacity) happens in the form's submit handler.
// =====================================================================

export const fieldCreateSchema = z.object({
  name: z.string().min(2, 'Min 2 characters').max(100),
  /** Empty string allowed — converted to `null` in the submit handler. */
  address: z.string().max(255).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  /** Kept as a string for the input; we coerce to a positive int on submit. */
  capacity: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) =>
        v === '' ||
        v === undefined ||
        (Number.isInteger(Number(v)) && Number(v) > 0),
      'Capacity must be a positive integer',
    ),
});

export const fieldUpdateSchema = fieldCreateSchema.partial();

export type FieldCreateForm = z.infer<typeof fieldCreateSchema>;
export type FieldUpdateForm = z.infer<typeof fieldUpdateSchema>;

// =====================================================================
// Leagues
// =====================================================================

/**
 * Base object schema (without the cross-field refinement). We derive
 * `leagueCreateSchema` (with the date-range refine) and
 * `leagueUpdateSchema` (partial) from this same source so both variants
 * stay in sync when fields change.
 */
const leagueBaseSchema = z.object({
  name: z.string().min(2, 'Min 2 characters').max(100),
  description: z.string().max(1000).optional().or(z.literal('')),
  season: z.string().max(50).optional().or(z.literal('')),
  /** YYYY-MM-DD from `<input type="date">` or ''. */
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  fieldIds: z
    .array(z.string().uuid('Invalid field id'))
    .min(1, 'At least one field is required'),

  // ----- v1.0.0 Paso 4 additions (optional until backend lands) -----

  /** Players on the field per team. */
  format: z
    .enum(['1V1', '3V3', '5V5', '6V6', '7V7', '9V9', '11V11'])
    .optional(),
  /** Free-text category. e.g. "LIBRE", "SUB-17", "JUVENIL MATUTINA". */
  category: z.string().max(50).optional().or(z.literal('')),
  /** Tournament structure. */
  type: z
    .enum(['ROUND_ROBIN', 'GROUPS_KNOCKOUT', 'KNOCKOUT_ONLY'])
    .optional(),
  /** Number of matchdays in the round-robin phase. */
  matchdays: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) =>
        v === '' ||
        v === undefined ||
        (Number.isInteger(Number(v)) && Number(v) > 0),
      'Matchdays must be a positive integer',
    ),
  /** True if home/away is played twice per pairing. */
  homeAndAway: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === 'on'),
  /** Maximum number of teams allowed in the league. */
  maxTeams: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) =>
        v === '' ||
        v === undefined ||
        (Number.isInteger(Number(v)) && Number(v) > 0),
      'Max teams must be a positive integer',
    ),
  /** Default day of the week for matches. */
  dayOfWeek: z
    .enum([
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ])
    .optional(),
  /** Default time slot for matches. */
  timeSlot: z
    .enum(['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'])
    .optional(),
});

export const leagueCreateSchema = leagueBaseSchema.refine(
  (d) =>
    !d.startDate ||
    !d.endDate ||
    d.startDate === '' ||
    d.endDate === '' ||
    new Date(d.startDate) <= new Date(d.endDate),
  { message: 'Start date must be before or equal to end date', path: ['endDate'] },
);

export const leagueUpdateSchema = leagueBaseSchema.partial();

export type LeagueCreateForm = z.infer<typeof leagueCreateSchema>;
export type LeagueUpdateForm = z.infer<typeof leagueUpdateSchema>;
