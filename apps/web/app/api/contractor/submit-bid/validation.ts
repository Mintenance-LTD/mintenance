/**
 * Bid Submission Validation Schema
 *
 * Extracted from route.ts to improve maintainability and reusability.
 */

import { z } from 'zod';
import { sanitizeText } from '@/lib/sanitizer';

/**
 * Validation schema for bid submission
 */
export const submitBidSchema = z.object({
  jobId: z.string().uuid(),
  bidAmount: z.number().positive(),
  proposalText: z
    .string()
    .min(50)
    .max(5000)
    .transform((val) => sanitizeText(val, 5000)),
  estimatedDuration: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }, z.number().int().positive().optional()),
  proposedStartDate: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      return typeof val === 'string' ? val : undefined;
    },
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
  ),
  materialsCost: z.number().nonnegative().optional(),
  laborCost: z.number().nonnegative().optional(),
  // Quote fields with sanitization
  // 2026-05-23 audit-14: room-scoped quote support — mobile contractors
  // can flip a line item to "Per m²" and attach a `room_id` from the
  // job's frozen room snapshot. Without these fields in the schema,
  // Zod silently strips them and the persisted contractor_quotes row
  // loses the room-level pricing context. `unit` is constrained to
  // 'item' | 'sqm'; `room_id` is a UUID or null (mobile sends null
  // when the contractor explicitly clears a room).
  lineItems: z
    .array(
      z.object({
        description: z.string().transform((val) => sanitizeText(val, 500)),
        type: z.enum(['labor', 'material', 'equipment']).default('labor'),
        quantity: z.number().nonnegative(),
        unitPrice: z.number().nonnegative(),
        total: z.number().nonnegative(),
        unit: z.enum(['item', 'sqm']).optional(),
        room_id: z.string().uuid().nullable().optional(),
      })
    )
    .optional(),
  subtotal: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().positive().optional(),
  terms: z
    .string()
    .max(2000)
    .optional()
    .transform((val) => (val ? sanitizeText(val, 2000) : val)),
});

/**
 * Type inference from schema
 */
export type SubmitBidInput = z.infer<typeof submitBidSchema>;
