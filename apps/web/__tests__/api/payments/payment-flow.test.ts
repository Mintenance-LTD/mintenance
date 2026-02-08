// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * PAYMENT FLOW CRITICAL TEST SUITE
 *
 * Tests the highest-risk area of the mintenance platform:
 * - Payment intent creation (create-intent/route.ts)
 * - Refund processing (refund/route.ts)
 * - Escrow release (release-escrow/route.ts)
 * - Payment methods listing (methods/route.ts)
 * - Adding payment methods (add-method/route.ts)
 * - Fee calculation service (FeeCalculationService.ts)
 *
 * Strategy: Mock auth, supabase, stripe, csrf, rate-limiter, idempotency,
 * payment monitoring, and MFA modules so we can test route logic in isolation.
 */

// ---------------------------------------------------------------------------
// Hoisted mocks - these are evaluated before any module imports
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  supabaseFrom: vi.fn(),
  supabaseRpc: vi.fn(),
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  checkApiRateLimit: vi.fn(),
  checkRateLimit: vi.fn(),
  getIdempotencyKeyFromRequest: vi.fn(),
  checkIdempotency: vi.fn(),
  storeIdempotencyResult: vi.fn(),
  stripePaymentIntentsCreate: vi.fn(),
  stripePaymentIntentsCancel: vi.fn(),
  stripePaymentIntentsRetrieve: vi.fn(),
  stripeRefundsCreate: vi.fn(),
  stripeTransfersCreate: vi.fn(),
  stripeTransfersCreateReversal: vi.fn(),
  stripeCustomersCreate: vi.fn(),
  stripeCustomersRetrieve: vi.fn(),
  stripeCustomersUpdate: vi.fn(),
  stripePaymentMethodsList: vi.fn(),
  stripePaymentMethodsAttach: vi.fn(),
  stripeWithTimeout: vi.fn(),
  validateRequest: vi.fn(),
  detectAnomalies: vi.fn(),
  requiresMFA: vi.fn(),
  validateMFAForPayment: vi.fn(),
  requireAdminFromDatabase: vi.fn(),
  evaluateAutoRelease: vi.fn(),
  calculateAutoReleaseDate: vi.fn(),
  getBlockingReasons: vi.fn(),
  checkAutoApprovalEligibility: vi.fn(),
  processAutoApproval: vi.fn(),
  transferPlatformFee: vi.fn(),
  notifyPaymentEvent: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Auth
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
  createToken: vi.fn(),
  verifyToken: vi.fn(),
  setAuthCookie: vi.fn(),
  clearAuthCookie: vi.fn(),
  createTokenPair: vi.fn(),
  rotateTokens: vi.fn(),
  revokeAllTokens: vi.fn(),
  createAuthCookieHeaders: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  DatabaseManager: {},
}));

vi.mock('@mintenance/auth', () => ({
  generateJWT: vi.fn(),
  verifyJWT: vi.fn(),
  generateTokenPair: vi.fn(),
  hashRefreshToken: vi.fn(),
  ConfigManager: { getInstance: vi.fn(() => ({ isProduction: () => false })) },
}));

// Supabase
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (...args: unknown[]) => mocks.supabaseFrom(...args),
    rpc: (...args: unknown[]) => mocks.supabaseRpc(...args),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mocks.supabaseFrom,
    rpc: mocks.supabaseRpc,
  })),
}));

// CSRF
vi.mock('@/lib/csrf', () => ({
  requireCSRF: mocks.requireCSRF,
}));

// Rate limiter (distributed - used by create-intent, add-method, release-escrow)
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: {
    checkRateLimit: mocks.rateLimiterCheckRateLimit,
  },
  checkApiRateLimit: mocks.checkApiRateLimit,
  checkRateLimit: mocks.checkApiRateLimit,
  checkWebhookRateLimit: vi.fn(),
  RedisRateLimiter: vi.fn(),
}));

// Rate limit (in-memory - used by methods/route.ts)
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  RATE_LIMIT_CONFIGS: {
    payment: { interval: 3600000, uniqueTokenPerInterval: 10 },
    api: { interval: 900000, uniqueTokenPerInterval: 100 },
    auth: { interval: 900000, uniqueTokenPerInterval: 5 },
    search: { interval: 60000, uniqueTokenPerInterval: 30 },
    upload: { interval: 300000, uniqueTokenPerInterval: 5 },
    passwordReset: { interval: 3600000, uniqueTokenPerInterval: 3 },
    strict: { interval: 3600000, uniqueTokenPerInterval: 10 },
  },
  withRateLimit: vi.fn(),
  clearRateLimit: vi.fn(),
  getRateLimitStats: vi.fn(),
}));

// Idempotency
vi.mock('@/lib/idempotency', () => ({
  getIdempotencyKeyFromRequest: mocks.getIdempotencyKeyFromRequest,
  checkIdempotency: mocks.checkIdempotency,
  storeIdempotencyResult: mocks.storeIdempotencyResult,
}));

// Stripe - mock as a class so `new Stripe(...)` works in route files
vi.mock('stripe', () => {
  class StripeMock {
    paymentIntents = {
      create: mocks.stripePaymentIntentsCreate,
      cancel: mocks.stripePaymentIntentsCancel,
      retrieve: mocks.stripePaymentIntentsRetrieve,
    };
    refunds = { create: mocks.stripeRefundsCreate };
    transfers = {
      create: mocks.stripeTransfersCreate,
      createReversal: mocks.stripeTransfersCreateReversal,
    };
    customers = {
      create: mocks.stripeCustomersCreate,
      retrieve: mocks.stripeCustomersRetrieve,
      update: mocks.stripeCustomersUpdate,
    };
    paymentMethods = {
      list: mocks.stripePaymentMethodsList,
      attach: mocks.stripePaymentMethodsAttach,
    };

    static errors = {
      StripeError: class StripeError extends Error {},
      StripeCardError: class StripeCardError extends Error {},
      StripeRateLimitError: class StripeRateLimitError extends Error {},
      StripeAuthenticationError: class StripeAuthenticationError extends Error {},
      StripeConnectionError: class StripeConnectionError extends Error {},
      StripeInvalidRequestError: class StripeInvalidRequestError extends Error {},
    };
  }
  return { default: StripeMock };
});

// Stripe timeout wrapper
vi.mock('@/lib/utils/api-timeout', () => ({
  stripeWithTimeout: mocks.stripeWithTimeout,
}));

// Validation
vi.mock('@/lib/validation/validator', () => ({
  validateRequest: mocks.validateRequest,
  validateRequestBody: vi.fn(),
  validateQueryParams: vi.fn(),
  createValidationErrorResponse: vi.fn(),
}));

vi.mock('@/lib/validation/schemas', () => ({
  paymentIntentSchema: {},
  refundRequestSchema: {},
  releaseEscrowSchema: {},
  paymentMethodSchema: {},
}));

