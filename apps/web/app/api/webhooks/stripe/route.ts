import { NextRequest } from 'next/server';
import { StripeWebhookService } from '@/lib/services/stripe-webhook/stripe-webhook-service';

export const runtime = 'nodejs';

/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events with signature verification for security.
 *
 * Security features:
 * - Signature verification (prevents replay attacks and tampering)
 * - Rate limiting (prevents DOS attacks)
 * - Idempotency (prevents duplicate processing)
 * - Comprehensive logging and error handling
 *
 * Supported events:
 * - payment_intent.succeeded - Payment completed successfully
 * - payment_intent.payment_failed - Payment failed
 * - payment_intent.canceled - Payment canceled
 * - charge.refunded - Payment refunded
 * - customer.subscription.created - Subscription created
 * - customer.subscription.updated - Subscription updated
 * - customer.subscription.deleted - Subscription canceled
 * - invoice.payment_succeeded - Subscription payment succeeded
 * - invoice.payment_failed - Subscription payment failed
 */
export async function POST(request: NextRequest) {
  return StripeWebhookService.getInstance().handleRequest(request);
}
