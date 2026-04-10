import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required');

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number'
  );

export const NameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(50, 'Name must be less than 50 characters')
  .regex(
    // Unicode letters (accents, non-Latin scripts), spaces, hyphens, apostrophes
    /^[\p{L}\s'-]+$/u,
    'Name can only contain letters, spaces, hyphens, and apostrophes'
  );

export const PhoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
  .optional();

export const MoneySchema = z
  .number()
  .positive('Amount must be positive')
  .finite('Amount must be a valid number')
  .refine((val) => val <= 1000000, 'Amount cannot exceed $1,000,000');

export const DateSchema = z.string().datetime('Invalid date format');

export const UUIDSchema = z.string().uuid('Invalid UUID format');
