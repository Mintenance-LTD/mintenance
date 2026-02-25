/**
 * Auth & GDPR Validation Schemas
 */
import { z } from 'zod';
import { sanitizeText, sanitizeEmail } from '@/lib/sanitizer';

export const loginSchema = z.object({
  email: z.string().transform((val) => sanitizeEmail(val)),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    email: z.string().transform((val) => sanitizeEmail(val)),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    firstName: z
      .string()
      .min(1, 'First name required')
      .max(100, 'First name too long')
      .regex(/^[a-zA-Z\s-']+$/, 'First name contains invalid characters')
      .transform((val) => sanitizeText(val, 100)),
    lastName: z
      .string()
      .min(1, 'Last name required')
      .max(100, 'Last name too long')
      .regex(/^[a-zA-Z\s-']+$/, 'Last name contains invalid characters')
      .transform((val) => sanitizeText(val, 100)),
    role: z.enum(['homeowner', 'contractor', 'admin']),
    phone: z.preprocess((val) => {
      if (!val || typeof val !== 'string' || val.trim() === '') return undefined;
      const stripped = val.replace(/[\s\-()]/g, '');
      if (/^0\d{9,10}$/.test(stripped)) return '+44' + stripped.slice(1);
      return stripped;
    }, z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number').optional()),
  })
  .refine((data) => !(data.role === 'homeowner' && !data.phone), {
    message: 'Phone number is required for homeowners',
    path: ['phone'],
  })
  .refine((data) => !(data.role === 'admin' && !data.email.endsWith('@mintenance.co.uk')), {
    message: 'Admin accounts must use @mintenance.co.uk email address',
    path: ['email'],
  });

export const passwordResetSchema = z.object({
  email: z.string().transform((val) => sanitizeEmail(val)),
});

export const passwordUpdateSchema = z.object({
  token: z.string().min(1, 'Token required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

// GDPR Schemas
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

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
