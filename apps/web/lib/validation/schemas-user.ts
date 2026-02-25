/**
 * User Profile, Admin, Contract, Message, Property & Settings Validation Schemas
 */
import { z } from 'zod';
import { sanitizeText, sanitizeEmail } from '@/lib/sanitizer';

// User Profile Schemas
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name required')
    .max(100, 'First name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'First name contains invalid characters')
    .transform((val) => sanitizeText(val, 100))
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name required')
    .max(100, 'Last name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name contains invalid characters')
    .transform((val) => sanitizeText(val, 100))
    .optional(),
  phone: z
    .string()
    .transform((val) => {
      const stripped = val.replace(/[\s\-()]/g, '');
      if (/^0\d{9,10}$/.test(stripped)) return '+44' + stripped.slice(1);
      return stripped;
    })
    .pipe(z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'))
    .optional(),
  bio: z
    .string()
    .max(1000, 'Bio too long')
    .transform((val) => sanitizeText(val, 1000))
    .optional(),
  profileImageUrl: z.string().url('Invalid profile image URL').optional(),
  address: z
    .string()
    .max(500, 'Address too long')
    .transform((val) => sanitizeText(val, 500))
    .optional(),
  city: z
    .string()
    .max(100, 'City too long')
    .transform((val) => sanitizeText(val, 100))
    .optional(),
  postcode: z
    .string()
    .max(20, 'Postcode too long')
    .transform((val) => sanitizeText(val, 20))
    .optional(),
});

// Common ID Schemas
export const uuidSchema = z.string().uuid('Invalid ID format');
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Admin Schemas
export const adminSettingUpdateSchema = z.object({
  key: z
    .string()
    .min(1, 'Setting key is required')
    .max(255, 'Setting key too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Setting key contains invalid characters'),
  value: z.union([
    z.string().max(10000, 'String value too long'),
    z.number().finite('Number must be finite'),
    z.boolean(),
    z.record(z.any()),
    z.array(z.any()),
  ]),
  oldValue: z.any().optional(),
});

export const adminSettingCreateSchema = z.object({
  key: z
    .string()
    .min(1, 'Setting key is required')
    .max(255, 'Setting key too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Setting key contains invalid characters'),
  value: z.union([
    z.string().max(10000, 'String value too long'),
    z.number().finite('Number must be finite'),
    z.boolean(),
    z.record(z.any()),
    z.array(z.any()),
  ]),
  type: z.enum(['string', 'number', 'boolean', 'json', 'array']),
  category: z.enum(['general', 'email', 'security', 'features', 'payment', 'notifications']),
  description: z.string().max(1000, 'Description too long').optional(),
  isPublic: z.boolean().default(false),
});

// Contract Schemas
export const createContractSchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  title: z.string().min(1, 'Title required').max(255, 'Title too long').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  amount: z.number().positive('Amount must be positive'),
  start_date: z.string().datetime('Invalid start date format').optional(),
  end_date: z.string().datetime('Invalid end date format').optional(),
  terms: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  contractor_company_name: z.string().min(1, 'Company name required').max(255, 'Company name too long'),
  contractor_license_registration: z.string().min(1, 'License registration required').max(100, 'License registration too long'),
  contractor_license_type: z.string().max(100, 'License type too long').optional(),
});

export const updateContractSchema = z.object({
  title: z.string().min(1, 'Title required').max(255, 'Title too long').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  start_date: z.string().datetime('Invalid start date format').optional(),
  end_date: z.string().datetime('Invalid end date format').optional(),
  terms: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

// Message Schemas
export const messageReactionSchema = z.object({
  emoji: z
    .string()
    .min(1, 'Emoji is required')
    .max(10, 'Emoji too long')
    .regex(/^[\p{Emoji}\u200d]+$/u, 'Invalid emoji format'),
});

export const sendMessageSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  receiverId: z.string().uuid('Invalid receiver ID'),
  content: z
    .string()
    .min(1, 'Message content required')
    .max(2000, 'Message too long')
    .transform((val) => sanitizeText(val, 2000)),
  messageType: z.enum(['text', 'image', 'file', 'system']).default('text'),
});

