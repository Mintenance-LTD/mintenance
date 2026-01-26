import { Stripe } from 'stripe';
import { logger } from '@mintenance/shared';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
export class WebhookSignatureVerifier {
  constructor(
    private stripe: Stripe,
    private webhookSecret: string
  ) {
    if (!webhookSecret) {
      throw new Error('Webhook secret is required for signature verification');
    }
  }
  /**
   * Verifies the Stripe webhook signature and returns the event
   *
   * Security features:
   * - Prevents replay attacks
   * - Prevents tampering
   * - Validates event authenticity
   *
   * @param body Raw request body as string
   * @param signature Stripe-Signature header value
   * @returns Verified Stripe event
   * @throws BadRequestError if signature is invalid
   */
  async verifyAndConstructEvent(
    body: string,
    signature: string | null
  ): Promise<Stripe.Event> {
    if (!signature) {
      logger.error('Webhook missing Stripe signature', {
        service: 'stripe-webhook',
      });
      throw new BadRequestError('Missing stripe-signature header');
    }
    try {
      // Stripe SDK handles all signature verification including:
      // - Timestamp validation (prevents replay attacks)
      // - HMAC signature validation (prevents tampering)
      // - Event construction from raw body
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret
      );
      logger.info('Webhook signature verified successfully', {
        service: 'stripe-webhook',
        eventId: event.id,
        eventType: event.type,
      });
      return event;
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Webhook signature verification failed', {
          service: 'stripe-webhook',
          error: error.message,
        });
        if (error.message.includes('No signatures found matching')) {
          throw new BadRequestError('Invalid webhook signature');
        }
        if (error.message.includes('Timestamp outside the tolerance zone')) {
          throw new BadRequestError('Webhook timestamp too old (possible replay attack)');
        }
      }
      throw new InternalServerError('Failed to verify webhook signature');
    }
  }
  /**
   * Validates that the webhook secret is properly configured
   */
  validateConfiguration(): boolean {
    if (!this.webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured', {
        service: 'stripe-webhook',
      });
      return false;
    }
    if (!this.webhookSecret.startsWith('whsec_')) {
      logger.error('Invalid webhook secret format', {
        service: 'stripe-webhook',
      });
      return false;
    }
    return true;
  }
}