import { z } from 'zod';
import { UUIDSchema, DateSchema, MoneySchema } from './common';

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

const PaymentStatusSchema = z.enum(
  ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
  {
    errorMap: () => ({ message: 'Invalid payment status' }),
  }
);

const PaymentMethodSchema = z.enum(['card', 'bank_transfer', 'escrow'], {
  errorMap: () => ({ message: 'Invalid payment method' }),
});

const PaymentSchema = z.object({
  id: UUIDSchema,
  job_id: UUIDSchema,
  payer_id: UUIDSchema,
  recipient_id: UUIDSchema,
  amount: MoneySchema,
  fee: MoneySchema.default(0),
  net_amount: MoneySchema,
  currency: z
    .string()
    .length(3, 'Currency must be 3 characters')
    .default('USD'),
  method: PaymentMethodSchema,
  status: PaymentStatusSchema.default('pending'),
  stripe_payment_intent_id: z.string().optional(),
  description: z.string().max(500, 'Description too long').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
  completed_at: DateSchema.optional(),
});

const CreatePaymentSchema = z.object({
  job_id: UUIDSchema,
  recipient_id: UUIDSchema,
  amount: MoneySchema,
  method: PaymentMethodSchema,
  description: z.string().max(500, 'Description too long').optional(),
});

// Type exports
type Payment = z.infer<typeof PaymentSchema>;
type CreatePayment = z.infer<typeof CreatePaymentSchema>;
type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
