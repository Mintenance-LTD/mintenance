/**
 * Bid Submission Validation Schema
 * 
 * Extracted from route.ts to improve maintainability and reusability.
 */

import { z } from 'zod';

/**
 * Validation schema for bid submission
 */
export const submitBidSchema = z.object({
  jobId: z.string().uuid(),
  bidAmount: z.number().positive(),
  proposalText: z.string().min(50).max(5000),
  estimatedDuration: z.number().int().positive().optional(),
  proposedStartDate: z.string().optional(),
  materialsCost: z.number().nonnegative().optional(),
  laborCost: z.number().nonnegative().optional(),
  // Quote fields
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().nonnegative(),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative(),
  })).optional(),
  subtotal: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().positive().optional(),
  terms: z.string().max(2000).optional(),
});

/**
 * Type inference from schema
 */
export type SubmitBidInput = z.infer<typeof submitBidSchema>;