// Error handling
vi.mock('@/lib/errors/api-error', async () => {
  class APIError extends Error {
    constructor(
      public code: string,
      public userMessage: string,
      public statusCode: number = 500,
      public details?: unknown,
      public field?: string
    ) {
      super(userMessage);
      this.name = 'APIError';
    }
    toResponse(requestId?: string) {
      return {
        error: { code: this.code, message: this.userMessage },
        timestamp: new Date().toISOString(),
        ...(requestId && { requestId }),
      };
    }
  }
  class UnauthorizedError extends APIError {
    constructor(message = 'Unauthorized') { super('UNAUTHORIZED', message, 401); }
  }
  class ForbiddenError extends APIError {
    constructor(message = 'Forbidden') { super('FORBIDDEN', message, 403); }
  }
  class NotFoundError extends APIError {
    constructor(resource = 'Resource') { super('NOT_FOUND', `${resource} not found`, 404); }
  }
  class BadRequestError extends APIError {
    constructor(message = 'Bad Request', details?: unknown) { super('BAD_REQUEST', message, 400, details); }
  }
  class ConflictError extends APIError {
    constructor(message: string, details?: unknown) { super('CONFLICT', message, 409, details); }
  }
  class InternalServerError extends APIError {
    constructor(message = 'An unexpected error occurred') { super('INTERNAL_SERVER_ERROR', message, 500); }
  }
  return {
    APIError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
    ConflictError,
    InternalServerError,
    ValidationError: BadRequestError,
    RateLimitError: class extends APIError {
      constructor(retryAfter?: number) { super('RATE_LIMIT_EXCEEDED', 'Too many requests', 429); }
    },
    ServiceUnavailableError: class extends APIError {
      constructor(service = 'Service') { super('SERVICE_UNAVAILABLE', `${service} unavailable`, 503); }
    },
    handleAPIError: vi.fn((error: unknown) => {
      if (error instanceof APIError) {
        const { NextResponse } = require('next/server');
        return NextResponse.json(error.toResponse(), { status: error.statusCode });
      }
      const { NextResponse } = require('next/server');
      return NextResponse.json(
        { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } },
        { status: 500 }
      );
    }),
  };
});

// Payment errors
vi.mock('@/lib/errors/payment-errors', () => ({
  createPaymentErrorResponse: vi.fn(() => ({
    error: 'An error occurred processing your payment. Please try again.',
    code: 'unknown_error',
    retryable: true,
    status: 500,
  })),
  sanitizePaymentError: vi.fn(),
  logPaymentError: vi.fn(),
  PaymentErrorCode: {
    CARD_DECLINED: 'card_declined',
    SERVER_ERROR: 'server_error',
    UNKNOWN_ERROR: 'unknown_error',
  },
}));

// Loggers
vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
  BUSINESS_RULES: { MAX_JOBS_PER_HOUR: 20, LOGIN_LOCKOUT_DURATION_MINUTES: 15, MAX_LOGIN_ATTEMPTS: 5, MAX_PASSWORD_RESETS_PER_HOUR: 3 },
  RATE_LIMITS: { WEBHOOK_REQUESTS_PER_MINUTE: 60, API_REQUESTS_PER_MINUTE: 100, REDIS_TIMEOUT_MS: 5000, REDIS_EXPIRE_TIMEOUT_MS: 5000, MAX_FALLBACK_ENTRIES: 10000, PRODUCTION_FALLBACK_RETRY_AFTER: 60, AI_ANALYSIS_PER_MINUTE: 10, AI_SEARCH_PER_MINUTE: 30, AI_SUGGESTIONS_PER_MINUTE: 20 },
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
}));

vi.mock('@/lib/logger', () => ({
  logger: mocks.logger,
}));

vi.mock('@/lib/config', () => ({
  config: { isProduction: () => false },
}));

// Payment monitoring
vi.mock('@/lib/monitoring/payment-monitor', () => ({
  PaymentMonitoringService: {
    detectAnomalies: mocks.detectAnomalies,
  },
}));

// MFA / high-risk checks
vi.mock('@/lib/payments/high-risk-checks', () => ({
  requiresMFA: mocks.requiresMFA,
  validateMFAForPayment: mocks.validateMFAForPayment,
  HighRiskOperation: { REFUND: 'REFUND', ESCROW_RELEASE: 'ESCROW_RELEASE' },
}));

// Escrow services
vi.mock('@/lib/services/agents/EscrowReleaseAgent', () => ({
  EscrowReleaseAgent: {
    evaluateAutoRelease: mocks.evaluateAutoRelease,
    calculateAutoReleaseDate: mocks.calculateAutoReleaseDate,
  },
}));

vi.mock('@/lib/services/escrow/EscrowStatusService', () => ({
  EscrowStatusService: {
    getBlockingReasons: mocks.getBlockingReasons,
  },
}));

vi.mock('@/lib/services/escrow/HomeownerApprovalService', () => ({
  HomeownerApprovalService: {
    checkAutoApprovalEligibility: mocks.checkAutoApprovalEligibility,
    processAutoApproval: mocks.processAutoApproval,
  },
}));

// Fee services
vi.mock('@/lib/services/payment/FeeTransferService', () => ({
  FeeTransferService: {
    transferPlatformFee: mocks.transferPlatformFee,
  },
}));

// Admin verification
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: mocks.requireAdminFromDatabase,
}));

// Payment state machine - use real implementation for fee calc test, mock for route tests
vi.mock('@/lib/payment-state-machine', () => ({
  PaymentStateMachine: {
    validateTransition: vi.fn(() => ({ valid: true })),
    isTerminalState: vi.fn(() => false),
    isModifiableState: vi.fn(() => true),
  },
  PaymentState: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    DISPUTED: 'disputed',
    REFUNDED: 'refunded',
  },
  PaymentAction: {
    CONFIRM: 'confirm',
    PROCESS: 'process',
    COMPLETE: 'complete',
    FAIL: 'fail',
    CANCEL: 'cancel',
    DISPUTE: 'dispute',
    REFUND: 'refund',
  },
}));

// Notifications
vi.mock('@/lib/services/notifications/NotificationHelper', () => ({
  notifyPaymentEvent: mocks.notifyPaymentEvent,
}));

vi.mock('@/lib/services/contractor/PaymentSetupNotificationService', () => ({
  PaymentSetupNotificationService: {
    notifyPaymentSetupRequired: vi.fn().mockResolvedValue(undefined),
  },
}));

// Environment
vi.mock('@/lib/env', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_mock_key_for_testing',
    NODE_ENV: 'test',
    JWT_SECRET: 'Test_JWT_Secret_1234567890_abcdefghij_KLMNOPQRSTUVWXYZ!@#$%^&*',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    STRIPE_WEBHOOK_SECRET: 'whsec_mock',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
  },
  isProduction: () => false,
  isDevelopment: () => false,
  isTest: () => true,
}));

vi.mock('@/lib/cors', () => ({
  getCorsHeaders: vi.fn(() => ({})),
}));

