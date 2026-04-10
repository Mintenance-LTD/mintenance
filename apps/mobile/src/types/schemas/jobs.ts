import { z } from 'zod';
import { BUSINESS_RULES } from '@mintenance/shared';
import { UUIDSchema, DateSchema, MoneySchema } from './common';

// ============================================================================
// JOB SCHEMAS
// ============================================================================

export const JobCategorySchema = z.enum(
  [
    'plumbing',
    'electrical',
    'hvac',
    'carpentry',
    'painting',
    'landscaping',
    'cleaning',
    'appliance_repair',
    'roofing',
    'flooring',
    'other',
  ],
  {
    errorMap: () => ({ message: 'Invalid job category' }),
  }
);

const JobPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  errorMap: () => ({
    message: 'Priority must be low, medium, high, or urgent',
  }),
});

const JobStatusSchema = z.enum(
  ['draft', 'posted', 'in_progress', 'completed', 'cancelled', 'disputed'],
  {
    errorMap: () => ({ message: 'Invalid job status' }),
  }
);

const JobSchema = z.object({
  id: UUIDSchema,
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  category: JobCategorySchema,
  priority: JobPrioritySchema,
  status: JobStatusSchema.default('draft'),
  budget: MoneySchema,
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z
      .string()
      .min(2, 'State is required')
      .max(2, 'State must be 2 characters'),
    zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
  photos: z
    .array(z.string().url('Invalid photo URL'))
    .max(
      BUSINESS_RULES.MAX_PHOTOS_PER_JOB,
      `Maximum ${BUSINESS_RULES.MAX_PHOTOS_PER_JOB} photos allowed`
    ),
  requirements: z.array(z.string()).optional(),
  preferred_start_date: DateSchema.optional(),
  estimated_duration: z.string().optional(),
  homeowner_id: UUIDSchema,
  contractor_id: UUIDSchema.optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
  completed_at: DateSchema.optional(),
});

const CreateJobSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  category: JobCategorySchema,
  priority: JobPrioritySchema,
  budget: MoneySchema,
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z
      .string()
      .min(2, 'State is required')
      .max(2, 'State must be 2 characters'),
    zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
  }),
  photos: z
    .array(z.string().url('Invalid photo URL'))
    .max(
      BUSINESS_RULES.MAX_PHOTOS_PER_JOB,
      `Maximum ${BUSINESS_RULES.MAX_PHOTOS_PER_JOB} photos allowed`
    )
    .default([]),
  requirements: z.array(z.string()).optional(),
  preferred_start_date: DateSchema.optional(),
  estimated_duration: z.string().optional(),
  homeownerId: UUIDSchema,
});

const UpdateJobSchema = JobSchema.partial().omit({
  id: true,
  homeowner_id: true,
  created_at: true,
  updated_at: true,
});

const JobFilterSchema = z.object({
  category: JobCategorySchema.optional(),
  priority: JobPrioritySchema.optional(),
  status: JobStatusSchema.optional(),
  budget_min: MoneySchema.optional(),
  budget_max: MoneySchema.optional(),
  location_radius: z.number().min(1).max(100).optional(),
  date_from: DateSchema.optional(),
  date_to: DateSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
});

// ============================================================================
// BID SCHEMAS
// ============================================================================

const BidStatusSchema = z.enum(
  ['pending', 'accepted', 'rejected', 'withdrawn', 'expired'],
  {
    errorMap: () => ({ message: 'Invalid bid status' }),
  }
);

const BidSchema = z.object({
  id: UUIDSchema,
  job_id: UUIDSchema,
  contractor_id: UUIDSchema,
  amount: MoneySchema,
  estimated_duration: z.string().min(1, 'Estimated duration is required'),
  proposal: z
    .string()
    .min(20, 'Proposal must be at least 20 characters')
    .max(1000, 'Proposal must be less than 1000 characters'),
  status: BidStatusSchema.default('pending'),
  materials_cost: MoneySchema.optional(),
  labor_cost: MoneySchema.optional(),
  timeline: z
    .object({
      start_date: DateSchema,
      end_date: DateSchema,
      milestones: z
        .array(
          z.object({
            description: z.string().min(1, 'Milestone description required'),
            date: DateSchema,
            amount: MoneySchema.optional(),
          })
        )
        .optional(),
    })
    .optional(),
  attachments: z
    .array(z.string().url('Invalid attachment URL'))
    .max(5, 'Maximum 5 attachments')
    .optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
  expires_at: DateSchema.optional(),
});

const CreateBidSchema = z.object({
  job_id: UUIDSchema,
  amount: MoneySchema,
  estimated_duration: z.string().min(1, 'Estimated duration is required'),
  proposal: z
    .string()
    .min(20, 'Proposal must be at least 20 characters')
    .max(1000, 'Proposal must be less than 1000 characters'),
  materials_cost: MoneySchema.optional(),
  labor_cost: MoneySchema.optional(),
  timeline: z
    .object({
      start_date: DateSchema,
      end_date: DateSchema,
      milestones: z
        .array(
          z.object({
            description: z.string().min(1, 'Milestone description required'),
            date: DateSchema,
            amount: MoneySchema.optional(),
          })
        )
        .optional(),
    })
    .optional(),
  attachments: z
    .array(z.string().url('Invalid attachment URL'))
    .max(5, 'Maximum 5 attachments')
    .optional(),
});

// Type exports
type Job = z.infer<typeof JobSchema>;
type CreateJob = z.infer<typeof CreateJobSchema>;
type UpdateJob = z.infer<typeof UpdateJobSchema>;
type JobFilter = z.infer<typeof JobFilterSchema>;
export type JobCategory = z.infer<typeof JobCategorySchema>;
type JobPriority = z.infer<typeof JobPrioritySchema>;
type JobStatus = z.infer<typeof JobStatusSchema>;

type Bid = z.infer<typeof BidSchema>;
type CreateBid = z.infer<typeof CreateBidSchema>;
type BidStatus = z.infer<typeof BidStatusSchema>;
