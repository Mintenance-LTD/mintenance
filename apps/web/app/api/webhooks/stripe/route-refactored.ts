import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { env } from '@/lib/env';
import { handleAPIError, RateLimitError } from '@/lib/errors/api-error';
import { checkWebhookRateLimit } from '@/lib/rate-limiter';
import { WebhookHandlerRegistry } from './handlers';
import { WebhookSignatureVerifier } from './services/signature-verifier';
import { IdempotencyService } from './services/idempotency.service';
// Ensure Node.js runtime for Stripe SDK and raw body access
export const runtime = 'nodejs';
/**
 * Refactored Stripe Webhook Handler
 *
 * Reduced from 909 lines to ~150 lines in main file
 * Separated concerns into:
 * - Event handlers (handlers/)
 * - Signature verification (services/signature-verifier.ts)
 * - Idempotency (services/idempotency.service.ts)
 * - Rate limiting (existing lib/rate-limiter)
 *
 * Security features:
 * - Signature verification (prevents replay attacks and tampering)
 * - Rate limiting (prevents DOS attacks)
 * - Idempotency (prevents duplicate processing)
 * - Comprehensive logging and error handling
 */
export async function POST(request: NextRequest) {
  // Initialize services
  const stripe = createStripeInstance();
  const idempotencyService = new IdempotencyService();
  const handlerRegistry = new WebhookHandlerRegistry();
  try {
    // Step 1: Rate limiting
    await enforceRateLimit(request);
    // Step 2: Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    // Step 3: Verify webhook signature
    const verifier = new WebhookSignatureVerifier(stripe, env.STRIPE_WEBHOOK_SECRET);
    const event = await verifier.verifyAndConstructEvent(body, signature);
    // Step 4: Check idempotency (prevent duplicate processing)
    const isProcessed = await idempotencyService.isEventProcessed(event.id);
    if (isProcessed) {
      logger.info('Webhook event already processed, skipping', {
        service: 'stripe-webhook',
        eventId: event.id,
        eventType: event.type,
      });
      return NextResponse.json(
        { received: true, skipped: true },
        { status: 200 }
      );
    }
    // Step 5: Process the event using appropriate handler
    await handlerRegistry.handleEvent(event);
    // Step 6: Record successful processing
    await idempotencyService.recordEventProcessed(
      event.id,
      event.type,
      event.data.object
    );
    // Step 7: Return success response
    return NextResponse.json(
      { received: true, processed: true },
      { status: 200 }
    );
  } catch (error) {
    return handleWebhookError(error);
  }
}
/**
 * Creates and validates Stripe instance
 */
function createStripeInstance(): Stripe {
  const apiKey = env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    logger.error('STRIPE_SECRET_KEY not configured', {
      service: 'stripe-webhook',
    });
    throw new Error('Stripe configuration missing');
  }
  return new Stripe(apiKey, {
    apiVersion: '2024-06-20',
    typescript: true,
  });
}
/**
 * Enforces rate limiting for webhook requests
 */
async function enforceRateLimit(request: NextRequest): Promise<void> {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const rateLimitResult = await checkWebhookRateLimit(clientIp);
  if (!rateLimitResult.allowed) {
    logger.warn('Webhook rate limit exceeded', {
      service: 'stripe-webhook',
      clientIp,
      remaining: rateLimitResult.remaining,
    });
    throw new RateLimitError(
      'Too many webhook requests. Please try again later.'
    );
  }
}
/**
 * Handles webhook errors with appropriate status codes
 */
function handleWebhookError(error: unknown): NextResponse {
  // Log the error
  logger.error('Webhook processing failed', {
    service: 'stripe-webhook',
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
  // Handle specific error types
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  // Use the API error handler for consistent error responses
  return handleAPIError(error);
}
/**
 * GET method - Returns webhook configuration status
 * Useful for health checks and debugging
 */
export async function GET() {
  const isConfigured = !!env.STRIPE_SECRET_KEY && !!env.STRIPE_WEBHOOK_SECRET;
  return NextResponse.json({
    status: isConfigured ? 'configured' : 'not_configured',
    message: isConfigured
      ? 'Stripe webhook endpoint is ready'
      : 'Stripe webhook endpoint is not configured',
    timestamp: new Date().toISOString(),
  });
}