/**
 * Job, File Upload & Analysis Validation Schemas
 */
import { z } from 'zod';
import { sanitizeText } from '@/lib/sanitizer';

// Job Schemas
const baseJobSchema = z.object({
  title: z
    .string()
    .min(1, 'Title required')
    .max(200, 'Title too long')
    .transform((val) => val.trim()),
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description too long')
    .transform((val) => val.trim()),
  category: z.string().min(1, 'Category required').max(100, 'Category too long'),
  urgency: z.enum(['low', 'medium', 'high', 'emergency']).optional(),
  budget: z
    .number()
    .positive('Budget must be positive')
    .max(1000000, "Budget exceeds maximum (£1,000,000)")
    .optional(),
  location: z
    .object({
      address: z.string().max(300),
      city: z.string().max(100),
      county: z.string().max(100),
      postcode: z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, 'Invalid UK postcode'),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  images: z.array(z.string().url('Invalid image URL')).max(10, 'Maximum 10 images allowed').optional(),
  requiredSkills: z.array(z.string().max(100)).max(10, 'Maximum 10 skills allowed').optional(),
  preferredStartDate: z.string().optional(),
});

export const createJobSchema = baseJobSchema.refine(
  (data) => !(data.budget && data.budget > 500 && (!data.images || data.images.length === 0)),
  { message: 'At least one photo is required for jobs over £500', path: ['images'] },
);

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

// File Upload Schema
export const fileUploadSchema = z.object({
  fileName: z
    .string()
    .min(1, 'File name required')
    .max(255, 'File name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'File name contains invalid characters'),
  fileType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']),
  fileSize: z.number().positive('File size must be positive').max(10485760, 'File size exceeds 10MB limit'),
  folder: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid folder name')
    .optional(),
});

// Job Analysis Schema
export const jobAnalysisSchema = z
  .object({
    title: z
      .string()
      .max(200, 'Title too long')
      .transform((val) => sanitizeText(val, 200))
      .optional(),
    description: z
      .string()
      .max(5000, 'Description too long')
      .transform((val) => sanitizeText(val, 5000))
      .optional(),
    location: z
      .string()
      .max(256, 'Location too long')
      .transform((val) => sanitizeText(val, 256))
      .optional(),
    imageUrls: z.array(z.string().url('Invalid image URL')).max(10, 'Maximum 10 images allowed').optional(),
  })
  .refine((data) => !!(data.title || data.description || (data.imageUrls && data.imageUrls.length > 0)), {
    message: 'Title, description, or image URLs are required',
  });

// Match & Location Schemas
export const matchCommunicationSchema = z.object({
  contractorId: z.string().uuid('Invalid contractor ID'),
});

export const enableLocationSharingSchema = z.object({
  enabled: z.boolean().default(true),
});

// Type exports
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type JobQueryInput = z.infer<typeof jobQuerySchema>;
export type JobAnalysisInput = z.infer<typeof jobAnalysisSchema>;
export type MatchCommunicationInput = z.infer<typeof matchCommunicationSchema>;
export type EnableLocationSharingInput = z.infer<typeof enableLocationSharingSchema>;
