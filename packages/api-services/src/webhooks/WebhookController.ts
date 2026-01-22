/**
 * Webhook Controller - Handles incoming webhook events from external services
 */
import { WebhookService } from './WebhookService';
import { logger } from '@mintenance/shared';
import { StripeWebhookHandler } from './handlers/StripeWebhookHandler';
import crypto from 'crypto';
// Temporary types
interface NextRequest {
  url: string;
  method: string;
  headers: Headers;
  text(): Promise<string>;
  json(): Promise<any>;
}
const NextResponse = {
  json(data: any, init?: ResponseInit): any {
    return {
      body: JSON.stringify(data),
      status: init?.status || 200,
      headers: init?.headers || {}
    };
  }
};

// Mock functions
async function checkWebhookRateLimit(identifier: string) {
  return { allowed: true, remaining: 20 };
}
function handleAPIError(error: any): any {
  logger.error('Webhook Error:', error);
  const status = error.statusCode || 500;
  const message = error.message || 'Webhook processing error';
  return NextResponse.json(
    { error: message },
    { status }
  );
}
// Mock configs
const stripe = {} as any;
const serverSupabase = {} as any;
export class WebhookController {
  private webhookService: WebhookService;
  private stripeHandler: StripeWebhookHandler;
  constructor() {
    this.webhookService = new WebhookService({
      supabase: serverSupabase,
    });
    this.stripeHandler = new StripeWebhookHandler({
      stripe,
      supabase: serverSupabase,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    });
  }
  /**
   * POST /api/webhooks/stripe - Handle Stripe webhooks
   */
  async handleStripeWebhook(request: NextRequest): Promise<any> {
    try {
      // Rate limiting
      const clientIp = this.getClientIp(request);
      const rateLimitResult = await checkWebhookRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        logger.warn('Webhook rate limit exceeded', {
          service: 'stripe-webhook',
          clientIp
        });
        return this.rateLimitResponse(rateLimitResult);
      }
      // Get raw body and signature
      const body = await request.text();
      const signature = request.headers.get('stripe-signature');
      if (!signature) {
        logger.error('Missing Stripe signature', {
          service: 'stripe-webhook',
          clientIp
        });
        return NextResponse.json(
          { error: 'Missing stripe-signature header' },
          { status: 400 }
        );
      }
      // Verify and parse the event
      const event = await this.stripeHandler.verifyAndParseEvent(
        body,
        signature
      );
      // Check idempotency
      const idempotencyKey = this.generateIdempotencyKey(event.id, event.type);
      const isDuplicate = await this.webhookService.checkIdempotency(
        idempotencyKey,
        'stripe',
        event
      );
      if (isDuplicate) {
        logger.info('Duplicate webhook event, skipping', {
          eventId: event.id,
          eventType: event.type
        });
        return NextResponse.json({ received: true, duplicate: true });
      }
      // Process the event
      const result = await this.stripeHandler.handleEvent(event);
      // Store webhook event
      await this.webhookService.storeWebhookEvent({
        source: 'stripe',
        eventId: event.id,
        eventType: event.type,
        idempotencyKey,
        payload: event,
        processedAt: new Date().toISOString(),
        status: 'processed',
        result,
      });
      return NextResponse.json({
        received: true,
        processed: true,
        eventType: event.type,
        result,
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/webhooks/github - Handle GitHub webhooks
   */
  async handleGithubWebhook(request: NextRequest): Promise<any> {
    try {
      // Rate limiting
      const clientIp = this.getClientIp(request);
      const rateLimitResult = await checkWebhookRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Verify GitHub signature
      const body = await request.text();
      const signature = request.headers.get('x-hub-signature-256');
      if (!signature) {
        return NextResponse.json(
          { error: 'Missing GitHub signature' },
          { status: 400 }
        );
      }
      // Verify signature
      const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex')}`;
      if (signature !== expectedSignature) {
        logger.error('Invalid GitHub webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
      const event = JSON.parse(body);
      const eventType = request.headers.get('x-github-event') || 'unknown';
      // Process based on event type
      logger.info('GitHub webhook received', { eventType });
      return NextResponse.json({ received: true });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/webhooks/slack - Handle Slack webhooks
   */
  async handleSlackWebhook(request: NextRequest): Promise<any> {
    try {
      // Rate limiting
      const clientIp = this.getClientIp(request);
      const rateLimitResult = await checkWebhookRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Slack sends different types of requests
      const contentType = request.headers.get('content-type');
      let body: any;
      if (contentType?.includes('application/x-www-form-urlencoded')) {
        // URL verification or slash commands
        const text = await request.text();
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      } else {
        // Event callbacks
        body = await request.json();
      }
      // Handle URL verification challenge
      if (body.type === 'url_verification') {
        return NextResponse.json({ challenge: body.challenge });
      }
      // Verify Slack signature
      const signature = request.headers.get('x-slack-signature');
      const timestamp = request.headers.get('x-slack-request-timestamp');
      if (!signature || !timestamp) {
        return NextResponse.json(
          { error: 'Missing Slack signature or timestamp' },
          { status: 400 }
        );
      }
      // Process the event
      logger.info('Slack webhook received', { type: body.type });
      return NextResponse.json({ ok: true });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * Generic webhook handler for other services
   */
  async handleGenericWebhook(
    request: NextRequest,
    source: string
  ): Promise<any> {
    try {
      // Rate limiting
      const clientIp = this.getClientIp(request);
      const rateLimitResult = await checkWebhookRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Parse body
      const body = await request.json();
      // Store webhook event
      await this.webhookService.storeWebhookEvent({
        source,
        eventId: body.id || crypto.randomUUID(),
        eventType: body.type || 'unknown',
        idempotencyKey: this.generateIdempotencyKey(body.id, body.type),
        payload: body,
        processedAt: new Date().toISOString(),
        status: 'received',
      });
      logger.info('Generic webhook received', { source, type: body.type });
      return NextResponse.json({ received: true });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  // ============= Private Helper Methods =============
  private getClientIp(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0] ||
           request.headers.get('x-real-ip') ||
           'unknown';
  }
  private generateIdempotencyKey(eventId: string, eventType: string): string {
    return crypto
      .createHash('sha256')
      .update(`${eventId}-${eventType}`)
      .digest('hex');
  }
  private rateLimitResponse(rateLimitResult: any): any {
    return NextResponse.json(
      { error: 'Too many webhook requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(rateLimitResult.limit || 20),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining || 0),
        },
      }
    );
  }
}
// Export singleton instance
export const webhookController = new WebhookController();
