/**
 * User profile & settings API contracts.
 *
 * NOTE: No sanitization transforms — web layer applies those on top.
 */
import { z } from 'zod';

// ── Profile schemas ────────────────────────────────────────────────

export const updateProfileRequestSchema = z.object({
  firstName: z.string().min(1, 'First name required').max(100, 'First name too long')
    .regex(/^[a-zA-Z\s\-']+$/, 'First name contains invalid characters').optional(),
  lastName: z.string().min(1, 'Last name required').max(100, 'Last name too long')
    .regex(/^[a-zA-Z\s\-']+$/, 'Last name contains invalid characters').optional(),
  phone: z.string().optional(),
  bio: z.string().max(1000, 'Bio too long').optional(),
  profileImageUrl: z.string().url('Invalid profile image URL').optional(),
  address: z.string().max(500, 'Address too long').optional(),
  city: z.string().max(100, 'City too long').optional(),
  postcode: z.string().max(20, 'Postcode too long').optional(),
});

// ── Settings schemas ───────────────────────────────────────────────

export const userSettingsUpdateSchema = z.object({
  notifications: z.object({
    email_notifications: z.boolean().optional(),
    push_notifications: z.boolean().optional(),
    sms_notifications: z.boolean().optional(),
    new_jobs: z.boolean().optional(),
    bid_updates: z.boolean().optional(),
    messages: z.boolean().optional(),
    marketing: z.boolean().optional(),
  }).optional(),
  privacy: z.object({
    profile_visible: z.boolean().optional(),
    show_phone: z.boolean().optional(),
    show_email: z.boolean().optional(),
    show_location: z.boolean().optional(),
  }).optional(),
  display: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().max(10).optional(),
    timezone: z.string().max(50).optional(),
    date_format: z.string().max(20).optional(),
  }).optional(),
});

// ── Admin schemas ──────────────────────────────────────────────────

export const adminSettingUpdateSchema = z.object({
  key: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/),
  value: z.union([z.string().max(10000), z.number().finite(), z.boolean(), z.record(z.any()), z.array(z.any())]),
  oldValue: z.any().optional(),
});

export const adminSettingCreateSchema = z.object({
  key: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/),
  value: z.union([z.string().max(10000), z.number().finite(), z.boolean(), z.record(z.any()), z.array(z.any())]),
  type: z.enum(['string', 'number', 'boolean', 'json', 'array']),
  category: z.enum(['general', 'email', 'security', 'features', 'payment', 'notifications']),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(false),
});

// ── Inferred types ─────────────────────────────────────────────────

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
export type UserSettingsUpdateInput = z.infer<typeof userSettingsUpdateSchema>;
export type AdminSettingUpdateInput = z.infer<typeof adminSettingUpdateSchema>;
export type AdminSettingCreateInput = z.infer<typeof adminSettingCreateSchema>;