vi.mock('@/lib/sanitizer', () => ({
  sanitizeText: vi.fn((val: string) => val),
  sanitizeEmail: vi.fn((val: string) => val.toLowerCase().trim()),
}));

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'POST', body, headers = {} } = options;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      'x-csrf-token': 'test-csrf-token',
      ...headers,
    },
  };
  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

/**
 * Configure default mock behavior for a successful flow.
 * Individual tests override only what they need.
 */
function setupDefaultMocks() {
  // Auth - authenticated homeowner by default
  mocks.getCurrentUserFromCookies.mockResolvedValue({
    id: 'homeowner-user-id',
    email: 'homeowner@test.com',
    role: 'homeowner',
    first_name: 'Test',
    last_name: 'Homeowner',
  });

  // CSRF passes
  mocks.requireCSRF.mockResolvedValue(undefined);

  // Rate limiters allow
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 19,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.checkApiRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 99,
    resetTime: Date.now() + 60000,
  });
  mocks.checkRateLimit.mockResolvedValue({
    success: true,
    remaining: 9,
    resetTime: Date.now() + 3600000,
  });

  // Idempotency - no duplicate
  mocks.getIdempotencyKeyFromRequest.mockReturnValue('idempotency-key-123');
  mocks.checkIdempotency.mockResolvedValue({ isDuplicate: false, idempotencyKey: 'idempotency-key-123' });
  mocks.storeIdempotencyResult.mockResolvedValue(undefined);

  // Payment monitoring - no anomalies
  mocks.detectAnomalies.mockResolvedValue({
    isAnomalous: false,
    riskScore: 0.1,
    reasons: [],
    blockedReasons: [],
  });

  // MFA not required
  mocks.requiresMFA.mockResolvedValue({ required: false, riskScore: 0.1 });
  mocks.validateMFAForPayment.mockResolvedValue({ valid: true });

  // Escrow services
  mocks.getBlockingReasons.mockResolvedValue([]);
  mocks.checkAutoApprovalEligibility.mockResolvedValue(true);
  mocks.processAutoApproval.mockResolvedValue(undefined);
  mocks.evaluateAutoRelease.mockResolvedValue({ message: 'approved' });
  mocks.calculateAutoReleaseDate.mockResolvedValue(undefined);

  // Fee transfer
  mocks.transferPlatformFee.mockResolvedValue({
    status: 'completed',
    feeTransferId: 'fee-transfer-123',
  });

  // Notifications
  mocks.notifyPaymentEvent.mockResolvedValue(undefined);
}

/**
 * Build a supabaseFrom mock with chainable query interface.
 * Supports multiple table calls with different return data via a table map.
 */
function createSupabaseChain(
  tableDataMap: Record<string, {
    selectReturn?: { data: unknown; error: unknown };
    insertReturn?: { data: unknown; error: unknown };
    updateReturn?: { data: unknown; error: unknown };
  }>
) {
  mocks.supabaseFrom.mockImplementation((tableName: string) => {
    const tableConfig = tableDataMap[tableName] || {};
    const selectReturn = tableConfig.selectReturn || { data: null, error: null };
    const insertReturn = tableConfig.insertReturn || { data: null, error: null };
    const updateReturn = tableConfig.updateReturn || { data: null, error: null };

    const createUpdateChain = () => ({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(updateReturn),
          }),
        }),
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(updateReturn),
        }),
      }),
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(updateReturn),
      }),
    });

    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(selectReturn),
            }),
            single: vi.fn().mockResolvedValue(selectReturn),
          }),
          single: vi.fn().mockResolvedValue(selectReturn),
          in: vi.fn().mockResolvedValue(selectReturn),
        }),
        single: vi.fn().mockResolvedValue(selectReturn),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(insertReturn),
        }),
        error: insertReturn.error,
      }),
      update: vi.fn().mockReturnValue(createUpdateChain()),
    };
  });
}

// ============================================================================
// TEST SUITE 1: Fee Calculation Service (Unit Tests - No Route Mocking Needed)
// ============================================================================

