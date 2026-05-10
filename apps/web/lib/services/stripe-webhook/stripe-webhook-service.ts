import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createHash } from 'crypto';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { env } from '@/lib/env';
import {
  handleAPIError,
  BadRequestError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/request-ip';
import { StripeWebhookEventHandler } from './stripe-webhook-event-handler';

interface IdempotencyResultRow {
  is_duplicate?: boolean;
  event_id?: string;
}

export class StripeWebhookService {
  private static instance: StripeWebhookService;

  private constructor() {}

  static getInstance(): StripeWebhookService {
    if (!StripeWebhookService.instance) {
      StripeWebhookService.instance = new StripeWebhookService();
    }
    return StripeWebhookService.instance;
  }

  async handleRequest(request: NextRequest): Promise<NextResponse> {
    try {
      const rateLimitResponse = await this.checkRateLimit(request);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      const body = await request.text();
      const signature = request.headers.get('stripe-signature');

      if (!signature) {
        this.safeLogMissingSignature();
        throw new BadRequestError('Missing stripe-signature header');
      }

      const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        logger.error(
          'STRIPE_WEBHOOK_SECRET not configured - rejecting webhook',
          null,
          {
            service: 'stripe-webhook',
            eventType: 'unknown',
          }
        );
        throw new InternalServerError(
          'Webhook endpoint not properly configured'
        );
      }

      const stripe = this.getStripeInstance();
      const event = this.constructEvent(stripe, body, signature, webhookSecret);
      this.validateTimestamp(event);

      const idempotencyKey = this.buildIdempotencyKey(event);
      const { eventRecordId, isDuplicate } = await this.checkIdempotency(
        event,
        idempotencyKey
      );
      if (isDuplicate) {
        return NextResponse.json(
          { received: true, duplicate: true },
          { status: 200 }
        );
      }

      logger.info('Processing webhook event', {
        service: 'stripe-webhook',
        eventType: event.type,
        eventId: event.id,
      });

      const handler = new StripeWebhookEventHandler(stripe);

      try {
        await handler.handleEvent(event);
        await this.markProcessed(eventRecordId, 'processed');
        return NextResponse.json({ received: true }, { status: 200 });
      } catch (processingError: unknown) {
        const errorMessage =
          processingError instanceof Error
            ? processingError.message
            : String(processingError);
        logger.error('Webhook event processing failed', processingError, {
          service: 'stripe-webhook',
          eventId: eventRecordId,
        });

        await this.markProcessed(eventRecordId, 'failed', errorMessage);
        throw new InternalServerError('Event processing failed');
      }
    } catch (error: unknown) {
      return handleAPIError(error);
    }
  }

  private async checkRateLimit(
    request: NextRequest
  ): Promise<NextResponse | null> {
    // Sprint 5.5: this is a DoS guard, NOT the forgery gate. Stripe webhook
    // signature verification (constructEvent, line ~129) is what stops forged
    // events from being processed. The rate limit only stops an attacker
    // hammering the endpoint with garbage that would never pass signature
    // verification but would still consume CPU.
    //
    // Audit P3 (2026-05-10): tightened from 1000 → 200 req/min/IP.
    //   - Stripe documents that webhook delivery from any single source IP
    //     stays well under 200/min in normal operation, even for a high-
    //     traffic account, because Stripe rotates IPs aggressively.
    //   - 200/min still leaves a 4× headroom over Stripe's published
    //     ~50/min steady-state burst rate.
    //   - The limit only fires per-IP, so a real Stripe IP rotation hides
    //     legitimate volume across many buckets; an attacker hammering a
    //     single IP gets cut off 5× faster than before.
    //   - If you see false-positives in prod, pin Stripe IPs at the edge
    //     (Vercel firewall) and remove this rate limit entirely — that's
    //     the proper long-term fix.
    const ip = getClientIp(request);
    const MAX_REQUESTS = 200;
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `stripe-webhook:${ip}`,
      windowMs: 60_000,
      maxRequests: MAX_REQUESTS,
    });

    if (!rateLimitResult.allowed) {
      logger.warn('Stripe webhook rate limit exceeded', {
        service: 'stripe-webhook',
        ip,
        retryAfter: rateLimitResult.retryAfter,
      });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(MAX_REQUESTS),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(
              rateLimitResult.resetTime
            ).toISOString(),
          },
        }
      );
    }

    return null;
  }

  private getStripeInstance(): Stripe {
    const apiKey = env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    return new Stripe(apiKey);
  }

  private constructEvent(
    stripe: Stripe,
    body: string,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    try {
      return stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Webhook signature verification failed', err, {
        service: 'stripe-webhook',
      });
      throw new BadRequestError('Webhook signature verification failed');
    }
  }

  private validateTimestamp(event: Stripe.Event): void {
    const eventTimestamp = event.created;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timestampTolerance = 300;

    if (Math.abs(currentTimestamp - eventTimestamp) > timestampTolerance) {
      logger.warn('Webhook event timestamp outside tolerance window', {
        service: 'stripe-webhook',
        eventId: event.id,
        eventTimestamp,
        currentTimestamp,
        timeDifference: Math.abs(currentTimestamp - eventTimestamp),
      });
      throw new BadRequestError('Event timestamp outside acceptable range');
    }
  }

  private buildIdempotencyKey(event: Stripe.Event): string {
    return createHash('sha256')
      .update(`${event.id}-${event.type}`)
      .digest('hex');
  }

  private async checkIdempotency(
    event: Stripe.Event,
    idempotencyKey: string
  ): Promise<{ eventRecordId?: string; isDuplicate: boolean }> {
    const { data: idempotencyResult, error: idempotencyError } =
      await serverSupabase.rpc('check_webhook_idempotency', {
        p_idempotency_key: idempotencyKey,
        p_event_type: event.type,
        p_event_id: event.id,
        p_source: 'stripe',
        p_payload: event,
      });

    if (idempotencyError) {
      logger.error('Webhook idempotency check failed', idempotencyError, {
        service: 'stripe-webhook',
      });
      throw new InternalServerError('Idempotency check failed');
    }

    const row =
      (idempotencyResult?.[0] as IdempotencyResultRow | undefined) ?? {};
    if (row.is_duplicate) {
      logger.info('Duplicate webhook event detected', {
        service: 'stripe-webhook',
        eventType: event.type,
        eventId: event.id,
      });
      return { eventRecordId: row.event_id, isDuplicate: true };
    }

    return { eventRecordId: row.event_id, isDuplicate: false };
  }

  private async markProcessed(
    eventRecordId: string | undefined,
    status: 'processed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    if (!eventRecordId) {
      return;
    }

    await serverSupabase.rpc('mark_webhook_processed', {
      p_event_id: eventRecordId,
      p_status: status,
      p_error_message: errorMessage,
    });
  }

  private safeLogMissingSignature(): void {
    try {
      logger.error('Webhook missing Stripe signature', null, {
        service: 'stripe-webhook',
      });
    } catch {
      // Logger might fail, ignore it
    }
  }
}
