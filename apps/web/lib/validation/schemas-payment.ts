/**
 * Payment, Escrow & Subscription Validation Schemas
 */
import { z } from 'zod';

// Payment Schemas
export const paymentIntentSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(10000, "Amount exceeds maximum (£10,000)")
    .transform((val) => Math.round(val * 100) / 100),
  currency: z.enum(['gbp', 'eur', 'usd']).default('gbp'),
  jobId: z.string().uuid('Invalid job ID'),
  contractorId: z.string().uuid('Invalid contractor ID'),
  metadata: z.object({ description: z.string().max(500).optional() }).optional(),
});

export const paymentMethodSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
  isDefault: z.boolean().default(false),
});

export const refundSchema = z.object({
  paymentIntentId: z.string().regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid payment intent ID'),
  amount: z.number().positive('Amount must be positive').optional(),
  reason: z.string().max(500, 'Reason too long').optional(),
});

// Escrow Schemas
export const releaseEscrowSchema = z.object({
  escrowTransactionId: z.string().uuid('Invalid escrow transaction ID'),
  releaseReason: z.enum(['job_completed', 'dispute_resolved', 'timeout']),
});

export const refundRequestSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  escrowTransactionId: z.string().uuid('Invalid escrow transaction ID'),
  amount: z.number().positive('Amount must be positive').optional(),
  reason: z.string().max(500, 'Reason too long').optional(),
});

// Subscription Schemas
export const createSubscriptionSchema = z.object({
  planType: z.enum(['free', 'basic', 'professional', 'enterprise', 'landlord', 'agency']),
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

// Type exports
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;
export type ReleaseEscrowInput = z.infer<typeof releaseEscrowSchema>;
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