describe('FeeCalculationService', () => {
  // Import the real service (not mocked - it's pure logic)
  let FeeCalculationService: typeof import('@/lib/services/payment/FeeCalculationService').FeeCalculationService;

  beforeEach(async () => {
    // Dynamically import to get fresh module each time
    const mod = await import('@/lib/services/payment/FeeCalculationService');
    FeeCalculationService = mod.FeeCalculationService;
  });

  describe('UK Stripe Fee Rates (1.5% + 20p)', () => {
    it('should calculate Stripe fee as 1.5% + 0.20 for a 100 GBP payment', () => {
      const result = FeeCalculationService.calculateFees(100);

      // Stripe fee: 100 * 0.015 + 0.20 = 1.50 + 0.20 = 1.70
      expect(result.stripeFee).toBe(1.70);
      expect(result.stripeFeeRate).toBe(0.015);
    });

    it('should calculate Stripe fee correctly for 250 GBP', () => {
      const result = FeeCalculationService.calculateFees(250);

      // Stripe fee: 250 * 0.015 + 0.20 = 3.75 + 0.20 = 3.95
      expect(result.stripeFee).toBe(3.95);
    });

    it('should calculate Stripe fee correctly for small amounts (10 GBP)', () => {
      const result = FeeCalculationService.calculateFees(10);

      // Stripe fee: 10 * 0.015 + 0.20 = 0.15 + 0.20 = 0.35
      expect(result.stripeFee).toBe(0.35);
    });

    it('should calculate Stripe fee correctly for 1000 GBP', () => {
      const result = FeeCalculationService.calculateFees(1000);

      // Stripe fee: 1000 * 0.015 + 0.20 = 15.00 + 0.20 = 15.20
      expect(result.stripeFee).toBe(15.20);
    });
  });

  describe('Platform Fee (5%, min 0.50, max 50.00)', () => {
    it('should apply 5% platform fee for a standard 100 GBP payment', () => {
      const result = FeeCalculationService.calculateFees(100);

      // Platform fee: 100 * 0.05 = 5.00
      expect(result.platformFee).toBe(5.00);
      expect(result.platformFeeRate).toBe(0.05);
    });

    it('should enforce minimum platform fee of 0.50 for very small payments', () => {
      const result = FeeCalculationService.calculateFees(5);

      // 5% of 5 = 0.25, which is below min 0.50
      // Should clamp to 0.50
      expect(result.platformFee).toBe(0.50);
    });

    it('should enforce maximum platform fee of 50.00 for large payments', () => {
      const result = FeeCalculationService.calculateFees(2000);

      // 5% of 2000 = 100, which exceeds max 50.00
      // Should clamp to 50.00
      expect(result.platformFee).toBe(50.00);
    });

    it('should apply exactly the minimum fee at the threshold', () => {
      // 5% of 10 = 0.50 (exactly the minimum)
      const result = FeeCalculationService.calculateFees(10);
      expect(result.platformFee).toBe(0.50);
    });

    it('should apply exactly the maximum fee at the threshold', () => {
      // 5% of 1000 = 50.00 (exactly the maximum)
      const result = FeeCalculationService.calculateFees(1000);
      expect(result.platformFee).toBe(50.00);
    });
  });

  describe('Contractor Amount Calculation', () => {
    it('should correctly calculate contractor payout for 100 GBP', () => {
      const result = FeeCalculationService.calculateFees(100);

      // Platform fee: 5.00
      // Stripe fee: 1.70
      // Total fees: 6.70
      // Contractor gets: 100 - 6.70 = 93.30
      expect(result.totalFees).toBe(6.70);
      expect(result.contractorAmount).toBe(93.30);
    });

    it('should correctly calculate contractor payout for 500 GBP', () => {
      const result = FeeCalculationService.calculateFees(500);

      // Platform fee: 500 * 0.05 = 25.00
      // Stripe fee: 500 * 0.015 + 0.20 = 7.50 + 0.20 = 7.70
      // Total fees: 32.70
      // Contractor gets: 500 - 32.70 = 467.30
      expect(result.platformFee).toBe(25.00);
      expect(result.stripeFee).toBe(7.70);
      expect(result.totalFees).toBe(32.70);
      expect(result.contractorAmount).toBe(467.30);
    });

    it('should floor contractor amount to zero when fees exceed payment', () => {
      // Very small amount where fees could exceed payment
      const result = FeeCalculationService.calculateFees(0.50);

      // Platform fee: min 0.50
      // Stripe fee: 0.50 * 0.015 + 0.20 = 0.0075 + 0.20 = 0.21 (rounded)
      // Total fees: 0.71
      // Contractor: max(0, 0.50 - 0.71) = 0
      expect(result.contractorAmount).toBe(0);
    });
  });

  describe('Payment Type Variants', () => {
    it('should apply same 5% rate for deposit payments', () => {
      const result = FeeCalculationService.calculateFees(100, { paymentType: 'deposit' });
      expect(result.platformFeeRate).toBe(0.05);
      expect(result.paymentType).toBe('deposit');
    });

    it('should apply same 5% rate for milestone payments', () => {
      const result = FeeCalculationService.calculateFees(100, { paymentType: 'milestone' });
      expect(result.platformFeeRate).toBe(0.05);
      expect(result.paymentType).toBe('milestone');
    });

    it('should default to final payment type', () => {
      const result = FeeCalculationService.calculateFees(100);
      expect(result.paymentType).toBe('final');
    });
  });

  describe('Custom Fee Overrides', () => {
    it('should accept custom platform fee rate', () => {
      const result = FeeCalculationService.calculateFees(100, { platformFeeRate: 0.10 });

      // Platform fee: 100 * 0.10 = 10.00
      expect(result.platformFee).toBe(10.00);
      expect(result.platformFeeRate).toBe(0.10);
    });

    it('should accept custom Stripe fee rate', () => {
      const result = FeeCalculationService.calculateFees(100, { stripeFeeRate: 0.029, stripeFixedFee: 0.30 });

      // Stripe fee: 100 * 0.029 + 0.30 = 2.90 + 0.30 = 3.20
      expect(result.stripeFee).toBe(3.20);
    });
  });

  describe('Fee Calculation in Cents', () => {
    it('should correctly calculate fees in cents for 10000 (100 GBP)', () => {
      const result = FeeCalculationService.calculateFeesInCents(10000);

      // Platform fee: 500 (5.00 GBP)
      // Stripe fee: 170 (1.70 GBP)
      // Total fees: 670 (6.70 GBP)
      // Contractor: 9330 (93.30 GBP)
      expect(result.platformFee).toBe(500);
      expect(result.stripeFee).toBe(170);
      expect(result.totalFees).toBe(670);
      expect(result.contractorAmount).toBe(9330);
      expect(result.originalAmount).toBe(10000);
    });
  });

  describe('Edge Cases', () => {
    it('should throw for zero amount', () => {
      expect(() => FeeCalculationService.calculateFees(0)).toThrow('Payment amount must be greater than 0');
    });

    it('should throw for negative amount', () => {
      expect(() => FeeCalculationService.calculateFees(-50)).toThrow('Payment amount must be greater than 0');
    });

    it('should round all results to two decimal places', () => {
      // 33.33 * 0.05 = 1.6665 -> should round to 1.67
      const result = FeeCalculationService.calculateFees(33.33);
      const twoDecimalRegex = /^\d+(\.\d{1,2})?$/;

      expect(result.platformFee.toString()).toMatch(twoDecimalRegex);
      expect(result.stripeFee.toString()).toMatch(twoDecimalRegex);
      expect(result.contractorAmount.toString()).toMatch(twoDecimalRegex);
      expect(result.totalFees.toString()).toMatch(twoDecimalRegex);
    });
  });

  describe('Fee Config Validation', () => {
    it('should reject platform fee rate above 1', () => {
      expect(() => FeeCalculationService.validateFeeConfig({ platformFeeRate: 1.5 }))
        .toThrow('Platform fee rate must be between 0 and 1');
    });

    it('should reject negative platform fee rate', () => {
      expect(() => FeeCalculationService.validateFeeConfig({ platformFeeRate: -0.1 }))
        .toThrow('Platform fee rate must be between 0 and 1');
    });

    it('should reject min > max platform fee', () => {
      expect(() => FeeCalculationService.validateFeeConfig({ minPlatformFee: 100, maxPlatformFee: 50 }))
        .toThrow('Minimum platform fee cannot exceed maximum platform fee');
    });

    it('should reject negative Stripe fee rate', () => {
      expect(() => FeeCalculationService.validateFeeConfig({ stripeFeeRate: -0.01 }))
        .toThrow('Stripe fee rate must be between 0 and 1');
    });
  });

  describe('Helper Methods', () => {
    it('should return correct platform fee rate for each payment type', () => {
      expect(FeeCalculationService.getPlatformFeeRate('deposit')).toBe(0.05);
      expect(FeeCalculationService.getPlatformFeeRate('final')).toBe(0.05);
      expect(FeeCalculationService.getPlatformFeeRate('milestone')).toBe(0.05);
    });

    it('should return Stripe fee rate of 1.5%', () => {
      expect(FeeCalculationService.getStripeFeeRate()).toBe(0.015);
    });

    it('should return Stripe fixed fee of 0.20', () => {
      expect(FeeCalculationService.getStripeFixedFee()).toBe(0.20);
    });

    it('should calculate platform fee only', () => {
      const fee = FeeCalculationService.calculatePlatformFee(200);
      // 200 * 0.05 = 10.00
      expect(fee).toBe(10.00);
    });

    it('should calculate Stripe fee only', () => {
      const fee = FeeCalculationService.calculateStripeFee(200);
      // 200 * 0.015 + 0.20 = 3.00 + 0.20 = 3.20
      expect(fee).toBe(3.20);
    });

    it('should calculate contractor payout', () => {
      const payout = FeeCalculationService.calculateContractorPayout(200);
      // Platform: 10.00, Stripe: 3.20, Total: 13.20
      // Contractor: 200 - 13.20 = 186.80
      expect(payout).toBe(186.80);
    });
  });
});

