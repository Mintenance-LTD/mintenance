/**
 * Payment Controller - Handles all payment-related operations
 * Includes payment intents, escrow, refunds, and releases
 */
import { PaymentService } from './PaymentService';
import { logger } from '@mintenance/shared';
import { EscrowService } from './EscrowService';
import { RefundService } from './RefundService';
// Temporary types
interface NextRequest {
  url: string;
  method: string;
  headers: Headers;
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
interface User {
  id: string;
  email: string;
  role: string;
  stripe_customer_id?: string;
}
// Mock functions
async function getCurrentUserFromCookies(): Promise<User | null> {
  return { id: 'test-user', email: 'test@example.com', role: 'homeowner' };
}
async function requireCSRF(request: NextRequest): Promise<void> {
  // TODO: Implement CSRF check
}
async function checkRateLimit(request: NextRequest, options: any) {
  return { allowed: true };
}
function handleAPIError(error: any): any {
  logger.error('Payment API Error:', error);
  const status = error.statusCode || 500;
  const message = error.message || 'Payment processing error';
  return NextResponse.json(
    { error: message },
    { status }
  );
}
// Mock Stripe and Supabase
const stripe = {} as any;
const serverSupabase = {} as any;
export class PaymentController {
  private paymentService: PaymentService;
  private escrowService: EscrowService;
  private refundService: RefundService;
  constructor() {
    const config = {
      stripe,
      supabase: serverSupabase,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    };
    this.paymentService = new PaymentService(config);
    this.escrowService = new EscrowService(config);
    this.refundService = new RefundService(config);
  }
  /**
   * POST /api/payments/create-intent - Create a payment intent
   */
  async createPaymentIntent(request: NextRequest): Promise<any> {
    try {
      // Rate limiting - stricter for payment operations
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000, // 1 minute
        maxRequests: 10, // 10 payment intents per minute
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection - critical for payments
      await requireCSRF(request);
      // Authentication required
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required for payments' },
          { status: 401 }
        );
      }
      // Parse request body
      const data = await request.json();
      const { jobId, bidId, amount, paymentMethodId } = data;
      // Validate payment data
      if (!jobId || !amount || amount <= 0) {
        return NextResponse.json(
          { error: 'Invalid payment data' },
          { status: 400 }
        );
      }
      // Create payment intent
      const result = await this.paymentService.createPaymentIntent({
        jobId,
        bidId,
        amount,
        paymentMethodId,
        userId: user.id,
        customerEmail: user.email,
      });
      return NextResponse.json({
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        amount: result.amount,
        status: result.status,
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/payments/confirm-intent - Confirm a payment intent
   */
  async confirmPaymentIntent(request: NextRequest): Promise<any> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 20,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse request body
      const { paymentIntentId, paymentMethodId } = await request.json();
      // Confirm the payment
      const result = await this.paymentService.confirmPayment({
        paymentIntentId,
        paymentMethodId,
        userId: user.id,
      });
      return NextResponse.json({
        success: true,
        status: result.status,
        paymentId: result.paymentId,
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/payments/release-escrow - Release escrow funds
   */
  async releaseEscrow(request: NextRequest): Promise<any> {
    try {
      // Very strict rate limiting for escrow release
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 3600000, // 1 hour
        maxRequests: 5, // 5 releases per hour
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Only homeowners can release escrow
      if (user.role !== 'homeowner' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only job owners can release escrow' },
          { status: 403 }
        );
      }
      // Parse request body
      const { jobId, amount, reason } = await request.json();
      // Validate escrow release
      const validation = await this.escrowService.validateRelease({
        jobId,
        amount,
        userId: user.id,
      });
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
      // Release the escrow
      const result = await this.escrowService.releaseEscrow({
        jobId,
        amount,
        reason,
        releasedBy: user.id,
      });
      return NextResponse.json({
        success: true,
        transferId: result.transferId,
        amount: result.amount,
        contractorId: result.contractorId,
        releasedAt: result.releasedAt,
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/payments/refund - Process a refund
   */
  async processRefund(request: NextRequest): Promise<any> {
    try {
      // Rate limiting for refunds
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 3600000,
        maxRequests: 10,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse request body
      const { paymentId, amount, reason, fullRefund = false } = await request.json();
      // Validate refund request
      const validation = await this.refundService.validateRefund({
        paymentId,
        amount,
        fullRefund,
        userId: user.id,
      });
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
      // Process the refund
      const result = await this.refundService.processRefund({
        paymentId,
        amount: fullRefund ? validation.originalAmount : amount,
        reason,
        requestedBy: user.id,
        fullRefund,
      });
      return NextResponse.json({
        success: true,
        refundId: result.refundId,
        amount: result.amount,
        status: result.status,
        processedAt: result.processedAt,
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/payments/history - Get payment history
   */
  async getPaymentHistory(request: NextRequest): Promise<any> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 30,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse query parameters
      const url = new URL(request.url);
      const jobId = url.searchParams.get('jobId');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      // Get payment history
      const history = await this.paymentService.getPaymentHistory({
        userId: user.id,
        jobId,
        limit,
        offset,
      });
      return NextResponse.json({
        payments: history.payments,
        total: history.total,
        hasMore: history.hasMore,
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/payments/embedded-checkout - Create embedded checkout session
   */
  async createEmbeddedCheckout(request: NextRequest): Promise<any> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 10,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse request body
      const data = await request.json();
      // Create checkout session
      const session = await this.paymentService.createCheckoutSession({
        ...data,
        userId: user.id,
        customerEmail: user.email,
      });
      return NextResponse.json({
        sessionId: session.id,
        sessionUrl: session.url,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  // ============= Private Helper Methods =============
  private getClientIdentifier(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'anonymous';
    return `${ip}:${request.url}`;
  }
  private rateLimitResponse(rateLimitResult: any): any {
    return NextResponse.json(
      {
        error: 'Too many payment requests. Please try again later.',
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(rateLimitResult.limit || 30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining || 0),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
      }
    );
  }
}
// Export singleton instance
export const paymentController = new PaymentController();
