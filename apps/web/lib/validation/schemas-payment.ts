/**
 * Payment, Escrow & Subscription Validation Schemas
 */
import { z } from 'zod';

// Payment Schemas
export const paymentIntentSchema = z
  .object({
    amount: z
      .number()
      .positive('Amount must be positive')
      .max(10000, 'Amount exceeds maximum (£10,000)')
      .transform((val) => Math.round(val * 100) / 100),
    // GBP-only platform (CLAUDE.md MDC). The escrow_transactions.currency
    // column has a CHECK (currency='gbp') and the edge-fn currency CI guard
    // blocks non-GBP — accepting eur/usd here would let a request set a
    // currency that the rest of the stack rejects downstream.
    currency: z.enum(['gbp']).default('gbp'),
    jobId: z.string().uuid('Invalid job ID'),
    contractorId: z.string().uuid('Invalid contractor ID'),
    // B2 strict rollout (2026-07-16): shipped mobile builds send
    // paymentMethodId from PaymentIntentService.createPaymentIntent. The
    // handler never reads it, but `.strict()` would 400 every mobile payment
    // without this compat key — keep it until those binaries age out.
    paymentMethodId: z
      .string()
      .regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID')
      .optional(),
    metadata: z
      .object({ description: z.string().max(500).optional() })
      .strict()
      .optional(),
  })
  .strict();

export const paymentMethodSchema = z
  .object({
    userId: z.string().uuid('Invalid user ID'),
    paymentMethodId: z
      .string()
      .regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
    isDefault: z.boolean().default(false),
  })
  .strict();

// `.strict()` rejects unknown keys with a 400 — this schema backs admin
// refund flows where extra fields on the request body would be suspicious.
export const refundSchema = z
  .object({
    paymentIntentId: z
      .string()
      .regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid payment intent ID'),
    amount: z.number().positive('Amount must be positive').optional(),
    reason: z.string().max(500, 'Reason too long').optional(),
  })
  .strict();

// Escrow Schemas — admin-only mutation, strict rejects mass-assignment.
export const releaseEscrowSchema = z
  .object({
    escrowTransactionId: z.string().uuid('Invalid escrow transaction ID'),
    releaseReason: z.enum(['job_completed', 'dispute_resolved', 'timeout']),
    adminJustification: z.string().max(500).optional(),
  })
  .strict();

export const refundRequestSchema = z
  .object({
    jobId: z.string().uuid('Invalid job ID'),
    escrowTransactionId: z.string().uuid('Invalid escrow transaction ID'),
    amount: z.number().positive('Amount must be positive').optional(),
    reason: z.string().max(500, 'Reason too long').optional(),
  })
  .strict();

// Subscription Schemas
export const createSubscriptionSchema = z
  .object({
    planType: z.enum([
      'free',
      'basic',
      'professional',
      'enterprise',
      'landlord',
      'agency',
    ]),
    billingCycle: z.enum(['monthly', 'yearly']).optional(),
  })
  .strict();

export const cancelSubscriptionSchema = z
  .object({
    subscriptionId: z.string().uuid('Invalid subscription ID'),
    reason: z.string().max(500, 'Reason too long').optional(),
    cancelAtPeriodEnd: z.boolean().default(true),
  })
  .strict();

export const updateSubscriptionSchema = z
  .object({
    subscriptionId: z.string().uuid('Invalid subscription ID'),
    planType: z.enum(['free', 'basic', 'professional', 'enterprise']),
  })
  .strict();

// Type exports
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;
export type ReleaseEscrowInput = z.infer<typeof releaseEscrowSchema>;
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
