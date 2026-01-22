/**
 * Bid Validator - Input Validation Layer
 */
import { z } from 'zod';

// Temporary sanitize functions
const sanitize = {
  text: (input: string, maxLength?: number) => {
    if (!input) return '';
    const cleaned = input.trim().replace(/[<>]/g, '');
    return maxLength ? cleaned.substring(0, maxLength) : cleaned;
  },
  proposal: (input: string) => sanitize.text(input, 5000),
};

export const submitBidSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  bidAmount: z.coerce.number()
    .positive('Bid amount must be positive')
    .max(1000000, 'Bid amount too high'),
  proposalText: z.string()
    .min(10, 'Proposal must be at least 10 characters')
    .max(5000, 'Proposal too long')
    .transform(val => sanitize.proposal(val)),
  estimatedDuration: z.coerce.number()
    .positive()
    .max(1000),
  estimatedDurationUnit: z.enum(['hours', 'days', 'weeks', 'months']),
  proposedStartDate: z.string()
    .datetime('Invalid start date format')
    .optional(),
  materialsCost: z.coerce.number()
    .nonnegative()
    .optional(),
  laborCost: z.coerce.number()
    .nonnegative()
    .optional(),
  availability: z.string()
    .max(200)
    .optional()
    .transform(val => val ? sanitize.text(val, 200) : undefined),
  itemizedQuote: z.array(z.object({
    description: z.string().max(200),
    amount: z.number().positive(),
    quantity: z.number().positive().optional(),
    unit: z.string().max(20).optional(),
  })).max(50, 'Too many line items').optional(),
  attachments: z.array(z.string().url()).max(10).optional(),
});

export const updateBidSchema = submitBidSchema.partial().and(z.object({
  // At least one field should be present for update, but simple partial is okay
}));

export class BidValidator {
  /**
   * Validate bid submission data
   */
  validateSubmitBid(data: any) {
    const result = submitBidSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map(
        (e: any) => `${e.path.join('.')}: ${e.message}`
      );
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    return result.data;
  }

  /**
   * Validate bid update data
   */
  validateUpdateBid(data: any) {
    const result = updateBidSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map(
        (e: any) => `${e.path.join('.')}: ${e.message}`
      );
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    return result.data;
  }
}
