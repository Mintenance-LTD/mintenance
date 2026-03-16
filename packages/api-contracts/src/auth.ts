/**
 * Authentication API contracts.
 *
 * NOTE: No sanitization transforms here — those are applied in the web
 * validation layer (apps/web/lib/validation/schemas-auth.ts) on top of
 * these base schemas.
 */
import { z } from 'zod';

// ── Password rules (shared between login/register) ────────────────

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

const strongPasswordSchema = passwordSchema
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// ── Phone normalisation (pure logic, no DOM) ──────────────────────

const phoneSchema = z.preprocess((val) => {
  if (!val || typeof val !== 'string' || val.trim() === '') return undefined;
  const stripped = val.replace(/[\s\-()]/g, '');
  if (/^0\d{9,10}$/.test(stripped)) return '+44' + stripped.slice(1);
  return stripped;
}, z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number').optional());

// ── Request schemas ────────────────────────────────────────────────

export const loginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  rememberMe: z.boolean().optional(),
});

export const registerRequestSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    password: strongPasswordSchema,
    firstName: z
      .string()
      .min(1, 'First name required')
      .max(100, 'First name too long')
      .regex(/^[a-zA-Z\s\-']+$/, 'First name contains invalid characters'),
    lastName: z
      .string()
      .min(1, 'Last name required')
      .max(100, 'Last name too long')
      .regex(/^[a-zA-Z\s\-']+$/, 'Last name contains invalid characters'),
    role: z.enum(['homeowner', 'contractor']),
    phone: phoneSchema,
  })
  .refine((data) => !(data.role === 'homeowner' && !data.phone), {
    message: 'Phone number is required for homeowners',
    path: ['phone'],
  });

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const passwordUpdateRequestSchema = z.object({
  token: z.string().min(1, 'Token required'),
  newPassword: strongPasswordSchema,
});

// ── Response schemas ───────────────────────────────────────────────

const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  role: z.enum(['homeowner', 'contractor', 'admin']),
  firstName: z.string(),
  lastName: z.string(),
  emailVerified: z.boolean(),
});

export const loginResponseSchema = z.object({
  message: z.string(),
  user: userResponseSchema.optional(),
  requiresMfa: z.boolean().optional(),
  preMfaToken: z.string().optional(),
});

export const registerResponseSchema = z.object({
  message: z.string(),
  user: userResponseSchema,
});

// ── GDPR schemas ───────────────────────────────────────────────────

export const gdprRequestSchema = z.object({
  request_type: z.enum(['access', 'portability', 'rectification', 'erasure', 'restriction', 'objection']),
  notes: z.string().optional(),
});

export const gdprEmailSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const gdprAnonymizeSchema = z.object({
  email: z.string().email('Invalid email format'),
  confirmation: z.literal('ANONYMIZE MY DATA'),
});

export const gdprDeleteSchema = z.object({
  email: z.string().email('Invalid email format'),
  confirmation: z.literal('DELETE MY DATA'),
});

// ── Inferred types ─────────────────────────────────────────────────

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordUpdateRequest = z.infer<typeof passwordUpdateRequestSchema>;
