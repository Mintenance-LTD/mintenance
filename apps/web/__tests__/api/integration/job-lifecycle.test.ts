// @vitest-environment node
/**
 * Integration tests for the FULL job lifecycle.
 *
 * Scenarios covered (matching the canonical lifecycle in CLAUDE.md):
 *   1. Job posted           -> status 'posted'
 *   2. Bid submitted        -> bid status 'pending'
 *   3. Bid accepted         -> winning bid 'accepted', others 'rejected', job 'assigned'
 *   4. Contract signed      -> both parties sign, status 'accepted'
 *   5. Payment into escrow  -> escrow status 'held'
 *   6. Before photos        -> photo metadata stored
 *   7. Job started          -> status 'in_progress' (requires photos + contract + escrow)
 *   8. After photos         -> auto-completion, status 'completed'
 *   9. Homeowner approves   -> escrow release triggered
 *  10. Review submitted     -> both parties can review
 *
 * Mock approach follows the existing route-test patterns (vi.hoisted + vi.mock).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Hoisted mocks (shared across all describe blocks)
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  // Auth
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),

  // Supabase
  supabaseFrom: vi.fn(),
  supabaseRpc: vi.fn(),
  supabaseStorageFrom: vi.fn(),
  supabaseStorageUpload: vi.fn(),
  supabaseStorageGetPublicUrl: vi.fn(),
  createRequestScopedClient: vi.fn(),

  // CSRF / rate-limiter
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  checkJobCreationRateLimit: vi.fn(),

  // Validation
  validateRequest: vi.fn(),
  validateImageUpload: vi.fn(),

  // Services
  jobQueryServiceListJobs: vi.fn(),
  jobCreationServiceCreateJob: vi.fn(),
  createNotification: vi.fn(),
  sendBidAcceptedEmail: vi.fn(),
  sendJobStartedEmail: vi.fn(),
  sendJobCompletedEmail: vi.fn(),
  sendWorkApprovedEmail: vi.fn(),
  sendContractSignedEmail: vi.fn(),
  notifyJobStatusChange: vi.fn(),
  notifyJobConfirmed: vi.fn(),

  // Photo verification
  validatePhotoQuality: vi.fn(),
  validatePhotoRequirements: vi.fn(),
  verifyGeolocation: vi.fn(),

  // Bid processing
  processBid: vi.fn(),
  getDatabaseErrorMessage: vi.fn(),
  prepareQuoteData: vi.fn(),
  processQuote: vi.fn(),
  sendBidNotifications: vi.fn(),

  // Agents
  learnFromAcceptance: vi.fn(),
  learnFromBidOutcome: vi.fn(),
  generateRecommendation: vi.fn(),
  evaluateAutoAccept: vi.fn(),

  // Idempotency
  getIdempotencyKeyFromRequest: vi.fn(),
  checkIdempotency: vi.fn(),
  storeIdempotencyResult: vi.fn(),
  releaseIdempotencyClaim: vi.fn(),
  releaseOnError: vi.fn(),

  // State machine
  validateStatusTransition: vi.fn(),
  validateBidTransition: vi.fn(),
  validateEscrowTransition: vi.fn(),

  // Subscription
  requireSubscriptionForAction: vi.fn(),
  checkSubscriptionLimits: vi.fn(),

  // Fees / tier
  resolveContractorTier: vi.fn(),

  // UUID validation
  isValidUUID: vi.fn(),

  // Logger
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
  getCurrentUserFromBearerToken: mocks.getCurrentUserFromBearerToken,
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (...args: unknown[]) => mocks.supabaseFrom(...args),
    rpc: (...args: unknown[]) => mocks.supabaseRpc(...args),
    get storage() {
      return {
        from: (...args: unknown[]) => mocks.supabaseStorageFrom(...args),
      };
    },
  },
  createServerSupabaseClient: () => ({
    from: (...args: unknown[]) => mocks.supabaseFrom(...args),
    rpc: (...args: unknown[]) => mocks.supabaseRpc(...args),
    get storage() {
      return {
        from: (...args: unknown[]) => mocks.supabaseStorageFrom(...args),
      };
    },
  }),
  createRequestScopedClient: mocks.createRequestScopedClient,
}));

vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.requireCSRF }));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rateLimiterCheckRateLimit },
  checkJobCreationRateLimit: mocks.checkJobCreationRateLimit,
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
  JOB_STATUS: {
    POSTED: 'posted',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },
  BID_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn',
  },
  CONTRACT_STATUS: {
    DRAFT: 'draft',
    PENDING_HOMEOWNER: 'pending_homeowner',
    PENDING_CONTRACTOR: 'pending_contractor',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
  },
  ESCROW_STATUS: {
    PENDING: 'pending',
    HELD: 'held',
    RELEASE_PENDING: 'release_pending',
    RELEASED: 'released',
    REFUNDED: 'refunded',
    AWAITING_HOMEOWNER_APPROVAL: 'awaiting_homeowner_approval',
    PENDING_REVIEW: 'pending_review',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
  },
  validateStatusTransition: mocks.validateStatusTransition,
  validateBidTransition: mocks.validateBidTransition,
  validateEscrowTransition: mocks.validateEscrowTransition,
  BUSINESS_RULES: {},
  RATE_LIMITS: {},
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
  sanitizeText: (text: string) => text,
}));

vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));

vi.mock('@/lib/validation/validator', () => ({
  validateRequest: mocks.validateRequest,
}));

vi.mock('@/lib/sanitizer', () => ({
  sanitizeText: (text: string) => text,
}));

vi.mock('@/lib/services/job-query-service', () => ({
  JobQueryService: {
    getInstance: () => ({ listJobs: mocks.jobQueryServiceListJobs }),
  },
}));

vi.mock('@/lib/services/job-creation-service', () => ({
  JobCreationService: {
    getInstance: () => ({ createJob: mocks.jobCreationServiceCreateJob }),
  },
}));

vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {
    createNotification: mocks.createNotification,
    markEmailSent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/notifications/NotificationHelper', () => ({
  notifyJobStatusChange: mocks.notifyJobStatusChange,
  notifyJobConfirmed: mocks.notifyJobConfirmed,
}));

vi.mock('@/lib/email-service', () => ({
  EmailService: {
    sendBidAcceptedEmail: mocks.sendBidAcceptedEmail,
    sendJobStartedEmail: mocks.sendJobStartedEmail,
    sendJobCompletedEmail: mocks.sendJobCompletedEmail,
    sendWorkApprovedEmail: mocks.sendWorkApprovedEmail,
    sendContractSignedEmail: mocks.sendContractSignedEmail,
  },
}));

vi.mock('@/lib/services/escrow/PhotoVerificationService', () => ({
  PhotoVerificationService: {
    validatePhotoQuality: mocks.validatePhotoQuality,
    validatePhotoRequirements: mocks.validatePhotoRequirements,
    verifyGeolocation: mocks.verifyGeolocation,
  },
}));

vi.mock('@/lib/utils/fileValidation', () => ({
  validateImageUpload: mocks.validateImageUpload,
}));

vi.mock('@/lib/idempotency', () => ({
  getIdempotencyKeyFromRequest: mocks.getIdempotencyKeyFromRequest,
  checkIdempotency: mocks.checkIdempotency,
  storeIdempotencyResult: mocks.storeIdempotencyResult,
  releaseIdempotencyClaim: mocks.releaseIdempotencyClaim,
  // releaseOnError(key, op, fn) wraps fn and re-throws after releasing the
  // claim on failure (see lib/idempotency.ts:316). The real impl just runs
  // fn(); the test mock must do the same or the route bodies never execute.
  releaseOnError: mocks.releaseOnError,
}));

vi.mock('@/lib/services/agents/LearningMatchingService', () => ({
  LearningMatchingService: {
    learnFromAcceptance: mocks.learnFromAcceptance,
  },
}));

vi.mock('@/lib/services/agents/PricingAgent', () => ({
  PricingAgent: {
    learnFromBidOutcome: mocks.learnFromBidOutcome,
    generateRecommendation: mocks.generateRecommendation,
  },
}));

vi.mock('@/lib/services/agents/BidAcceptanceAgent', () => ({
  BidAcceptanceAgent: {
    evaluateAutoAccept: mocks.evaluateAutoAccept,
  },
}));

vi.mock('@/lib/validation/uuid', () => ({
  isValidUUID: mocks.isValidUUID,
}));

vi.mock('@/lib/job-state-machine', () => ({
  validateStatusTransition: mocks.validateStatusTransition,
}));

vi.mock('@/lib/middleware/subscription-check', () => ({
  requireSubscriptionForAction: mocks.requireSubscriptionForAction,
  checkSubscriptionLimits: mocks.checkSubscriptionLimits,
}));

// 2026-05-22 Sprint 2: bid-accept now resolves the contractor's tier and
// enforces a 3-active-job cap on free/basic. The route dynamic-imports this
// service. Return 'professional' (unlimited active jobs) so the cap path is
// skipped — these lifecycle tests don't exercise the cap.
vi.mock('@/lib/services/payment/FeeCalculationService', () => ({
  FeeCalculationService: {
    resolveContractorTier: mocks.resolveContractorTier,
  },
}));

vi.mock('@/app/api/contractor/submit-bid/validation', () => ({
  submitBidSchema: {
    parse: (data: unknown) => data,
  },
}));

vi.mock('@/app/api/contractor/submit-bid/bid-processor', () => ({
  processBid: mocks.processBid,
  getDatabaseErrorMessage: mocks.getDatabaseErrorMessage,
}));

vi.mock('@/app/api/contractor/submit-bid/quote-processor', () => ({
  prepareQuoteData: mocks.prepareQuoteData,
  processQuote: mocks.processQuote,
}));

vi.mock('@/app/api/contractor/submit-bid/notifications', () => ({
  sendBidNotifications: mocks.sendBidNotifications,
}));

vi.mock('@/lib/cors', () => ({ getCorsHeaders: vi.fn(() => ({})) }));

vi.mock('@/lib/services/verification/HomeownerVerificationService', () => ({
  HomeownerVerificationService: {
    isFullyVerified: vi.fn().mockResolvedValue({ canPostJobs: true }),
  },
}));

vi.mock('@/lib/errors/api-error', async () => {
  class APIError extends Error {
    constructor(
      public code: string,
      public userMessage: string,
      public statusCode: number = 500,
      public details?: unknown
    ) {
      super(userMessage);
      this.name = 'APIError';
    }
    toResponse() {
      return {
        error: { code: this.code, message: this.userMessage },
        timestamp: new Date().toISOString(),
      };
    }
  }
  class UnauthorizedError extends APIError {
    constructor(m = 'Unauthorized') {
      super('UNAUTHORIZED', m, 401);
    }
  }
  class ForbiddenError extends APIError {
    constructor(m = 'Forbidden') {
      super('FORBIDDEN', m, 403);
    }
  }
  class NotFoundError extends APIError {
    constructor(m = 'Resource not found') {
      super('NOT_FOUND', m, 404);
    }
  }
  class BadRequestError extends APIError {
    constructor(m = 'Bad Request', d?: unknown) {
      super('BAD_REQUEST', m, 400, d);
    }
  }
  class InternalServerError extends APIError {
    constructor(m = 'Internal Server Error') {
      super('INTERNAL_SERVER_ERROR', m, 500);
    }
  }
  class ConflictError extends APIError {
    constructor(m = 'Conflict') {
      super('CONFLICT', m, 409);
    }
  }
  class ValidationError extends APIError {
    constructor(m = 'Validation Error', d?: unknown) {
      super('VALIDATION_ERROR', m, 422, d);
    }
  }
  class RateLimitError extends APIError {
    constructor(retryAfter = 60) {
      super(
        'RATE_LIMIT',
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        429
      );
    }
  }
  return {
    APIError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
    InternalServerError,
    ConflictError,
    ValidationError,
    RateLimitError,
    handleAPIError: vi.fn((error: unknown) => {
      if (error instanceof APIError) {
        const { NextResponse: NR } = require('next/server');
        return NR.json(error.toResponse(), { status: error.statusCode });
      }
      const { NextResponse: NR } = require('next/server');
      return NR.json(
        {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
          },
        },
        { status: 500 }
      );
    }),
  };
});

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const JOB_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const BID_ID = 'bid-0001-0001-0001-000000000001';
const BID_2_ID = 'bid-0002-0002-0002-000000000002';
const CONTRACT_ID = 'contract-0001-0001-000000000001';
const ESCROW_ID = 'escrow-0001-0001-000000000001';

const homeownerUser = {
  id: 'homeowner-1',
  email: 'homeowner@test.com',
  role: 'homeowner' as const,
  first_name: 'Alice',
  last_name: 'Homeowner',
};

const contractorUser = {
  id: 'contractor-1',
  email: 'contractor@test.com',
  role: 'contractor' as const,
  first_name: 'Bob',
  last_name: 'Contractor',
};

const contractor2User = {
  id: 'contractor-2',
  email: 'contractor2@test.com',
  role: 'contractor' as const,
  first_name: 'Charlie',
  last_name: 'Builder',
};

// ---------------------------------------------------------------------------
// Request factory helpers
// ---------------------------------------------------------------------------
function createPostRequest(
  url: string,
  body: Record<string, unknown> = {}
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      'x-csrf-token': 'test-csrf-token',
    },
    body: JSON.stringify(body),
  });
}

function createGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'GET',
    headers: { 'x-forwarded-for': '127.0.0.1' },
  });
}

function segmentData(...ids: string[]) {
  if (ids.length === 1) {
    return { params: Promise.resolve({ id: ids[0] }) };
  }
  if (ids.length === 2) {
    return { params: Promise.resolve({ id: ids[0], bidId: ids[1] }) };
  }
  return { params: Promise.resolve({}) };
}

function noSegment() {
  return { params: Promise.resolve({}) };
}

// ---------------------------------------------------------------------------
// Shared mock-setup helpers
// ---------------------------------------------------------------------------
function setupInfrastructureMocks(user = homeownerUser) {
  mocks.getCurrentUserFromCookies.mockResolvedValue(user);
  mocks.getCurrentUserFromBearerToken.mockResolvedValue(null);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 29,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.checkJobCreationRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 9,
    retryAfter: 0,
  });
  mocks.createNotification.mockResolvedValue('notif-id');
  mocks.sendBidAcceptedEmail.mockResolvedValue(true);
  mocks.sendJobStartedEmail.mockResolvedValue(true);
  mocks.sendJobCompletedEmail.mockResolvedValue(true);
  mocks.sendWorkApprovedEmail.mockResolvedValue(true);
  mocks.sendContractSignedEmail.mockResolvedValue(true);
  mocks.notifyJobStatusChange.mockResolvedValue({
    homeownerNotifId: 'homeowner-notif-id',
  });
  mocks.notifyJobConfirmed.mockResolvedValue(undefined);
  mocks.getIdempotencyKeyFromRequest.mockReturnValue('idem-key-1');
  mocks.checkIdempotency.mockResolvedValue({ isDuplicate: false });
  mocks.storeIdempotencyResult.mockResolvedValue(undefined);
  mocks.releaseIdempotencyClaim.mockResolvedValue(undefined);
  // Mirror the real releaseOnError: execute the wrapped fn and return its
  // result. Without this the routes that wrap their body in releaseOnError
  // would never run their handler logic.
  mocks.releaseOnError.mockImplementation(
    async (_key: string, _op: string, fn: () => Promise<unknown>) => fn()
  );
  mocks.validateStatusTransition.mockReturnValue(undefined);
  mocks.validateBidTransition.mockReturnValue(undefined);
  mocks.validateEscrowTransition.mockReturnValue(undefined);
  mocks.validatePhotoQuality.mockResolvedValue({
    passed: true,
    qualityScore: 85,
  });
  mocks.validatePhotoRequirements.mockResolvedValue({ passed: true });
  mocks.verifyGeolocation.mockResolvedValue({
    withinThreshold: true,
    distance: 10,
  });
  mocks.validateImageUpload.mockResolvedValue({ valid: true });

  // Storage mock: serverSupabase.storage.from('Job-storage').upload() /
  // .createSignedUrl() — Phase 2 storage hardening switched writer routes
  // from getPublicUrl() to createSignedUrl(). Keep both mocked for legacy.
  mocks.supabaseStorageFrom.mockReturnValue({
    upload: vi
      .fn()
      .mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/test.jpg' },
    }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/test.jpg?token=test' },
      error: null,
    }),
    remove: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mocks.isValidUUID.mockReturnValue(true);
  mocks.requireSubscriptionForAction.mockResolvedValue(null);
  mocks.checkSubscriptionLimits.mockResolvedValue({ allowed: true });
  mocks.resolveContractorTier.mockResolvedValue('professional');
  mocks.learnFromAcceptance.mockResolvedValue(undefined);
  mocks.learnFromBidOutcome.mockResolvedValue(undefined);
  mocks.supabaseRpc.mockResolvedValue({
    data: [
      {
        success: true,
        error_message: null,
        accepted_bid_id: BID_ID,
        job_status: 'assigned',
      },
    ],
    error: null,
  });
  mocks.generateRecommendation.mockResolvedValue(null);
  mocks.evaluateAutoAccept.mockResolvedValue(undefined);
  mocks.prepareQuoteData.mockReturnValue({});
  mocks.processQuote.mockResolvedValue(undefined);
  mocks.sendBidNotifications.mockResolvedValue(undefined);

  // RLS client falls back to serverSupabase
  mocks.createRequestScopedClient.mockReturnValue(null);
}

// ============================================================================
// 1. JOB POSTED: homeowner creates job -> status 'posted'
// ============================================================================
describe('Job Lifecycle - 1. Job posted', () => {
  let jobsPOST: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupInfrastructureMocks(homeownerUser);

    const mod = await import('@/app/api/jobs/route');
    jobsPOST = mod.POST;
  });

  it('should create a job with status "posted"', async () => {
    const newJob = {
      id: JOB_ID,
      title: 'Fix leaking bathroom tap',
      description:
        'The kitchen tap has been leaking for a week and needs repair',
      category: 'plumbing',
      budget: 200,
      status: 'posted',
      homeowner_id: homeownerUser.id,
      created_at: new Date().toISOString(),
    };

    mocks.jobCreationServiceCreateJob.mockResolvedValue(newJob);

    const req = createPostRequest('http://localhost:3000/api/jobs', {
      title: 'Fix leaking bathroom tap',
      description:
        'The kitchen tap has been leaking for a week and needs repair',
      category: 'plumbing',
      budget: 200,
      location: 'London, UK',
    });

    const res = await jobsPOST(req, noSegment());
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.job.id).toBe(JOB_ID);
    expect(body.job.status).toBe('posted');
    expect(body.job.homeowner_id).toBe(homeownerUser.id);
  });
});

// ============================================================================
// 2. BID SUBMITTED: contractor submits bid -> bid status 'pending'
// ============================================================================
describe('Job Lifecycle - 2. Bid submitted', () => {
  let submitBidPOST: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupInfrastructureMocks(contractorUser);

    const mod = await import('@/app/api/contractor/submit-bid/route');
    submitBidPOST = mod.POST;
  });

  it('should create a bid with status "pending" for a posted job', async () => {
    // Job is posted and open for bids
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        // 2026-05-26 audit-63 gate: route reads the contractor's
        // verification status before allowing a bid. Return a verified
        // contractor so the bid proceeds.
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  verification_status: 'verified',
                  admin_verified: true,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  title: 'Fix leaking tap',
                  status: 'posted',
                  budget: 200,
                  homeowner_id: homeownerUser.id,
                  homeowner: {
                    id: homeownerUser.id,
                    email: homeownerUser.email,
                    first_name: 'Alice',
                    last_name: 'Homeowner',
                  },
                  contractor_id: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'bids') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
              neq: vi
                .fn()
                .mockResolvedValue({ count: 0, data: [], error: null }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    mocks.processBid.mockResolvedValue({
      bid: {
        id: BID_ID,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
      isUpdate: false,
    });

    const req = createPostRequest(
      'http://localhost:3000/api/contractor/submit-bid',
      {
        jobId: JOB_ID,
        bidAmount: 150,
        proposalText:
          'I can fix your tap quickly and efficiently. I have 10 years of plumbing experience.',
      }
    );

    const res = await submitBidPOST(req, noSegment());
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.bid.status).toBe('pending');
    expect(body.bid.jobId).toBe(JOB_ID);
  });
});

// ============================================================================
// 3. BID ACCEPTED: homeowner accepts bid -> bid 'accepted', others 'rejected',
//    job 'assigned', contract auto-created
// ============================================================================
describe('Job Lifecycle - 3. Bid accepted', () => {
  let acceptBidPOST: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupInfrastructureMocks(homeownerUser);

    const mod = await import('@/app/api/jobs/[id]/bids/[bidId]/accept/route');
    acceptBidPOST = mod.POST;
  });

  it('should accept the winning bid, reject others, assign contractor, and create contract', async () => {
    const updateCalls: Array<{ table: string; data: Record<string, unknown> }> =
      [];

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  homeowner_id: homeownerUser.id,
                  status: 'posted',
                  title: 'Fix leaking tap',
                  amount: 150,
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn((data: Record<string, unknown>) => {
            updateCalls.push({ table: 'jobs', data });
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }
      if (table === 'bids') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: BID_ID,
                    job_id: JOB_ID,
                    contractor_id: contractorUser.id,
                    status: 'pending',
                    amount: 150,
                  },
                  error: null,
                }),
                // For the "any already accepted?" check
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
              // For the "rejected bids" list
              neq: vi.fn().mockResolvedValue({ error: null }),
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          update: vi.fn((data: Record<string, unknown>) => {
            updateCalls.push({ table: 'bids', data });
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  neq: vi.fn().mockResolvedValue({ error: null }),
                }),
                neq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }),
        };
      }
      if (table === 'profiles') {
        // 2026-05-25 audit-46 P0: bid-accept now requires the contractor's
        // real payout-readiness flags (stripe_payouts_enabled +
        // stripe_transfers_active), not just stripe_connect_account_id.
        // Mark the contractor fully payout-ready so acceptance proceeds.
        const profileData = {
          first_name: 'Bob',
          last_name: 'Contractor',
          email: 'contractor@test.com',
          stripe_connect_account_id: 'acct_test',
          stripe_payouts_enabled: true,
          stripe_transfers_active: true,
          company_name: null,
          license_number: null,
          license_type: null,
        };
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: profileData, error: null }),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: profileData, error: null }),
            }),
          }),
        };
      }
      if (table === 'contracts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'message_threads') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: { id: 'thread-1' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'messages') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/jobs/${JOB_ID}/bids/${BID_ID}/accept`
    );

    const res = await acceptBidPOST(req, segmentData(JOB_ID, BID_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('accepted');

    // Verify bid status was transitioned (validateBidTransition called)
    expect(mocks.validateBidTransition).toHaveBeenCalled();

    // Verify job status transition was validated
    expect(mocks.validateStatusTransition).toHaveBeenCalled();

    // Verify notifications were created for contractor
    expect(mocks.createNotification).toHaveBeenCalled();

    // Verify idempotency result was stored
    expect(mocks.storeIdempotencyResult).toHaveBeenCalled();
  });
});

// ============================================================================
// 4. CONTRACT SIGNED: both parties sign -> contract status 'accepted'
// ============================================================================
describe('Job Lifecycle - 4. Contract signed by both parties', () => {
  let acceptContractPOST: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import('@/app/api/contracts/[id]/accept/route');
    acceptContractPOST = mod.POST;
  });

  it('should transition to pending_homeowner when contractor signs first', async () => {
    setupInfrastructureMocks(contractorUser);

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'contracts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: CONTRACT_ID,
                    job_id: JOB_ID,
                    contractor_id: contractorUser.id,
                    homeowner_id: homeownerUser.id,
                    status: 'pending_contractor',
                    title: 'Contract for Fix leaking tap',
                    contractor_signed_at: null,
                    homeowner_signed_at: null,
                    start_date: null,
                    end_date: null,
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: CONTRACT_ID,
                    job_id: JOB_ID,
                    contractor_id: contractorUser.id,
                    homeowner_id: homeownerUser.id,
                    status: 'pending_homeowner',
                    title: 'Contract for Fix leaking tap',
                    contractor_signed_at: new Date().toISOString(),
                    homeowner_signed_at: null,
                    start_date: null,
                    end_date: null,
                    amount: 150,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  title: 'Fix leaking tap',
                  location: 'London',
                  address: '123 Main St',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  first_name: 'Bob',
                  last_name: 'Contractor',
                  email: 'contractor@test.com',
                  company_name: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/contracts/${CONTRACT_ID}/accept`
    );
    const res = await acceptContractPOST(req, segmentData(CONTRACT_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.contract.status).toBe('pending_homeowner');
    expect(body.contract.contractor_signed_at).toBeTruthy();
  });

  it('should transition to "accepted" when homeowner signs after contractor', async () => {
    setupInfrastructureMocks(homeownerUser);

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'contracts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: CONTRACT_ID,
                    job_id: JOB_ID,
                    contractor_id: contractorUser.id,
                    homeowner_id: homeownerUser.id,
                    status: 'pending_homeowner',
                    title: 'Contract for Fix leaking tap',
                    contractor_signed_at: '2026-03-10T10:00:00Z',
                    homeowner_signed_at: null,
                    start_date: null,
                    end_date: null,
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: CONTRACT_ID,
                    job_id: JOB_ID,
                    contractor_id: contractorUser.id,
                    homeowner_id: homeownerUser.id,
                    status: 'accepted',
                    title: 'Contract for Fix leaking tap',
                    contractor_signed_at: '2026-03-10T10:00:00Z',
                    homeowner_signed_at: new Date().toISOString(),
                    start_date: null,
                    end_date: null,
                    amount: 150,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  title: 'Fix leaking tap',
                  location: 'London',
                  address: '123 Main St',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  first_name: 'Alice',
                  last_name: 'Homeowner',
                  email: 'homeowner@test.com',
                  company_name: null,
                  phone: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/contracts/${CONTRACT_ID}/accept`
    );
    const res = await acceptContractPOST(req, segmentData(CONTRACT_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.contract.status).toBe('accepted');
    expect(body.contract.homeowner_signed_at).toBeTruthy();
    expect(body.contract.contractor_signed_at).toBeTruthy();

    // Both parties should be notified of acceptance
    expect(mocks.createNotification).toHaveBeenCalled();
  });
});

// ============================================================================
// 5. PAYMENT INTO ESCROW: escrow status 'held'
// ============================================================================
describe('Job Lifecycle - 5. Payment into escrow', () => {
  let getEscrowGET: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupInfrastructureMocks(homeownerUser);

    const mod = await import('@/app/api/jobs/[id]/escrow/route');
    getEscrowGET = mod.GET;
  });

  it('should return escrow with status "held" after payment confirmation', async () => {
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  homeowner_id: homeownerUser.id,
                  contractor_id: contractorUser.id,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'escrow_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: ESCROW_ID,
                      job_id: JOB_ID,
                      status: 'held',
                      amount: 15000,
                      payment_intent_id: 'pi_test123',
                      created_at: '2026-03-10T10:00:00Z',
                      updated_at: '2026-03-10T10:00:00Z',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createGetRequest(
      `http://localhost:3000/api/jobs/${JOB_ID}/escrow`
    );
    const res = await getEscrowGET(req, segmentData(JOB_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.escrow).toBeTruthy();
    expect(body.escrow.status).toBe('held');
    expect(body.escrow.amount).toBe(15000);
    expect(body.escrow.jobId).toBe(JOB_ID);
  });
});

// ============================================================================
// 6. BEFORE PHOTOS UPLOADED: photo metadata stored
// ============================================================================
describe('Job Lifecycle - 6. Before photos uploaded', () => {
  let uploadBeforePOST: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupInfrastructureMocks(contractorUser);

    const mod = await import('@/app/api/jobs/[id]/photos/before/route');
    uploadBeforePOST = mod.POST;
  });

  it('should upload before photos and store metadata', async () => {
    const insertedRows: unknown[] = [];

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  contractor_id: contractorUser.id,
                  latitude: 51.5,
                  longitude: -0.1,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'job_photos_metadata') {
        return {
          insert: vi.fn((row: unknown) => {
            insertedRows.push(row);
            return { error: null };
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    // Create a FormData-like request with a mock image file
    const file = new File(['fake-image-data'], 'before-photo.jpg', {
      type: 'image/jpeg',
    });
    const formData = new FormData();
    formData.append('photos', file);
    formData.append(
      'geolocation',
      JSON.stringify({ lat: 51.5001, lng: -0.1001 })
    );

    const req = new NextRequest(
      new URL(`http://localhost:3000/api/jobs/${JOB_ID}/photos/before`),
      {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1', 'x-csrf-token': 'test' },
        body: formData,
      }
    );

    const res = await uploadBeforePOST(req, segmentData(JOB_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.photos).toHaveLength(1);

    // Verify metadata was inserted with photo_type 'before'
    expect(insertedRows.length).toBeGreaterThanOrEqual(1);
    const insertedRow = insertedRows[0] as Record<string, unknown>;
    expect(insertedRow.photo_type).toBe('before');
    expect(insertedRow.job_id).toBe(JOB_ID);
    expect(insertedRow.geolocation_verified).toBe(true);
  });
});

// ============================================================================
// 7. JOB STARTED: contractor starts job (requires photos + contract + escrow)
// ============================================================================
describe('Job Lifecycle - 7. Job started', () => {
  let startJobPOST: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupInfrastructureMocks(contractorUser);

    const mod = await import('@/app/api/jobs/[id]/start/route');
    startJobPOST = mod.POST;
  });

  it('should transition job from "assigned" to "in_progress" when all gates pass', async () => {
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  contractor_id: contractorUser.id,
                  homeowner_id: homeownerUser.id,
                  status: 'assigned',
                  title: 'Fix leaking tap',
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'contracts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: CONTRACT_ID, status: 'accepted' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'escrow_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: ESCROW_ID, status: 'held' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'job_photos_metadata') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  first_name: 'Alice',
                  last_name: 'Homeowner',
                  email: 'homeowner@test.com',
                  company_name: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/jobs/${JOB_ID}/start`
    );
    const res = await startJobPOST(req, segmentData(JOB_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('started');

    // Verify status transition was validated
    expect(mocks.validateStatusTransition).toHaveBeenCalledWith(
      'assigned',
      'in_progress'
    );

    // Verify notifications were sent
    expect(mocks.notifyJobStatusChange).toHaveBeenCalled();
  });

  it('should reject start when before photos are missing', async () => {
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  contractor_id: contractorUser.id,
                  homeowner_id: homeownerUser.id,
                  status: 'assigned',
                  title: 'Fix leaking tap',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'contracts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: CONTRACT_ID, status: 'accepted' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'escrow_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: ESCROW_ID, status: 'held' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'job_photos_metadata') {
        // No before photos
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/jobs/${JOB_ID}/start`
    );
    const res = await startJobPOST(req, segmentData(JOB_ID));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('before photo');
  });

  it('should reject start when contract is not signed', async () => {
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  contractor_id: contractorUser.id,
                  homeowner_id: homeownerUser.id,
                  status: 'assigned',
                  title: 'Fix leaking tap',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'contracts') {
        // No accepted contract
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116', message: 'no rows' },
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/jobs/${JOB_ID}/start`
    );
    const res = await startJobPOST(req, segmentData(JOB_ID));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('Contract');
  });
});

// ============================================================================
// 8. AFTER PHOTOS UPLOADED: auto-completion -> status 'completed'
// ============================================================================
describe('Job Lifecycle - 8. After photos and auto-completion', () => {
  let uploadAfterPOST: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupInfrastructureMocks(contractorUser);

    const mod = await import('@/app/api/jobs/[id]/photos/after/route');
    uploadAfterPOST = mod.POST;
  });

  it('should upload after photos and auto-complete the job', async () => {
    const insertedPhotos: unknown[] = [];
    const jobUpdates: unknown[] = [];

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  contractor_id: contractorUser.id,
                  homeowner_id: homeownerUser.id,
                  category: 'plumbing',
                  status: 'in_progress',
                  title: 'Fix leaking tap',
                  latitude: 51.5,
                  longitude: -0.1,
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn((data: unknown) => {
            jobUpdates.push(data);
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }
      if (table === 'job_photos_metadata') {
        return {
          insert: vi.fn((row: unknown) => {
            insertedPhotos.push(row);
            return { error: null };
          }),
        };
      }
      if (table === 'escrow_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: ESCROW_ID, status: 'held' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  first_name: 'Alice',
                  last_name: 'Homeowner',
                  email: 'homeowner@test.com',
                  company_name: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    // Create FormData with mock image file
    const file = new File(['fake-after-data'], 'after-photo.jpg', {
      type: 'image/jpeg',
    });
    const formData = new FormData();
    formData.append('photos', file);

    const req = new NextRequest(
      new URL(`http://localhost:3000/api/jobs/${JOB_ID}/photos/after`),
      {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1', 'x-csrf-token': 'test' },
        body: formData,
      }
    );

    const res = await uploadAfterPOST(req, segmentData(JOB_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.jobCompleted).toBe(true);

    // Verify photo metadata was stored with photo_type 'after'
    expect(insertedPhotos.length).toBeGreaterThanOrEqual(1);
    const photoRow = insertedPhotos[0] as Record<string, unknown>;
    expect(photoRow.photo_type).toBe('after');
    expect(photoRow.job_id).toBe(JOB_ID);

    // Verify job was updated to 'completed' with completed_at timestamp
    expect(jobUpdates.length).toBeGreaterThanOrEqual(1);
    const update = jobUpdates[0] as Record<string, unknown>;
    expect(update.status).toBe('completed');
    expect(update.completed_at).toBeTruthy();

    // Verify homeowner notification was created (job completed - review required)
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: homeownerUser.id,
        type: 'job_completed',
      })
    );
  });
});

// ============================================================================
// 9. HOMEOWNER APPROVES: escrow release triggered
// ============================================================================
describe('Job Lifecycle - 9. Homeowner approves completion', () => {
  let confirmCompletionPOST: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupInfrastructureMocks(homeownerUser);

    const mod = await import('@/app/api/jobs/[id]/confirm-completion/route');
    confirmCompletionPOST = mod.POST;
  });

  it('should confirm completion and trigger escrow release to release_pending', async () => {
    const escrowUpdates: unknown[] = [];

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  homeowner_id: homeownerUser.id,
                  contractor_id: contractorUser.id,
                  status: 'completed',
                  title: 'Fix leaking tap',
                  completion_confirmed_by_homeowner: false,
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'escrow_transactions') {
        // 2026-05-24 audit-33 P1: confirm-completion now pre-flights the
        // escrow row via .eq('job_id').order(...).limit(1).maybeSingle()
        // before any mutating write, then (for held rows) stamps the
        // homeowner-approval + auto_release_date fields and leaves
        // status='held' for the auto-release cron (it deliberately no
        // longer flips status to release_pending here).
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              // Legacy held lookup (kept for safety)
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: ESCROW_ID, status: 'held', amount: 15000 },
                  error: null,
                }),
              }),
              // preEscrow pre-flight: latest escrow row for the job
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: ESCROW_ID, status: 'held', amount: 15000 },
                    error: null,
                  }),
                }),
              }),
              // Escrow amount lookup for the work-approved email
              in: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { amount: 15000 },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          update: vi.fn((data: unknown) => {
            escrowUpdates.push(data);
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }
      if (table === 'job_photos_metadata') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi
                .fn()
                .mockResolvedValue({ count: 3, data: null, error: null }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  first_name: 'Bob',
                  last_name: 'Contractor',
                  email: 'contractor@test.com',
                  company_name: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/jobs/${JOB_ID}/confirm-completion`
    );
    const res = await confirmCompletionPOST(req, segmentData(JOB_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('confirmed');

    // 2026-05-13 funds-in-limbo audit fix: the route no longer flips the
    // escrow row to status='release_pending' itself. It keeps status='held'
    // (the daily auto-release cron is the canonical processor) and instead
    // stamps the homeowner-approval + auto_release_date fields so the cron
    // picks the row up on its next pass. Assert the approval stamp rather
    // than the dropped status write.
    expect(escrowUpdates.length).toBeGreaterThanOrEqual(1);
    const escrowUpdate = escrowUpdates[0] as Record<string, unknown>;
    expect(escrowUpdate.homeowner_approval).toBe(true);
    expect(escrowUpdate.auto_release_date).toBeTruthy();
    expect(escrowUpdate.release_reason).toBe('homeowner_approved');
    // status is intentionally NOT written here anymore
    expect(escrowUpdate.status).toBeUndefined();

    // The route still sanity-checks the held -> release_pending transition
    // (a guard against racing releases) even though it doesn't perform it.
    expect(mocks.validateEscrowTransition).toHaveBeenCalledWith(
      'held',
      'release_pending'
    );

    // Verify idempotency result was stored
    expect(mocks.storeIdempotencyResult).toHaveBeenCalled();
  });

  it('should reject confirmation if user is not the homeowner', async () => {
    // Different homeowner ID
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  homeowner_id: 'someone-else',
                  contractor_id: contractorUser.id,
                  status: 'completed',
                  title: 'Fix leaking tap',
                  completion_confirmed_by_homeowner: false,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/jobs/${JOB_ID}/confirm-completion`
    );
    const res = await confirmCompletionPOST(req, segmentData(JOB_ID));
    expect(res.status).toBe(403);
  });

  it('should reject confirmation if job is not in completed status', async () => {
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  homeowner_id: homeownerUser.id,
                  contractor_id: contractorUser.id,
                  status: 'in_progress',
                  title: 'Fix leaking tap',
                  completion_confirmed_by_homeowner: false,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/jobs/${JOB_ID}/confirm-completion`
    );
    const res = await confirmCompletionPOST(req, segmentData(JOB_ID));
    expect(res.status).toBe(400);
  });
});

// ============================================================================
// 10. REVIEW SUBMITTED: both parties can review
// ============================================================================
describe('Job Lifecycle - 10. Reviews submitted', () => {
  let reviewPOST: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import('@/app/api/jobs/[id]/review/route');
    reviewPOST = mod.POST;
  });

  it('should allow homeowner to submit a review for the contractor', async () => {
    setupInfrastructureMocks(homeownerUser);

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  homeowner_id: homeownerUser.id,
                  contractor_id: contractorUser.id,
                  status: 'completed',
                  title: 'Fix leaking tap',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'reviews') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116', message: 'no rows' },
                  }),
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'review-001' },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/jobs/${JOB_ID}/review`,
      {
        rating: 5,
        comment:
          'Excellent work! The tap is perfectly fixed and no more leaks.',
      }
    );

    const res = await reviewPOST(req, segmentData(JOB_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.reviewId).toBe('review-001');

    // Verify notification was sent to the contractor (reviewee)
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: contractorUser.id,
        type: 'review',
      })
    );
  });

  it('should allow contractor to submit a review for the homeowner', async () => {
    setupInfrastructureMocks(contractorUser);

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  homeowner_id: homeownerUser.id,
                  contractor_id: contractorUser.id,
                  status: 'completed',
                  title: 'Fix leaking tap',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'reviews') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116', message: 'no rows' },
                  }),
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'review-002' },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/jobs/${JOB_ID}/review`,
      {
        rating: 4,
        comment:
          'Great homeowner. Clear instructions and easy to work with overall.',
      }
    );

    const res = await reviewPOST(req, segmentData(JOB_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.reviewId).toBe('review-002');

    // Verify notification was sent to the homeowner (reviewee)
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: homeownerUser.id,
        type: 'review',
      })
    );
  });

  it('should reject duplicate review from same user', async () => {
    setupInfrastructureMocks(homeownerUser);

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  homeowner_id: homeownerUser.id,
                  contractor_id: contractorUser.id,
                  status: 'completed',
                  title: 'Fix leaking tap',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'reviews') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  // Already reviewed
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'existing-review' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/jobs/${JOB_ID}/review`,
      {
        rating: 5,
        comment:
          'Trying to leave a duplicate review here with enough characters.',
      }
    );

    const res = await reviewPOST(req, segmentData(JOB_ID));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('already reviewed');
  });

  it('should reject review for non-completed job', async () => {
    setupInfrastructureMocks(homeownerUser);

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: JOB_ID,
                  homeowner_id: homeownerUser.id,
                  contractor_id: contractorUser.id,
                  status: 'in_progress',
                  title: 'Fix leaking tap',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createPostRequest(
      `http://localhost:3000/api/jobs/${JOB_ID}/review`,
      {
        rating: 5,
        comment:
          'Trying to review a job that is not yet completed with enough chars.',
      }
    );

    const res = await reviewPOST(req, segmentData(JOB_ID));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('completed');
  });
});