// Notification Schemas
export const notificationEngagementSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID required').max(255, 'Notification ID too long'),
  action: z.enum(['opened', 'clicked', 'dismissed']),
});

// Property Schemas
export const createPropertySchema = z
  .object({
    property_name: z.string().max(255).optional(),
    address: z.string().max(500).optional(),
    address_line1: z.string().max(255).optional(),
    address_line2: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    county: z.string().max(100).optional(),
    postcode: z.string().max(20).optional(),
    country: z.string().max(50).optional(),
    property_type: z.string().min(1, 'Property type is required'),
    is_primary: z.boolean().default(false),
    photos: z.array(z.string().url('Invalid photo URL')).max(20, 'Maximum 20 photos allowed').optional(),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().int().min(0).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.address || data.address_line1, {
    message: 'Address is required (provide address or address_line1)',
  });

export const updatePropertySchema = z.object({
  name: z
    .string()
    .min(1, 'Property name is required')
    .max(255, 'Property name too long')
    .transform((val) => sanitizeText(val.trim(), 255))
    .optional(),
  address: z
    .string()
    .max(500, 'Address too long')
    .transform((val) => sanitizeText(val.trim(), 500))
    .optional(),
  city: z
    .string()
    .max(100, 'City too long')
    .transform((val) => sanitizeText(val.trim(), 100))
    .optional(),
  postcode: z
    .string()
    .max(20, 'Postcode too long')
    .transform((val) => sanitizeText(val.trim(), 20))
    .optional(),
  type: z
    .enum([
      'residential', 'commercial', 'rental', 'house', 'apartment', 'flat',
      'detached', 'semi-detached', 'terraced', 'bungalow', 'cottage', 'other',
    ])
    .optional(),
  bedrooms: z.number().int('Bedrooms must be a whole number').min(0).max(50).optional().nullable(),
  bathrooms: z.number().int('Bathrooms must be a whole number').min(0).max(50).optional().nullable(),
  squareFeet: z.number().positive('Square feet must be positive').max(100000).optional().nullable(),
  yearBuilt: z
    .number()
    .int('Year must be a whole number')
    .min(1600, 'Year built is too old')
    .max(new Date().getFullYear() + 5, 'Year built is in the future')
    .optional()
    .nullable(),
  photos: z.array(z.string().url('Invalid photo URL')).max(20, 'Maximum 20 photos allowed').optional(),
});

export const propertyFavoriteSchema = z.object({
  property_id: z.string().uuid('Invalid property ID'),
});

// User Settings Schemas
export const userSettingsUpdateSchema = z.object({
  notifications: z
    .object({
      email_notifications: z.boolean().optional(),
      push_notifications: z.boolean().optional(),
      sms_notifications: z.boolean().optional(),
      new_jobs: z.boolean().optional(),
      bid_updates: z.boolean().optional(),
      messages: z.boolean().optional(),
      marketing: z.boolean().optional(),
    })
    .optional(),
  privacy: z
    .object({
      profile_visible: z.boolean().optional(),
      show_phone: z.boolean().optional(),
      show_email: z.boolean().optional(),
      show_location: z.boolean().optional(),
    })
    .optional(),
  display: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      language: z.string().max(10, 'Language code too long').optional(),
      timezone: z.string().max(50, 'Timezone too long').optional(),
      date_format: z.string().max(20, 'Date format too long').optional(),
    })
    .optional(),
});

// Type exports
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AdminSettingUpdateInput = z.infer<typeof adminSettingUpdateSchema>;
export type AdminSettingCreateInput = z.infer<typeof adminSettingCreateSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type MessageReactionInput = z.infer<typeof messageReactionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type NotificationEngagementInput = z.infer<typeof notificationEngagementSchema>;
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyFavoriteInput = z.infer<typeof propertyFavoriteSchema>;
export type UserSettingsUpdateInput = z.infer<typeof userSettingsUpdateSchema>;
