/**
 * Input Validation Schemas
 *
 * Zod schemas for validating all API inputs to prevent
 * injection attacks and ensure data integrity.
 */

import { z } from 'zod';
import { sanitizeText, sanitizeEmail } from '@/lib/sanitizer';

// ============================================================================
// Auth Schemas
// ============================================================================

export const loginSchema = z.object({
  email: z.string()
    .transform(val => sanitizeEmail(val)),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z.string()
    .transform(val => sanitizeEmail(val)),
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
    .regex(/^[a-zA-Z\s-']+$/, 'First name contains invalid characters')
    .transform(val => sanitizeText(val, 100)),
  lastName: z.string()
    .min(1, 'Last name required')
    .max(100, 'Last name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name contains invalid characters')
    .transform(val => sanitizeText(val, 100)),
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
    .transform(val => sanitizeEmail(val)),
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
    .max(10000, 'Amount exceeds maximum (£10,000)')
    .transform(val => Math.round(val * 100) / 100), // Round to 2 decimals
  currency: z.enum(['gbp', 'eur', 'usd']).default('gbp'),
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

const baseJobSchema = z.object({
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
  urgency: z.enum(['low', 'medium', 'high', 'emergency']).optional(),
  budget: z.number()
    .positive('Budget must be positive')
    .max(1000000, 'Budget exceeds maximum (£1,000,000)')
    .optional(),
  location: z.object({
    address: z.string().max(300),
    city: z.string().max(100),
    county: z.string().max(100),
    postcode: z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, 'Invalid UK postcode'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  images: z.array(
    z.string().url('Invalid image URL')
  ).max(10, 'Maximum 10 images allowed').optional(),
  requiredSkills: z.array(z.string().max(100)).max(10, 'Maximum 10 skills allowed').optional(),
  preferredStartDate: z.string().optional(),
});

export const createJobSchema = baseJobSchema.refine((data) => {
  // Require at least one photo for jobs over £500
  if (data.budget && data.budget > 500 && (!data.images || data.images.length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'At least one photo is required for jobs over £500',
  path: ['images'],
});

export const updateJobSchema = baseJobSchema.partial().extend({
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
    .transform(val => sanitizeText(val, 100))
    .optional(),
  lastName: z.string()
    .min(1, 'Last name required')
    .max(100, 'Last name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name contains invalid characters')
    .transform(val => sanitizeText(val, 100))
    .optional(),
  phone: z.string()
    .transform(val => val.replace(/[\s\-()]/g, '')) // Strip spaces, dashes, and parentheses
    .pipe(z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'))
    .optional(),
  bio: z.string()
    .max(1000, 'Bio too long')
    .transform(val => sanitizeText(val, 1000))
    .optional(),
  profileImageUrl: z.string()
    .url('Invalid profile image URL')
    .optional(),
  address: z.string()
    .max(500, 'Address too long')
    .transform(val => sanitizeText(val, 500))
    .optional(),
  city: z.string()
    .max(100, 'City too long')
    .transform(val => sanitizeText(val, 100))
    .optional(),
  postcode: z.string()
    .max(20, 'Postcode too long')
    .transform(val => sanitizeText(val, 20))
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
// Escrow Schemas
// ============================================================================

export const releaseEscrowSchema = z.object({
  escrowTransactionId: z.string()
    .uuid('Invalid escrow transaction ID'),
  releaseReason: z.enum(['job_completed', 'dispute_resolved', 'timeout']),
});

export const refundRequestSchema = z.object({
  jobId: z.string()
    .uuid('Invalid job ID'),
  escrowTransactionId: z.string()
    .uuid('Invalid escrow transaction ID'),
  amount: z.number()
    .positive('Amount must be positive')
    .optional(),
  reason: z.string()
    .max(500, 'Reason too long')
    .optional(),
});

// ============================================================================
// Subscription Schemas
// ============================================================================

export const createSubscriptionSchema = z.object({
  planType: z.enum(['free', 'basic', 'professional', 'enterprise']),
});

export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string()
    .uuid('Invalid subscription ID'),
  reason: z.string()
    .max(500, 'Reason too long')
    .optional(),
  cancelAtPeriodEnd: z.boolean().default(true),
});

export const updateSubscriptionSchema = z.object({
  subscriptionId: z.string()
    .uuid('Invalid subscription ID'),
  planType: z.enum(['free', 'basic', 'professional', 'enterprise']),
});

// ============================================================================
// Contract Schemas
// ============================================================================

export const createContractSchema = z.object({
  job_id: z.string()
    .uuid('Invalid job ID'),
  title: z.string()
    .min(1, 'Title required')
    .max(255, 'Title too long')
    .optional(),
  description: z.string()
    .max(5000, 'Description too long')
    .optional(),
  amount: z.number()
    .positive('Amount must be positive'),
  start_date: z.string()
    .datetime('Invalid start date format')
    .optional(),
  end_date: z.string()
    .datetime('Invalid end date format')
    .optional(),
  terms: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
  contractor_company_name: z.string()
    .min(1, 'Company name required')
    .max(255, 'Company name too long'),
  contractor_license_registration: z.string()
    .min(1, 'License registration required')
    .max(100, 'License registration too long'),
  contractor_license_type: z.string()
    .max(100, 'License type too long')
    .optional(),
});

export const updateContractSchema = z.object({
  title: z.string()
    .min(1, 'Title required')
    .max(255, 'Title too long')
    .optional(),
  description: z.string()
    .max(5000, 'Description too long')
    .optional(),
  amount: z.number()
    .positive('Amount must be positive')
    .optional(),
  start_date: z.string()
    .datetime('Invalid start date format')
    .optional(),
  end_date: z.string()
    .datetime('Invalid end date format')
    .optional(),
  terms: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

// ============================================================================
// Message Schemas
// ============================================================================

export const messageReactionSchema = z.object({
  emoji: z.string()
    .min(1, 'Emoji is required')
    .max(10, 'Emoji too long')
    .regex(/^[\p{Emoji}\u200d]+$/u, 'Invalid emoji format'),
});

export const sendMessageSchema = z.object({
  jobId: z.string()
    .uuid('Invalid job ID'),
  receiverId: z.string()
    .uuid('Invalid receiver ID'),
  content: z.string()
    .min(1, 'Message content required')
    .max(2000, 'Message too long')
    .transform(val => sanitizeText(val, 2000)),
  messageType: z.enum(['text', 'image', 'file', 'system']).default('text'),
});

// ============================================================================
// Notification Schemas
// ============================================================================

export const notificationEngagementSchema = z.object({
  notificationId: z.string()
    .min(1, 'Notification ID required')
    .max(255, 'Notification ID too long'),
  action: z.enum(['opened', 'clicked', 'dismissed']),
});

// ============================================================================
// Building Surveyor Schemas
// ============================================================================

export const buildingAssessRequestSchema = z.object({
  imageUrls: z.array(z.string().url('Invalid image URL'))
    .min(1, 'At least one image required')
    .max(4, 'Maximum 4 images allowed'),
  jobId: z.string()
    .uuid('Invalid job ID')
    .optional(),
  propertyId: z.string()
    .uuid('Invalid property ID')
    .optional(),
  domain: z.enum(['building', 'rail', 'infrastructure', 'general'])
    .optional(),
  context: z.object({
    location: z.string().max(200).optional(),
    propertyType: z.enum(['residential', 'commercial', 'industrial']).optional(),
    ageOfProperty: z.number().int().positive().max(500).optional(),
    propertyDetails: z.string().max(1000).optional(),
  }).optional(),
});

export const buildingCorrectionSchema = z.object({
  assessmentId: z.string()
    .uuid('Invalid assessment ID'),
  imageUrl: z.string()
    .url('Invalid image URL'),
  imageIndex: z.number()
    .int()
    .min(0)
    .optional(),
  // Using z.any() for detection arrays to match the flexible RoboflowDetection/CorrectedDetection types
  originalDetections: z.array(z.any()),
  correctedDetections: z.array(z.any()),
  correctionsMade: z.object({
    added: z.array(z.any()).optional(),
    removed: z.array(z.any()).optional(),
    adjusted: z.array(z.any()).optional(),
    classChanged: z.array(z.any()).optional(),
  }).optional(),
  correctionQuality: z.enum(['expert', 'verified', 'user']).optional(),
});

// ============================================================================
// Maintenance Schemas
// ============================================================================

export const maintenanceDetectSchema = z.object({
  description: z.string()
    .max(2000, 'Description too long')
    .transform(val => sanitizeText(val, 2000))
    .optional()
    .default(''),
  urgency: z.enum(['low', 'normal', 'urgent', 'emergency'])
    .default('normal'),
});

export const maintenanceFeedbackSchema = z.object({
  assessmentId: z.string()
    .uuid('Invalid assessment ID'),
  wasAccurate: z.boolean(),
  actualIssue: z.string()
    .max(200, 'Issue description too long')
    .optional(),
  actualSeverity: z.enum(['minor', 'moderate', 'major', 'critical'])
    .optional(),
  actualTimeHours: z.number()
    .min(0, 'Time must be non-negative')
    .max(100, 'Time exceeds maximum')
    .optional(),
  actualMaterials: z.array(z.string().max(200))
    .max(50, 'Maximum 50 materials')
    .optional(),
  contractorNotes: z.string()
    .max(1000, 'Notes too long')
    .optional(),
  helpfulnessScore: z.number()
    .int()
    .min(1, 'Score must be at least 1')
    .max(5, 'Score must be at most 5')
    .optional(),
});

// ============================================================================
// Contractor Schemas
// ============================================================================

export const contractorInvoiceLineItemSchema = z.object({
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description too long')
    .transform(val => sanitizeText(val, 500)),
  quantity: z.number()
    .positive('Quantity must be positive'),
  unit_price: z.number()
    .min(0, 'Unit price cannot be negative'),
  amount: z.number()
    .optional(),
});

export const createInvoiceSchema = z.object({
  jobId: z.string().uuid('Invalid job ID').optional(),
  quoteId: z.string().uuid('Invalid quote ID').optional(),
  clientName: z.string()
    .min(1, 'Client name is required')
    .max(200, 'Client name too long')
    .transform(val => sanitizeText(val, 200)),
  clientEmail: z.string()
    .transform(val => sanitizeEmail(val)),
  clientPhone: z.string()
    .max(20, 'Phone number too long')
    .optional(),
  clientAddress: z.string()
    .max(500, 'Address too long')
    .transform(val => sanitizeText(val, 500))
    .optional(),
  title: z.string()
    .min(1, 'Invoice title is required')
    .max(200, 'Title too long')
    .transform(val => sanitizeText(val, 200)),
  description: z.string()
    .max(2000, 'Description too long')
    .optional(),
  lineItems: z.array(contractorInvoiceLineItemSchema)
    .min(1, 'At least one line item is required'),
  taxRate: z.number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .default(20),
  paymentTerms: z.string()
    .max(500, 'Payment terms too long')
    .default('Payment due within 30 days')
    .transform(val => sanitizeText(val, 500)),
  notes: z.string()
    .max(2000, 'Notes too long')
    .optional(),
  dueDate: z.string().optional(),
  status: z.enum(['draft', 'sent']).default('draft'),
});

export const updateInvoiceSchema = z.object({
  title: z.string()
    .min(1, 'Title required')
    .max(200, 'Title too long')
    .transform(val => sanitizeText(val, 200))
    .optional(),
  description: z.string()
    .max(2000, 'Description too long')
    .optional(),
  lineItems: z.array(contractorInvoiceLineItemSchema)
    .min(1, 'At least one line item is required')
    .optional(),
  taxRate: z.number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .optional(),
  paymentTerms: z.string()
    .max(500, 'Payment terms too long')
    .transform(val => sanitizeText(val, 500))
    .optional(),
  notes: z.string()
    .max(2000, 'Notes too long')
    .optional(),
  dueDate: z.string().optional(),
  status: z.enum(['draft', 'sent']).optional(),
  clientName: z.string()
    .min(1, 'Client name is required')
    .max(200, 'Client name too long')
    .transform(val => sanitizeText(val, 200))
    .optional(),
  clientEmail: z.string()
    .transform(val => sanitizeEmail(val))
    .optional(),
  clientAddress: z.string()
    .max(500, 'Address too long')
    .transform(val => sanitizeText(val, 500))
    .optional(),
});

// ============================================================================
// Job Analysis Schemas
// ============================================================================

export const jobAnalysisSchema = z.object({
  title: z.string()
    .max(200, 'Title too long')
    .transform(val => sanitizeText(val, 200))
    .optional(),
  description: z.string()
    .max(5000, 'Description too long')
    .transform(val => sanitizeText(val, 5000))
    .optional(),
  location: z.string()
    .max(256, 'Location too long')
    .transform(val => sanitizeText(val, 256))
    .optional(),
  imageUrls: z.array(
    z.string().url('Invalid image URL')
  ).max(10, 'Maximum 10 images allowed').optional(),
}).refine((data) => {
  return !!(data.title || data.description || (data.imageUrls && data.imageUrls.length > 0));
}, {
  message: 'Title, description, or image URLs are required',
});

// ============================================================================
// Match Communication Schemas
// ============================================================================

export const matchCommunicationSchema = z.object({
  contractorId: z.string()
    .uuid('Invalid contractor ID'),
});

// ============================================================================
// Location Sharing Schemas
// ============================================================================

export const enableLocationSharingSchema = z.object({
  enabled: z.boolean().default(true),
});

// ============================================================================
// Property Schemas
// ============================================================================

export const createPropertySchema = z.object({
  property_name: z.string()
    .min(1, 'Property name is required')
    .max(255, 'Property name too long')
    .transform(val => sanitizeText(val.trim(), 255)),
  address: z.string()
    .min(1, 'Address is required')
    .max(500, 'Address too long')
    .transform(val => sanitizeText(val.trim(), 500)),
  property_type: z.enum(['residential', 'commercial', 'rental'], {
    errorMap: () => ({ message: 'Valid property type is required (residential, commercial, or rental)' }),
  }),
  is_primary: z.boolean().default(false),
  photos: z.array(
    z.string().url('Invalid photo URL')
  ).max(20, 'Maximum 20 photos allowed').optional(),
});

export const updatePropertySchema = z.object({
  name: z.string()
    .min(1, 'Property name is required')
    .max(255, 'Property name too long')
    .transform(val => sanitizeText(val.trim(), 255))
    .optional(),
  address: z.string()
    .max(500, 'Address too long')
    .transform(val => sanitizeText(val.trim(), 500))
    .optional(),
  city: z.string()
    .max(100, 'City too long')
    .transform(val => sanitizeText(val.trim(), 100))
    .optional(),
  postcode: z.string()
    .max(20, 'Postcode too long')
    .transform(val => sanitizeText(val.trim(), 20))
    .optional(),
  type: z.enum(['residential', 'commercial', 'rental', 'house', 'apartment', 'flat', 'detached', 'semi-detached', 'terraced', 'bungalow', 'cottage', 'other'])
    .optional(),
  bedrooms: z.number()
    .int('Bedrooms must be a whole number')
    .min(0, 'Bedrooms cannot be negative')
    .max(50, 'Bedrooms exceeds maximum')
    .optional()
    .nullable(),
  bathrooms: z.number()
    .int('Bathrooms must be a whole number')
    .min(0, 'Bathrooms cannot be negative')
    .max(50, 'Bathrooms exceeds maximum')
    .optional()
    .nullable(),
  squareFeet: z.number()
    .positive('Square feet must be positive')
    .max(100000, 'Square feet exceeds maximum')
    .optional()
    .nullable(),
  yearBuilt: z.number()
    .int('Year must be a whole number')
    .min(1600, 'Year built is too old')
    .max(new Date().getFullYear() + 5, 'Year built is in the future')
    .optional()
    .nullable(),
  photos: z.array(
    z.string().url('Invalid photo URL')
  ).max(20, 'Maximum 20 photos allowed').optional(),
});

export const propertyFavoriteSchema = z.object({
  property_id: z.string()
    .uuid('Invalid property ID'),
});

// ============================================================================
// User Settings Schemas
// ============================================================================

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
    language: z.string().max(10, 'Language code too long').optional(),
    timezone: z.string().max(50, 'Timezone too long').optional(),
    date_format: z.string().max(20, 'Date format too long').optional(),
  }).optional(),
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
export type ReleaseEscrowInput = z.infer<typeof releaseEscrowSchema>;
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type MessageReactionInput = z.infer<typeof messageReactionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type NotificationEngagementInput = z.infer<typeof notificationEngagementSchema>;
export type BuildingAssessRequestInput = z.infer<typeof buildingAssessRequestSchema>;
export type BuildingCorrectionInput = z.infer<typeof buildingCorrectionSchema>;
export type MaintenanceDetectInput = z.infer<typeof maintenanceDetectSchema>;
export type MaintenanceFeedbackInput = z.infer<typeof maintenanceFeedbackSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type JobAnalysisInput = z.infer<typeof jobAnalysisSchema>;
export type MatchCommunicationInput = z.infer<typeof matchCommunicationSchema>;
export type EnableLocationSharingInput = z.infer<typeof enableLocationSharingSchema>;
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyFavoriteInput = z.infer<typeof propertyFavoriteSchema>;
export type UserSettingsUpdateInput = z.infer<typeof userSettingsUpdateSchema>;

