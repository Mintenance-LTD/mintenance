/**
 * Payment & Escrow API contracts.
 *
 * No sanitization needed — all fields are structured data (UUIDs, numbers, enums).
 */
import { z } from 'zod';

/**
 * SINGLE SOURCE OF TRUTH for the maximum GBP amount a job can be both
 * *posted at* and *paid for*. Unifies the job-budget ceiling
 * (apps/web/lib/validation/schemas-job.ts) with the payment/escrow ceiling
 * (schemas-payment.ts, process-job-payment, create-intent, embedded-checkout)
 * so there is NO path where a job can be created at an amount it cannot be
 * funded for.
 *
 * £100,000 covers the large residential works a UK maintenance marketplace
 * takes a fee on — extensions, rewires, loft conversions, full bathrooms —
 * while staying a realistic hard cap for a card/escrow platform and matching
 * the ABSOLUTE_MAX_PAYMENT data-entry backstop the escrow-funding routes
 * already enforce on the server-authoritative bid amount.
 *
 * DB note: no upper-bound CHECK constraint exists on any amount column
 * (verified 2026-08-05); the ceiling is enforced entirely in this layer.
 */
export const MAX_JOB_PAYMENT_GBP = 100_000;

/** Human-readable ceiling for validation messages, e.g. "£100,000". */
export const MAX_JOB_PAYMENT_GBP_LABEL = `£${MAX_JOB_PAYMENT_GBP.toLocaleString('en-GB')}`;

// ── Request schemas ────────────────────────────────────────────────

export const paymentIntentRequestSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(
      MAX_JOB_PAYMENT_GBP,
      `Amount exceeds maximum (${MAX_JOB_PAYMENT_GBP_LABEL})`
    )
    .transform((val) => Math.round(val * 100) / 100),
  currency: z.enum(['gbp', 'eur', 'usd']).default('gbp'),
  jobId: z.string().uuid('Invalid job ID'),
  contractorId: z.string().uuid('Invalid contractor ID'),
  metadata: z
    .object({ description: z.string().max(500).optional() })
    .optional(),
});

export const paymentMethodSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  paymentMethodId: z
    .string()
    .regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
  isDefault: z.boolean().default(false),
});

export const refundSchema = z.object({
  paymentIntentId: z
    .string()
    .regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid payment intent ID'),
  amount: z.number().positive('Amount must be positive').optional(),
  reason: z.string().max(500, 'Reason too long').optional(),
});

export const releaseEscrowRequestSchema = z.object({
  escrowTransactionId: z.string().uuid('Invalid escrow transaction ID'),
  releaseReason: z.enum(['job_completed', 'dispute_resolved', 'timeout']),
});

export const refundRequestSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  escrowTransactionId: z.string().uuid('Invalid escrow transaction ID'),
  amount: z.number().positive('Amount must be positive').optional(),
  reason: z.string().max(500, 'Reason too long').optional(),
});

export const processJobPaymentRequestSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(
      MAX_JOB_PAYMENT_GBP,
      `Amount exceeds maximum (${MAX_JOB_PAYMENT_GBP_LABEL})`
    ),
  paymentMethodId: z
    .string()
    .regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
  saveForFuture: z.boolean().default(false),
});

// ── Subscription schemas ───────────────────────────────────────────

export const createSubscriptionSchema = z.object({
  planType: z.enum([
    'free',
    'basic',
    'professional',
    'enterprise',
    'landlord',
    'agency',
  ]),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
});

export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid('Invalid subscription ID'),
  reason: z.string().max(500, 'Reason too long').optional(),
  cancelAtPeriodEnd: z.boolean().default(true),
});

export const updateSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid('Invalid subscription ID'),
  planType: z.enum(['free', 'basic', 'professional', 'enterprise']),
});

// ── Response schemas ───────────────────────────────────────────────

export const releaseEscrowResponseSchema = z.object({
  success: z.boolean(),
  transferId: z.string().optional(),
  originalAmount: z.number().optional(),
  platformFee: z.number().optional(),
  contractorAmount: z.number().optional(),
  contractorId: z.string().uuid().optional(),
  releasedAt: z.string().optional(),
  feeTransferId: z.string().uuid().optional().nullable(),
  error: z.string().optional(),
  mfaRequired: z.boolean().optional(),
});

export const processPaymentResponseSchema = z.object({
  success: z.boolean(),
  paymentIntentId: z.string().optional(),
  escrowTransactionId: z.string().uuid().optional(),
  requiresAction: z.boolean().optional(),
  clientSecret: z.string().optional(),
  error: z.string().optional(),
});

// ── Inferred types ─────────────────────────────────────────────────

export type PaymentIntentRequest = z.infer<typeof paymentIntentRequestSchema>;
export type ReleaseEscrowRequest = z.infer<typeof releaseEscrowRequestSchema>;
export type ReleaseEscrowResponse = z.infer<typeof releaseEscrowResponseSchema>;
export type RefundRequest = z.infer<typeof refundRequestSchema>;
export type ProcessJobPaymentRequest = z.infer<
  typeof processJobPaymentRequestSchema
>;
export type ProcessPaymentResponse = z.infer<
  typeof processPaymentResponseSchema
>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
