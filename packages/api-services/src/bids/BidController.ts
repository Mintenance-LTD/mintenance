/**
 * Bid Controller - Handles all bid-related operations
 */
import { BidService } from './BidService';
import { logger } from '@mintenance/shared';
import { BidScoringService } from './BidScoringService';
import { BidNotificationService } from './BidNotificationService';
// Temporary types
interface NextRequest {
  url: string;
  method: string;
  headers: Headers;
  json(): Promise<Response>;
}
const NextResponse = {
  json(data: Record<string, unknown>, init?: ResponseInit): unknown {
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
}
// Mock functions
async function getCurrentUserFromCookies(): Promise<User | null> {
  return { id: 'test-user', email: 'test@example.com', role: 'contractor' };
}
async function requireCSRF(request: NextRequest): Promise<void> {
  // TODO: Implement CSRF check
}
async function checkRateLimit(request: NextRequest, options: Record<string, unknown>) {
  return { allowed: true };
}
async function checkIdempotency(key: string, type: string) {
  return { isDuplicate: false };
}
async function storeIdempotencyResult(key: string, result: unknown) {
  // Store result for idempotency
}
function handleAPIError(error: unknown): unknown {
  logger.error('Bid API Error:', error);
  const status = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  return NextResponse.json(
    { error: message },
    { status }
  );
}
// Mock Supabase
const serverSupabase = {} as any;
export class BidController {
  private bidService: BidService;
  private scoringService: BidScoringService;
  private notificationService: BidNotificationService;
  constructor() {
    const config = {
      supabase: serverSupabase,
    };
    this.bidService = new BidService(config);
    this.scoringService = new BidScoringService(config);
    this.notificationService = new BidNotificationService(config);
  }
  /**
   * POST /api/contractor/submit-bid - Submit a new bid
   */
  async submitBid(request: NextRequest): Promise<Response> {
    try {
      // CSRF protection
      await requireCSRF(request);
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000, // 1 minute
        maxRequests: 10, // 10 bids per minute
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required to submit bids' },
          { status: 401 }
        );
      }
      // Verify user is a contractor
      if (user.role !== 'contractor') {
        return NextResponse.json(
          { error: 'Only contractors can submit bids' },
          { status: 403 }
        );
      }
      // Parse request body
      const data = await request.json();
      // Check idempotency
      const idempotencyKey = this.generateIdempotencyKey(user.id, data.jobId);
      const idempotencyCheck = await checkIdempotency(idempotencyKey, 'submit_bid');
      if (idempotencyCheck.isDuplicate) {
        return NextResponse.json({
          message: 'Bid already submitted',
          duplicate: true
        });
      }
      // Validate and submit bid
      const bid = await this.bidService.submitBid(data, user);
      // Calculate bid score
      const score = await this.scoringService.calculateBidScore(bid);
      // Update bid with score
      await this.bidService.updateBidScore(bid.id, score);
      // Send notifications
      await this.notificationService.notifyBidSubmission(bid);
      // Store result for idempotency
      const result = {
        success: true,
        bidId: bid.id,
        score: score.totalScore,
        message: 'Bid submitted successfully'
      };
      await storeIdempotencyResult(idempotencyKey, result);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/bids - List bids (for contractors or homeowners)
   */
  async listBids(request: NextRequest): Promise<Response> {
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
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      // Get bids based on user role
      let bids;
      if (user.role === 'contractor') {
        bids = await this.bidService.getContractorBids(user.id, {
          jobId,
          status,
          limit,
          offset
        });
      } else if (user.role === 'homeowner') {
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID required for homeowners' },
            { status: 400 }
          );
        }
        bids = await this.bidService.getJobBids(jobId, user.id, {
          status,
          limit,
          offset
        });
      } else {
        return NextResponse.json(
          { error: 'Invalid user role' },
          { status: 403 }
        );
      }
      return NextResponse.json(bids);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/bids/[bidId] - Get single bid details
   */
  async getBid(
    request: NextRequest,
    { params }: { params: { bidId: string } }
  ): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 60,
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
      // Get bid with authorization check
      const bid = await this.bidService.getBidById(params.bidId, user);
      if (!bid) {
        return NextResponse.json(
          { error: 'Bid not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(bid);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/bids/[bidId]/accept - Accept a bid
   */
  async acceptBid(
    request: NextRequest,
    { params }: { params: { bidId: string } }
  ): Promise<Response> {
    try {
      // CSRF protection
      await requireCSRF(request);
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 3600000, // 1 hour
        maxRequests: 5, // 5 accepts per hour
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
      // Only homeowners can accept bids
      if (user.role !== 'homeowner') {
        return NextResponse.json(
          { error: 'Only homeowners can accept bids' },
          { status: 403 }
        );
      }
      // Accept the bid
      const result = await this.bidService.acceptBid(params.bidId, user);
      // Send notifications
      await this.notificationService.notifyBidAcceptance(result.bid, result.contract);
      return NextResponse.json({
        success: true,
        message: 'Bid accepted successfully',
        contractId: result.contract.id
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/bids/[bidId]/reject - Reject a bid
   */
  async rejectBid(
    request: NextRequest,
    { params }: { params: { bidId: string } }
  ): Promise<Response> {
    try {
      // CSRF protection
      await requireCSRF(request);
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 20,
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
      // Only homeowners can reject bids
      if (user.role !== 'homeowner') {
        return NextResponse.json(
          { error: 'Only homeowners can reject bids' },
          { status: 403 }
        );
      }
      // Parse request body
      const { reason } = await request.json();
      // Reject the bid
      const bid = await this.bidService.rejectBid(params.bidId, user, reason);
      // Send notifications
      await this.notificationService.notifyBidRejection(bid, reason);
      return NextResponse.json({
        success: true,
        message: 'Bid rejected'
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * PUT /api/bids/[bidId] - Update a bid (before acceptance)
   */
  async updateBid(
    request: NextRequest,
    { params }: { params: { bidId: string } }
  ): Promise<Response> {
    try {
      // CSRF protection
      await requireCSRF(request);
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 10,
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
      // Only contractors can update their own bids
      if (user.role !== 'contractor') {
        return NextResponse.json(
          { error: 'Only contractors can update bids' },
          { status: 403 }
        );
      }
      // Parse request body
      const data = await request.json();
      // Update the bid
      const bid = await this.bidService.updateBid(params.bidId, data, user);
      // Recalculate score if amount changed
      if (data.bidAmount) {
        const score = await this.scoringService.calculateBidScore(bid);
        await this.bidService.updateBidScore(bid.id, score);
      }
      return NextResponse.json({
        success: true,
        message: 'Bid updated successfully',
        bid
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * DELETE /api/bids/[bidId] - Withdraw a bid
   */
  async withdrawBid(
    request: NextRequest,
    { params }: { params: { bidId: string } }
  ): Promise<Response> {
    try {
      // CSRF protection
      await requireCSRF(request);
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 10,
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
      // Only contractors can withdraw their own bids
      if (user.role !== 'contractor') {
        return NextResponse.json(
          { error: 'Only contractors can withdraw bids' },
          { status: 403 }
        );
      }
      // Withdraw the bid
      await this.bidService.withdrawBid(params.bidId, user);
      return NextResponse.json({
        success: true,
        message: 'Bid withdrawn successfully'
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
  private generateIdempotencyKey(userId: string, jobId: string): string {
    return `bid:${userId}:${jobId}`;
  }
  private rateLimitResponse(rateLimitResult: unknown): unknown {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
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
export const bidController = new BidController();
