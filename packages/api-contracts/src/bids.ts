/**
 * Bid API contracts.
 */
import { z } from 'zod';

// ── Request schemas ────────────────────────────────────────────────

export const submitBidRequestSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  amount: z.number().positive('Bid amount must be positive'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description too long'),
  estimated_duration_days: z.number().int().positive().optional(),
  materials_included: z.boolean().optional(),
  warranty_months: z.number().int().min(0).optional(),
});

export const bidQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(20),
  status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn']).optional(),
  jobId: z.string().uuid().optional(),
});

// ── Response schemas ───────────────────────────────────────────────

const bidSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  contractor_id: z.string().uuid(),
  amount: z.number(),
  description: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn']),
  estimated_duration_days: z.number().optional().nullable(),
  materials_included: z.boolean().optional().nullable(),
  warranty_months: z.number().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  contractor: z.object({
    id: z.string().uuid(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    rating: z.number().optional().nullable(),
    reviews_count: z.number().optional().nullable(),
    profile_picture: z.string().optional().nullable(),
  }).optional(),
  job: z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().optional(),
    budget: z.number().optional().nullable(),
    category: z.string().optional(),
    status: z.string(),
    location: z.string().optional().nullable(),
    created_at: z.string(),
  }).optional(),
}).passthrough();

export const bidResponseSchema = z.object({
  bid: bidSchema,
});

export const bidListResponseSchema = z.object({
  bids: z.array(bidSchema),
  nextCursor: z.string().optional(),
});

// ── Inferred types ─────────────────────────────────────────────────

export type SubmitBidRequest = z.infer<typeof submitBidRequestSchema>;
export type BidQueryInput = z.infer<typeof bidQuerySchema>;
export type BidResponse = z.infer<typeof bidResponseSchema>;
export type BidListResponse = z.infer<typeof bidListResponseSchema>;
export type Bid = z.infer<typeof bidSchema>;