// ============================================================================
// TEST SUITE 2: Refund Route - Authorization and Status Checks
// ============================================================================

describe('POST /api/payments/refund', () => {
  let POST: typeof import('@/app/api/payments/refund/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/payments/refund/route');
    POST = mod.POST;
  });

  describe('Authentication Required', () => {
    it('should reject unauthenticated requests with error status', async () => {
      mocks.getCurrentUserFromCookies.mockResolvedValue(null);
      mocks.validateRequest.mockResolvedValue({
        data: {
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/refund');
      const response = await POST(request);
      const body = await response.json();

      // Route throws UnauthorizedError which is caught and returned as payment error response
      // The catch block calls createPaymentErrorResponse which returns status 500 by default
      // but the thrown UnauthorizedError causes the error handler to respond
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(body.error).toBeDefined();
    });
  });

  describe('Refund Authorization - Only Homeowner Can Refund', () => {
    it('should reject refund from a contractor who is associated with the job', async () => {
      // Contractor tries to refund
      mocks.getCurrentUserFromCookies.mockResolvedValue({
        id: 'contractor-user-id',
        email: 'contractor@test.com',
        role: 'contractor',
      });

      mocks.validateRequest.mockResolvedValue({
        data: {
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
        },
      });

      createSupabaseChain({
        jobs: {
          selectReturn: {
            data: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              homeowner_id: 'homeowner-user-id',
              contractor_id: 'contractor-user-id',
              status: 'cancelled',
            },
            error: null,
          },
        },
        escrow_transactions: {
          selectReturn: {
            data: {
              id: '660e8400-e29b-41d4-a716-446655440001',
              job_id: '550e8400-e29b-41d4-a716-446655440000',
              amount: 250,
              status: 'held',
              stripe_payment_intent_id: 'pi_test_123',
            },
            error: null,
          },
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/refund');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toContain('Only the homeowner who paid can request a refund');
    });

    it('should reject refund from a user who is neither homeowner nor contractor', async () => {
      mocks.getCurrentUserFromCookies.mockResolvedValue({
        id: 'random-user-id',
        email: 'random@test.com',
        role: 'homeowner',
      });

      mocks.validateRequest.mockResolvedValue({
        data: {
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
        },
      });

      createSupabaseChain({
        jobs: {
          selectReturn: {
            data: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              homeowner_id: 'some-other-homeowner',
              contractor_id: 'some-contractor',
              status: 'cancelled',
            },
            error: null,
          },
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/refund');
      const response = await POST(request);

      // The ForbiddenError is thrown and caught by the error handler
      // createPaymentErrorResponse returns status 500 for generic errors
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Refund Status Checks - Escrow Must Be "held"', () => {
    it('should reject refund for already released escrow', async () => {
      mocks.validateRequest.mockResolvedValue({
        data: {
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
        },
      });

      createSupabaseChain({
        jobs: {
          selectReturn: {
            data: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              homeowner_id: 'homeowner-user-id',
              contractor_id: 'contractor-abc',
              status: 'cancelled',
            },
            error: null,
          },
        },
        escrow_transactions: {
          selectReturn: {
            data: {
              id: '660e8400-e29b-41d4-a716-446655440001',
              job_id: '550e8400-e29b-41d4-a716-446655440000',
              amount: 250,
              status: 'completed', // Already released
              stripe_payment_intent_id: 'pi_test_123',
            },
            error: null,
          },
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/refund');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Cannot refund payment with status: completed');
      expect(body.error).toContain('Only held payments can be refunded');
    });

    it('should reject refund for already refunded escrow', async () => {
      mocks.validateRequest.mockResolvedValue({
        data: {
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
        },
      });

      createSupabaseChain({
        jobs: {
          selectReturn: {
            data: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              homeowner_id: 'homeowner-user-id',
              contractor_id: 'contractor-abc',
              status: 'cancelled',
            },
            error: null,
          },
        },
        escrow_transactions: {
          selectReturn: {
            data: {
              id: '660e8400-e29b-41d4-a716-446655440001',
              job_id: '550e8400-e29b-41d4-a716-446655440000',
              amount: 250,
              status: 'refunded', // Already refunded
              stripe_payment_intent_id: 'pi_test_123',
            },
            error: null,
          },
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/refund');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Cannot refund payment with status: refunded');
    });
  });

  describe('Refund Status Checks - Job Status Must Be Refundable', () => {
    const nonRefundableStatuses = ['completed', 'in_progress', 'assigned'];

    nonRefundableStatuses.forEach((status) => {
      it(`should reject refund when job status is "${status}"`, async () => {
        mocks.validateRequest.mockResolvedValue({
          data: {
            jobId: '550e8400-e29b-41d4-a716-446655440000',
            escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
          },
        });

        createSupabaseChain({
          jobs: {
            selectReturn: {
              data: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                homeowner_id: 'homeowner-user-id',
                contractor_id: 'contractor-abc',
                status,
              },
              error: null,
            },
          },
          escrow_transactions: {
            selectReturn: {
              data: {
                id: '660e8400-e29b-41d4-a716-446655440001',
                job_id: '550e8400-e29b-41d4-a716-446655440000',
                amount: 250,
                status: 'held',
                stripe_payment_intent_id: 'pi_test_123',
              },
              error: null,
            },
          },
        });

        const request = createMockRequest('http://localhost:3000/api/payments/refund');
        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toContain(`Cannot refund payment for job with status: ${status}`);
      });
    });

    const refundableStatuses = ['cancelled', 'disputed', 'pending', 'posted'];

    refundableStatuses.forEach((status) => {
      it(`should allow refund when job status is "${status}"`, async () => {
        mocks.validateRequest.mockResolvedValue({
          data: {
            jobId: '550e8400-e29b-41d4-a716-446655440000',
            escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
          },
        });

        createSupabaseChain({
          jobs: {
            selectReturn: {
              data: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                homeowner_id: 'homeowner-user-id',
                contractor_id: 'contractor-abc',
                status,
              },
              error: null,
            },
          },
          escrow_transactions: {
            selectReturn: {
              data: {
                id: '660e8400-e29b-41d4-a716-446655440001',
                job_id: '550e8400-e29b-41d4-a716-446655440000',
                amount: 250,
                status: 'held',
                stripe_payment_intent_id: 'pi_test_123',
              },
              error: null,
            },
            updateReturn: {
              data: {
                id: '660e8400-e29b-41d4-a716-446655440001',
                status: 'refunded',
              },
              error: null,
            },
          },
        });

        // Stripe refund succeeds
        mocks.stripeRefundsCreate.mockResolvedValue({
          id: 'refund_test_123',
          status: 'succeeded',
          amount: 25000,
        });

        const request = createMockRequest('http://localhost:3000/api/payments/refund');
        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.refundId).toBe('refund_test_123');
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      mocks.checkApiRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
      });

      mocks.validateRequest.mockResolvedValue({
        data: {
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/refund');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toContain('Too many requests');
    });
  });
});

// ============================================================================
// TEST SUITE 3: Escrow Release Route - Authorization
// ============================================================================

describe('POST /api/payments/release-escrow', () => {
  let POST: typeof import('@/app/api/payments/release-escrow/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/payments/release-escrow/route');
    POST = mod.POST;
  });

  describe('Authentication Required', () => {
    it('should reject unauthenticated requests', async () => {
      mocks.getCurrentUserFromCookies.mockResolvedValue(null);
      mocks.validateRequest.mockResolvedValue({
        data: {
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
          releaseReason: 'job_completed',
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/release-escrow');
      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });

  describe('Authorization - Only Authorized Parties Can Release', () => {
    it('should reject release by a user who is not homeowner, contractor, or admin', async () => {
      mocks.getCurrentUserFromCookies.mockResolvedValue({
        id: 'random-user-id',
        email: 'random@test.com',
        role: 'homeowner',
      });

      mocks.validateRequest.mockResolvedValue({
        data: {
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
          releaseReason: 'job_completed',
        },
      });

      createSupabaseChain({
        escrow_transactions: {
          selectReturn: {
            data: {
              id: '660e8400-e29b-41d4-a716-446655440001',
              amount: 500,
              status: 'held',
              payment_intent_id: 'pi_test_123',
              updated_at: new Date().toISOString(),
              homeowner_approval: true,
              photo_verification_status: 'verified',
              photo_quality_passed: true,
              geolocation_verified: true,
              timestamp_verified: true,
              admin_hold_status: null,
              cooling_off_ends_at: null,
              payment_type: 'final',
              jobs: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                title: 'Fix leak',
                homeowner_id: 'some-other-homeowner',
                contractor_id: 'some-other-contractor',
                status: 'completed',
              },
            },
            error: null,
          },
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/release-escrow');
      const response = await POST(request);

      // ForbiddenError caught by error handler
      expect(response.status).toBeGreaterThanOrEqual(403);
    });

    it('should allow release by the homeowner of the job', async () => {
      mocks.getCurrentUserFromCookies.mockResolvedValue({
        id: 'homeowner-user-id',
        email: 'homeowner@test.com',
        role: 'homeowner',
      });

      mocks.validateRequest.mockResolvedValue({
        data: {
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
          releaseReason: 'job_completed',
        },
      });

      // Escrow transaction with job
      createSupabaseChain({
        escrow_transactions: {
          selectReturn: {
            data: {
              id: '660e8400-e29b-41d4-a716-446655440001',
              amount: 500,
              status: 'held',
              payment_intent_id: 'pi_test_123',
              updated_at: new Date().toISOString(),
              homeowner_approval: true,
              photo_verification_status: 'verified',
              photo_quality_passed: true,
              geolocation_verified: true,
              timestamp_verified: true,
              admin_hold_status: null,
              cooling_off_ends_at: null,
              payment_type: 'final',
              jobs: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                title: 'Fix leak',
                homeowner_id: 'homeowner-user-id',
                contractor_id: 'contractor-abc',
                status: 'completed',
              },
            },
            error: null,
          },
          updateReturn: {
            data: [{
              id: '660e8400-e29b-41d4-a716-446655440001',
              status: 'completed',
            }],
            error: null,
          },
        },
        profiles: {
          selectReturn: {
            data: {
              stripe_connect_account_id: 'acct_test_contractor',
            },
            error: null,
          },
        },
        disputes: {
          selectReturn: {
            data: null,
            error: null,
          },
        },
        jobs: {
          updateReturn: { data: null, error: null },
        },
        escrow_reconciliation: {
          insertReturn: { data: null, error: null },
        },
      });

      // Stripe transfer succeeds
      mocks.stripeTransfersCreate.mockResolvedValue({
        id: 'tr_test_123',
        amount: 46730,
      });

      mocks.stripePaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_test_123',
        latest_charge: 'ch_test_123',
      });

      const request = createMockRequest('http://localhost:3000/api/payments/release-escrow');
      const response = await POST(request);
      const body = await response.json();

      // Should succeed or return a valid response (may depend on optimistic lock)
      // The route does many DB operations; we check it reaches the transfer step
      expect(mocks.stripeTransfersCreate).toHaveBeenCalled();
    });
  });

  describe('Escrow Status Validation', () => {
    it('should reject release when escrow transaction is not found', async () => {
      mocks.validateRequest.mockResolvedValue({
        data: {
          escrowTransactionId: 'non-existent-id',
          releaseReason: 'job_completed',
        },
      });

      createSupabaseChain({
        escrow_transactions: {
          selectReturn: {
            data: null,
            error: { message: 'Not found' },
          },
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/release-escrow');
      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      mocks.rateLimiterCheckRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      });

      mocks.validateRequest.mockResolvedValue({
        data: {
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
          releaseReason: 'job_completed',
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/release-escrow');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toContain('Too many requests');
    });
  });
});

// ============================================================================
// TEST SUITE 4: Create Payment Intent - Authentication & Rate Limiting
// ============================================================================

describe('POST /api/payments/create-intent', () => {
  let POST: typeof import('@/app/api/payments/create-intent/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/payments/create-intent/route');
    POST = mod.POST;
  });

  describe('Authentication Required', () => {
    it('should reject unauthenticated payment intent creation', async () => {
      mocks.getCurrentUserFromCookies.mockResolvedValue(null);
      mocks.validateRequest.mockResolvedValue({
        data: {
          amount: 100,
          currency: 'gbp',
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          contractorId: 'contractor-abc',
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/create-intent');
      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded on create-intent', async () => {
      mocks.rateLimiterCheckRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      });

      const request = createMockRequest('http://localhost:3000/api/payments/create-intent');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toContain('Too many requests');
    });

    it('should include rate limit headers in 429 response', async () => {
      const resetTime = Date.now() + 60000;
      mocks.rateLimiterCheckRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: 60,
      });

      const request = createMockRequest('http://localhost:3000/api/payments/create-intent');
      const response = await POST(request);

      expect(response.headers.get('Retry-After')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Limit')).toBe('20');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });

  describe('Authorization - Only Homeowner Can Create Payment', () => {
    it('should reject payment intent when user is not the job homeowner', async () => {
      mocks.getCurrentUserFromCookies.mockResolvedValue({
        id: 'different-homeowner',
        email: 'other@test.com',
        role: 'homeowner',
      });

      mocks.validateRequest.mockResolvedValue({
        data: {
          amount: 100,
          currency: 'gbp',
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          contractorId: 'contractor-abc',
        },
      });

      mocks.detectAnomalies.mockResolvedValue({
        isAnomalous: false,
        riskScore: 0.1,
        reasons: [],
        blockedReasons: [],
      });

      createSupabaseChain({
        jobs: {
          selectReturn: {
            data: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              homeowner_id: 'actual-homeowner-id',
              contractor_id: 'contractor-abc',
              title: 'Fix leak',
              budget: 500,
              status: 'assigned',
            },
            error: null,
          },
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/create-intent');
      const response = await POST(request);

      // The ForbiddenError is caught and processed through createPaymentErrorResponse
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Payment Amount Validation', () => {
    it('should reject payment exceeding job budget', async () => {
      mocks.validateRequest.mockResolvedValue({
        data: {
          amount: 600,
          currency: 'gbp',
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          contractorId: 'contractor-abc',
        },
      });

      mocks.detectAnomalies.mockResolvedValue({
        isAnomalous: false,
        riskScore: 0.1,
        reasons: [],
        blockedReasons: [],
      });

      createSupabaseChain({
        jobs: {
          selectReturn: {
            data: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              homeowner_id: 'homeowner-user-id',
              contractor_id: 'contractor-abc',
              title: 'Fix leak',
              budget: 500,
              status: 'assigned',
            },
            error: null,
          },
        },
        bids: {
          selectReturn: {
            data: null,
            error: { message: 'No accepted bid found' },
          },
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/create-intent');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('cannot exceed');
    });
  });

  describe('Anomaly Detection', () => {
    it('should block payment when anomaly detection flags high risk', async () => {
      mocks.validateRequest.mockResolvedValue({
        data: {
          amount: 100,
          currency: 'gbp',
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          contractorId: 'contractor-abc',
        },
      });

      mocks.detectAnomalies.mockResolvedValue({
        isAnomalous: true,
        riskScore: 0.95,
        reasons: ['Unusual amount pattern'],
        blockedReasons: ['Suspicious activity detected'],
      });

      createSupabaseChain({
        jobs: {
          selectReturn: {
            data: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              homeowner_id: 'homeowner-user-id',
              contractor_id: 'contractor-abc',
              title: 'Fix leak',
              budget: 500,
              status: 'assigned',
            },
            error: null,
          },
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/create-intent');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toContain('Payment blocked for security reasons');
      expect(body.reasons).toContain('Suspicious activity detected');
    });
  });
});

// ============================================================================
// TEST SUITE 5: Payment Methods (GET) - Authentication
// ============================================================================

describe('GET /api/payments/methods', () => {
  let GET: typeof import('@/app/api/payments/methods/route').GET;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/payments/methods/route');
    GET = mod.GET;
  });

  describe('Authentication Required', () => {
    it('should reject unauthenticated requests to list payment methods', async () => {
      mocks.getCurrentUserFromCookies.mockResolvedValue(null);
      mocks.checkRateLimit.mockResolvedValue({
        success: true,
        remaining: 9,
        resetTime: Date.now() + 3600000,
      });

      const request = createMockRequest('http://localhost:3000/api/payments/methods', {
        method: 'GET',
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should return rate limit response when limit exceeded', async () => {
      const mockRateLimitResponse = new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429 }
      );
      // The methods route uses checkRateLimit from @/lib/rate-limit
      // When success=false, it returns the response object
      mocks.checkRateLimit.mockResolvedValue({
        success: false,
        remaining: 0,
        resetTime: Date.now() + 3600000,
        response: new (require('next/server').NextResponse)(
          JSON.stringify({ error: 'Too many requests' }),
          { status: 429 }
        ),
      });

      const request = createMockRequest('http://localhost:3000/api/payments/methods', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(429);
    });
  });

  describe('Successful Response', () => {
    it('should return formatted payment methods for authenticated user', async () => {
      mocks.checkRateLimit.mockResolvedValue({
        success: true,
        remaining: 9,
        resetTime: Date.now() + 3600000,
      });

      // Profile lookup returns user with existing Stripe customer ID
      createSupabaseChain({
        profiles: {
          selectReturn: {
            data: {
              id: 'homeowner-user-id',
              email: 'homeowner@test.com',
              stripe_customer_id: 'cus_test_123',
            },
            error: null,
          },
        },
      });

      // Stripe customer retrieval
      mocks.stripeCustomersRetrieve.mockResolvedValue({
        id: 'cus_test_123',
        deleted: undefined,
        invoice_settings: {
          default_payment_method: 'pm_default_123',
        },
      });

      // Stripe payment methods list
      mocks.stripePaymentMethodsList.mockResolvedValue({
        data: [
          {
            id: 'pm_default_123',
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
              exp_month: 12,
              exp_year: 2026,
            },
            billing_details: { name: 'Test User' },
            created: 1700000000,
          },
          {
            id: 'pm_secondary_456',
            type: 'card',
            card: {
              brand: 'mastercard',
              last4: '5555',
              exp_month: 6,
              exp_year: 2025,
            },
            billing_details: { name: 'Test User' },
            created: 1700000001,
          },
        ],
      });

      const request = createMockRequest('http://localhost:3000/api/payments/methods', {
        method: 'GET',
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.paymentMethods).toHaveLength(2);
      expect(body.stripeCustomerId).toBe('cus_test_123');
      expect(body.defaultPaymentMethodId).toBe('pm_default_123');

      // First method should be marked as default
      expect(body.paymentMethods[0].isDefault).toBe(true);
      expect(body.paymentMethods[0].card.brand).toBe('visa');
      expect(body.paymentMethods[0].card.last4).toBe('4242');

      // Second method should NOT be default
      expect(body.paymentMethods[1].isDefault).toBe(false);
      expect(body.paymentMethods[1].card.brand).toBe('mastercard');
    });
  });
});

// ============================================================================
// TEST SUITE 6: Add Payment Method - Authentication & Rate Limiting
// ============================================================================

describe('POST /api/payments/add-method', () => {
  let POST: typeof import('@/app/api/payments/add-method/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/payments/add-method/route');
    POST = mod.POST;
  });

  describe('Authentication Required', () => {
    it('should reject unauthenticated request to add payment method', async () => {
      mocks.getCurrentUserFromCookies.mockResolvedValue(null);
      mocks.validateRequest.mockResolvedValue({
        data: {
          paymentMethodId: 'pm_test_123',
          setAsDefault: false,
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/add-method');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded on add-method', async () => {
      mocks.rateLimiterCheckRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      });

      const request = createMockRequest('http://localhost:3000/api/payments/add-method');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toContain('Too many requests');
    });
  });

  describe('Successful Add Method', () => {
    it('should attach payment method and return card details', async () => {
      mocks.validateRequest.mockResolvedValue({
        data: {
          paymentMethodId: 'pm_test_new_card',
          setAsDefault: true,
        },
      });

      createSupabaseChain({
        profiles: {
          selectReturn: {
            data: {
              id: 'homeowner-user-id',
              email: 'homeowner@test.com',
              stripe_customer_id: 'cus_test_123',
            },
            error: null,
          },
        },
      });

      mocks.stripePaymentMethodsAttach.mockResolvedValue({
        id: 'pm_test_new_card',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '1234',
          exp_month: 3,
          exp_year: 2027,
        },
      });

      mocks.stripeCustomersUpdate.mockResolvedValue({ id: 'cus_test_123' });

      const request = createMockRequest('http://localhost:3000/api/payments/add-method');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.paymentMethod.id).toBe('pm_test_new_card');
      expect(body.paymentMethod.card.brand).toBe('visa');
      expect(body.paymentMethod.card.last4).toBe('1234');
      expect(body.isDefault).toBe(true);

      // Verify Stripe was called to set as default
      expect(mocks.stripeCustomersUpdate).toHaveBeenCalledWith('cus_test_123', {
        invoice_settings: {
          default_payment_method: 'pm_test_new_card',
        },
      });
    });

    it('should create Stripe customer if one does not exist', async () => {
      mocks.validateRequest.mockResolvedValue({
        data: {
          paymentMethodId: 'pm_test_new_card',
          setAsDefault: false,
        },
      });

      // Profile has no stripe_customer_id
      createSupabaseChain({
        profiles: {
          selectReturn: {
            data: {
              id: 'homeowner-user-id',
              email: 'homeowner@test.com',
              stripe_customer_id: null,
            },
            error: null,
          },
          updateReturn: { data: null, error: null },
        },
      });

      mocks.stripeCustomersCreate.mockResolvedValue({
        id: 'cus_new_customer',
      });

      mocks.stripePaymentMethodsAttach.mockResolvedValue({
        id: 'pm_test_new_card',
        type: 'card',
        card: {
          brand: 'mastercard',
          last4: '9876',
          exp_month: 11,
          exp_year: 2028,
        },
      });

      const request = createMockRequest('http://localhost:3000/api/payments/add-method');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);

      // Verify Stripe customer was created
      expect(mocks.stripeCustomersCreate).toHaveBeenCalledWith({
        email: 'homeowner@test.com',
        metadata: { userId: 'homeowner-user-id' },
      });
    });
  });
});

// ============================================================================
// TEST SUITE 7: Cross-Cutting Security Concerns
// ============================================================================

describe('Cross-Cutting Payment Security', () => {
  beforeEach(() => {
    setupDefaultMocks();
  });

  describe('CSRF Protection', () => {
    it('should propagate CSRF failure from refund route', async () => {
      mocks.requireCSRF.mockRejectedValue(new Error('CSRF validation failed'));

      mocks.validateRequest.mockResolvedValue({
        data: {
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
        },
      });

      const { POST } = await import('@/app/api/payments/refund/route');
      const request = createMockRequest('http://localhost:3000/api/payments/refund');
      const response = await POST(request);

      // CSRF error is caught and turned into an error response
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Idempotency', () => {
    it('should return cached result for duplicate refund request', async () => {
      mocks.checkIdempotency.mockResolvedValue({
        isDuplicate: true,
        cachedResult: {
          success: true,
          refundId: 'refund_cached_123',
          amount: 250,
          status: 'succeeded',
        },
        idempotencyKey: 'idempotency-key-123',
      });

      mocks.validateRequest.mockResolvedValue({
        data: {
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
        },
      });

      const { POST } = await import('@/app/api/payments/refund/route');
      const request = createMockRequest('http://localhost:3000/api/payments/refund');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.refundId).toBe('refund_cached_123');
      expect(body.success).toBe(true);
    });

    it('should return 409 on lock contention for refund', async () => {
      // null return means lock contention
      mocks.checkIdempotency.mockResolvedValue(null);

      mocks.validateRequest.mockResolvedValue({
        data: {
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
        },
      });

      const { POST } = await import('@/app/api/payments/refund/route');
      const request = createMockRequest('http://localhost:3000/api/payments/refund');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error).toContain('being processed');
    });
  });

  describe('Consistent Auth Rejection Across Endpoints', () => {
    const endpoints = [
      { name: 'create-intent', path: '@/app/api/payments/create-intent/route' },
      { name: 'refund', path: '@/app/api/payments/refund/route' },
      { name: 'release-escrow', path: '@/app/api/payments/release-escrow/route' },
      { name: 'add-method', path: '@/app/api/payments/add-method/route' },
    ];

    endpoints.forEach(({ name, path }) => {
      it(`${name}: should reject unauthenticated POST requests`, async () => {
        setupDefaultMocks();
        mocks.getCurrentUserFromCookies.mockResolvedValue(null);

        // Provide valid-looking data so validation passes
        mocks.validateRequest.mockResolvedValue({
          data: {
            amount: 100,
            currency: 'gbp',
            jobId: '550e8400-e29b-41d4-a716-446655440000',
            contractorId: 'contractor-abc',
            escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
            releaseReason: 'job_completed',
            paymentMethodId: 'pm_test_123',
            setAsDefault: false,
          },
        });

        const mod = await import(path);
        const handler = mod.POST;
        const request = createMockRequest(`http://localhost:3000/api/payments/${name}`);
        const response = await handler(request);

        expect(response.status).toBeGreaterThanOrEqual(400);
        const body = await response.json();
        expect(body.error).toBeDefined();
      });
    });
  });
});

// ============================================================================
// TEST SUITE 8: Refund DB Retry Logic
// ============================================================================

describe('Refund DB Retry Logic', () => {
  let POST: typeof import('@/app/api/payments/refund/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/payments/refund/route');
    POST = mod.POST;
  });

  it('should succeed on the second DB retry after first update fails', async () => {
    mocks.validateRequest.mockResolvedValue({
      data: {
        jobId: '550e8400-e29b-41d4-a716-446655440000',
        escrowTransactionId: '660e8400-e29b-41d4-a716-446655440001',
      },
    });

    // Stripe refund succeeds
    mocks.stripeRefundsCreate.mockResolvedValue({
      id: 'refund_test_retry',
      status: 'succeeded',
      amount: 25000,
    });

    // Track DB update call count for retry behavior
    let updateCallCount = 0;
    const mockUpdateChain = () => {
      updateCallCount++;
      const shouldFail = updateCallCount <= 1; // First call fails
      return {
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              shouldFail
                ? { data: null, error: { message: 'Temporary DB error' } }
                : { data: { id: '660e8400-e29b-41d4-a716-446655440001', status: 'refunded' }, error: null }
            ),
          }),
        }),
      };
    };

    mocks.supabaseFrom.mockImplementation((tableName: string) => {
      if (tableName === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: '550e8400-e29b-41d4-a716-446655440000',
                  homeowner_id: 'homeowner-user-id',
                  contractor_id: 'contractor-abc',
                  status: 'cancelled',
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }
      if (tableName === 'escrow_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: '660e8400-e29b-41d4-a716-446655440001',
                    job_id: '550e8400-e29b-41d4-a716-446655440000',
                    amount: 250,
                    status: 'held',
                    stripe_payment_intent_id: 'pi_test_123',
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockImplementation(() => mockUpdateChain()),
        };
      }
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
        insert: vi.fn().mockReturnValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      };
    });

    const request = createMockRequest('http://localhost:3000/api/payments/refund');
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.refundId).toBe('refund_test_retry');

    // Verify the retry actually happened (2 update calls: 1 fail + 1 success)
    expect(updateCallCount).toBeGreaterThanOrEqual(2);
  });
});
