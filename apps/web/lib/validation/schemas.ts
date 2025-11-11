/**
 * Input Validation Schemas
 * 
 * Zod schemas for validating all API inputs to prevent
 * injection attacks and ensure data integrity.
 */

import { z } from 'zod';

// ============================================================================
// Auth Schemas
// ============================================================================

export const loginSchema = z.object({
  email: z.string()
    .transform(val => val.toLowerCase().trim())
    .pipe(z.string().email('Invalid email address').max(255, 'Email too long')),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z.string()
    .transform(val => val.toLowerCase().trim())
    .pipe(z.string().email('Invalid email address').max(255, 'Email too long')),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string()
    .min(1, 'First name required')
    .max(100, 'First name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'First name contains invalid characters'),
  lastName: z.string()
    .min(1, 'Last name required')
    .max(100, 'Last name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name contains invalid characters'),
  role: z.enum(['homeowner', 'contractor', 'admin']),
  phone: z.preprocess(
    (val) => {
      if (!val || typeof val !== 'string' || val.trim() === '') {
        return undefined;
      }
      return val.replace(/[\s\-()]/g, ''); // Strip spaces, dashes, and parentheses
    },
    z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number').optional()
  ),
}).refine((data) => {
  // Require phone for homeowners
  if (data.role === 'homeowner' && !data.phone) {
    return false;
  }
  return true;
}, {
  message: 'Phone number is required for homeowners',
  path: ['phone'],
}).refine((data) => {
  // Require @mintenance.co.uk domain for admin
  if (data.role === 'admin' && !data.email.endsWith('@mintenance.co.uk')) {
    return false;
  }
  return true;
}, {
  message: 'Admin accounts must use @mintenance.co.uk email address',
  path: ['email'],
});

export const passwordResetSchema = z.object({
  email: z.string()
    .transform(val => val.toLowerCase().trim())
    .pipe(z.string().email('Invalid email address').max(255, 'Email too long')),
});

export const passwordUpdateSchema = z.object({
  token: z.string()
    .min(1, 'Token required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

// ============================================================================
// Payment Schemas
// ============================================================================

export const paymentIntentSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .max(10000, 'Amount exceeds maximum ($10,000)')
    .transform(val => Math.round(val * 100) / 100), // Round to 2 decimals
  currency: z.enum(['usd', 'eur', 'gbp']).default('usd'),
  jobId: z.string()
    .uuid('Invalid job ID'),
  contractorId: z.string()
    .uuid('Invalid contractor ID'),
  metadata: z.object({
    description: z.string().max(500).optional(),
  }).optional(),
});

export const paymentMethodSchema = z.object({
  userId: z.string()
    .uuid('Invalid user ID'),
  paymentMethodId: z.string()
    .regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
  isDefault: z.boolean().default(false),
});

export const refundSchema = z.object({
  paymentIntentId: z.string()
    .regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid payment intent ID'),
  amount: z.number()
    .positive('Amount must be positive')
    .optional(),
  reason: z.string()
    .max(500, 'Reason too long')
    .optional(),
});

// ============================================================================
// Job Schemas
// ============================================================================

export const createJobSchema = z.object({
  title: z.string()
    .min(1, 'Title required')
    .max(200, 'Title too long')
    .transform(val => val.trim()),
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description too long')
    .transform(val => val.trim()),
  category: z.string()
    .min(1, 'Category required')
    .max(100, 'Category too long'),
  budget: z.number()
    .positive('Budget must be positive')
    .max(1000000, 'Budget exceeds maximum ($1,000,000)')
    .optional(),
  location: z.object({
    address: z.string().max(300),
    city: z.string().max(100),
    state: z.string().max(100),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  images: z.array(
    z.string().url('Invalid image URL')
  ).max(10, 'Maximum 10 images allowed').optional(),
  requiredSkills: z.array(z.string().max(100)).max(10, 'Maximum 10 skills allowed').optional(),
  preferredStartDate: z.string().optional(),
}).refine((data) => {
  // Require at least one photo for jobs over £500
  if (data.budget && data.budget > 500 && (!data.images || data.images.length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'At least one photo is required for jobs over £500',
  path: ['images'],
});

export const updateJobSchema = createJobSchema.partial().extend({
  id: z.string().uuid('Invalid job ID'),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
});

export const jobQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().max(100).optional(),
  minBudget: z.coerce.number().positive().optional(),
  maxBudget: z.coerce.number().positive().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  search: z.string().max(200).optional(),
});

// ============================================================================
// File Upload Schemas
// ============================================================================

export const fileUploadSchema = z.object({
  fileName: z.string()
    .min(1, 'File name required')
    .max(255, 'File name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'File name contains invalid characters'),
  fileType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']),
  fileSize: z.number()
    .positive('File size must be positive')
    .max(10485760, 'File size exceeds 10MB limit'), // 10MB max
  folder: z.string()
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid folder name')
    .optional(),
});

// ============================================================================
// User Profile Schemas
// ============================================================================

export const updateProfileSchema = z.object({
  firstName: z.string()
    .min(1, 'First name required')
    .max(100, 'First name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'First name contains invalid characters')
    .optional(),
  lastName: z.string()
    .min(1, 'Last name required')
    .max(100, 'Last name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name contains invalid characters')
    .optional(),
  phone: z.string()
    .transform(val => val.replace(/[\s\-()]/g, '')) // Strip spaces, dashes, and parentheses
    .pipe(z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'))
    .optional(),
  bio: z.string()
    .max(1000, 'Bio too long')
    .optional(),
  profileImageUrl: z.string()
    .url('Invalid profile image URL')
    .optional(),
});

// ============================================================================
// Common ID Schemas
// ============================================================================

export const uuidSchema = z.string().uuid('Invalid ID format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================================
// GDPR Schemas
// ============================================================================

export const gdprRequestSchema = z.object({
  request_type: z.enum(['access', 'portability', 'rectification', 'erasure', 'restriction', 'objection']),
  notes: z.string().optional()
});

export const gdprEmailSchema = z.object({
  email: z.string().email('Invalid email format')
});

export const gdprAnonymizeSchema = z.object({
  email: z.string().email('Invalid email format'),
  confirmation: z.literal('ANONYMIZE MY DATA')
});

export const gdprDeleteSchema = z.object({
  email: z.string().email('Invalid email format'),
  confirmation: z.literal('DELETE MY DATA')
});

// ============================================================================
// Admin Schemas
// ============================================================================

export const adminSettingUpdateSchema = z.object({
  key: z.string()
    .min(1, 'Setting key is required')
    .max(255, 'Setting key too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Setting key contains invalid characters'),
  value: z.union([
    z.string().max(10000, 'String value too long'),
    z.number().finite('Number must be finite'),
    z.boolean(),
    z.record(z.any()), // JSON object
    z.array(z.any()), // JSON array
  ]),
  oldValue: z.any().optional(),
});

export const adminSettingCreateSchema = z.object({
  key: z.string()
    .min(1, 'Setting key is required')
    .max(255, 'Setting key too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Setting key contains invalid characters'),
  value: z.union([
    z.string().max(10000, 'String value too long'),
    z.number().finite('Number must be finite'),
    z.boolean(),
    z.record(z.any()), // JSON object
    z.array(z.any()), // JSON array
  ]),
  type: z.enum(['string', 'number', 'boolean', 'json', 'array']),
  category: z.enum(['general', 'email', 'security', 'features', 'payment', 'notifications']),
  description: z.string().max(1000, 'Description too long').optional(),
  isPublic: z.boolean().default(false),
});

// ============================================================================
// Type Exports
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type JobQueryInput = z.infer<typeof jobQuerySchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AdminSettingUpdateInput = z.infer<typeof adminSettingUpdateSchema>;
export type AdminSettingCreateInput = z.infer<typeof adminSettingCreateSchema>;

