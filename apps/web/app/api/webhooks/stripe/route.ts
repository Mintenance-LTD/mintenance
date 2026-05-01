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
 * - charge.dispute.created - Dispute opened (freezes escrow)
 * - charge.dispute.updated - Dispute status changed
 * - charge.dispute.closed - Dispute resolved (won/lost)
 * - customer.subscription.created - Subscription created
 * - customer.subscription.updated - Subscription updated
 * - customer.subscription.deleted - Subscription canceled
 * - invoice.payment_succeeded - Subscription payment succeeded
 * - invoice.payment_failed - Subscription payment failed
 */
// auth-check: ok — Stripe webhook signature is the auth (verified inside
// StripeWebhookService.handleRequest via stripe.webhooks.constructEvent).
// withApiHandler is intentionally NOT used because it consumes the body
// for CSRF / JSON parse, which would invalidate the raw bytes Stripe
// signs. Keep this raw export.
export async function POST(request: NextRequest) {
  return StripeWebhookService.getInstance().handleRequest(request);
}
