/**
 * Job API contracts.
 */
import { z } from 'zod';

// ── Constants ──────────────────────────────────────────────────────

export const JOB_CATEGORIES = [
  'plumbing', 'electrical', 'hvac', 'general', 'appliance', 'landscaping',
  'roofing', 'painting', 'carpentry', 'cleaning', 'flooring', 'tiling',
  'plastering', 'guttering', 'fencing', 'damp', 'pest_control', 'other',
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

// ── Request schemas ────────────────────────────────────────────────

const locationSchema = z.object({
  address: z.string().max(300),
  city: z.string().max(100),
  county: z.string().max(100),
  postcode: z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, 'Invalid UK postcode'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).optional();

const baseJobSchema = z.object({
  title: z.string().min(1, 'Title required').max(200, 'Title too long'),
  description: z.string().min(50, 'Description must be at least 50 characters').max(5000, 'Description too long'),
  category: z.string().min(1, 'Category required').max(100, 'Category too long'),
  urgency: z.enum(['low', 'medium', 'high', 'emergency']).optional(),
  budget: z.number().positive('Budget must be positive').max(1_000_000, 'Budget exceeds maximum').optional(),
  location: locationSchema,
  images: z.array(z.string().url('Invalid image URL')).max(10, 'Maximum 10 images allowed').optional(),
  requiredSkills: z.array(z.string().max(100)).max(10, 'Maximum 10 skills allowed').optional(),
  preferredStartDate: z.string().optional(),
});

export const createJobRequestSchema = baseJobSchema.refine(
  (data) => !(data.budget && data.budget > 500 && (!data.images || data.images.length === 0)),
  { message: 'At least one photo is required for jobs over £500', path: ['images'] },
);

export const updateJobRequestSchema = baseJobSchema.partial().extend({
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

// ── File upload ────────────────────────────────────────────────────

export const fileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name required').max(255, 'File name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'File name contains invalid characters'),
  fileType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']),
  fileSize: z.number().positive('File size must be positive').max(10_485_760, 'File size exceeds 10MB limit'),
  folder: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid folder name').optional(),
});

// ── Job analysis ───────────────────────────────────────────────────

export const jobAnalysisRequestSchema = z
  .object({
    title: z.string().max(200, 'Title too long').optional(),
    description: z.string().max(5000, 'Description too long').optional(),
    location: z.string().max(256, 'Location too long').optional(),
    imageUrls: z.array(z.string().url('Invalid image URL')).max(10, 'Maximum 10 images allowed').optional(),
  })
  .refine((data) => !!(data.title || data.description || (data.imageUrls && data.imageUrls.length > 0)), {
    message: 'Title, description, or image URLs are required',
  });

// ── Misc job schemas ───────────────────────────────────────────────

export const matchCommunicationSchema = z.object({
  contractorId: z.string().uuid('Invalid contractor ID'),
});

export const enableLocationSharingSchema = z.object({
  enabled: z.boolean().default(true),
});

// ── Response schemas ───────────────────────────────────────────────

export const jobResponseSchema = z.object({
  job: z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().optional(),
    status: z.string(),
    category: z.string().optional(),
    budget: z.number().optional(),
    location: z.unknown().optional(),
    homeowner_id: z.string().uuid(),
    contractor_id: z.string().uuid().optional().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }).passthrough(),
});

export const jobListResponseSchema = z.object({
  jobs: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    category: z.string().optional(),
    budget: z.number().optional(),
    created_at: z.string(),
  }).passthrough()),
  nextCursor: z.string().optional(),
});

// ── Inferred types ─────────────────────────────────────────────────

export type CreateJobRequest = z.infer<typeof createJobRequestSchema>;
export type UpdateJobRequest = z.infer<typeof updateJobRequestSchema>;
export type JobQueryInput = z.infer<typeof jobQuerySchema>;
export type JobResponse = z.infer<typeof jobResponseSchema>;
export type JobListResponse = z.infer<typeof jobListResponseSchema>;
export type JobAnalysisRequest = z.infer<typeof jobAnalysisRequestSchema>;
