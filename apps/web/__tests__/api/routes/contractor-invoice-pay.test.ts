/**
 * Tests for POST /api/contractor/invoices/pay
 * Route: apps/web/app/api/contractor/invoices/pay/route.ts
 *
 * Covers: tier-aware platform fee on the Stripe PaymentIntent
 * (application_fee_amount) and on the payments-row bookkeeping
 * (platform_fee / processing_fee / net_amount). The route previously
 * hardcoded a 5% fee (missed in the 2026-05-23 tiered-pricing rollout);
 * these tests pin the FeeCalculationService-driven rates: free/basic 12%,
 * professional 8%, enterprise 5%, early-access -> enterprise.
 *
 * FeeCalculationService is intentionally NOT mocked — only its data
 * sources (contractor_subscriptions via serverSupabase, early-access
 * entitlement) are, so the real percentage math is exercised.
 */
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),
  supabaseFrom: vi.fn(),
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  checkApiRateLimit: vi.fn(),
  stripePaymentIntentsCreate: vi.fn(),
  stripePaymentIntentsRetrieve: vi.fn(),
  createNotification: vi.fn(),
  getEarlyAccessEntitlement: vi.fn(),
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
  },
}));

vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.requireCSRF }));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rateLimiterCheckRateLimit },
  checkApiRateLimit: mocks.checkApiRateLimit,
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
  BUSINESS_RULES: {},
  RATE_LIMITS: {},
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
}));
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      create: mocks.stripePaymentIntentsCreate,
      retrieve: mocks.stripePaymentIntentsRetrieve,
    },
  },
}));

vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {
    createNotification: mocks.createNotification,
  },
}));

// Dynamically imported inside FeeCalculationService.resolveContractorTier
vi.mock('@/lib/subscription/early-access', () => ({
  getEarlyAccessEntitlement: mocks.getEarlyAccessEntitlement,
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
  class RateLimitError extends APIError {
    constructor(m = 'Rate limit exceeded') {
      super('RATE_LIMIT', m, 429);
    }
  }
  return {
    APIError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
    RateLimitError,
    handleAPIError: vi.fn((error: unknown) => {
      const { NextResponse } = require('next/server');
      if (error instanceof APIError) {
        return NextResponse.json(error.toResponse(), {
          status: error.statusCode,
        });
      }
      return NextResponse.json(
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

vi.mock('@/lib/cors', () => ({ getCorsHeaders: vi.fn(() => ({})) }));

// ---------------------------------------------------------------------------
// Fixtures + helpers
// ---------------------------------------------------------------------------
const INVOICE_ID = '11111111-1111-4111-8111-111111111111';

const payerUser = {
  id: 'homeowner-1',
  email: 'homeowner@test.com',
  role: 'homeowner' as const,
  first_name: 'Test',
  last_name: 'Homeowner',
};

const baseInvoice = {
  id: INVOICE_ID,
  contractor_id: 'contractor-1',
  total_amount: 1000,
  invoice_number: 'INV-001',
  title: 'Boiler replacement',
  client_email: 'homeowner@test.com',
  job_id: null,
  status: 'sent',
};

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    new URL('http://localhost:3000/api/contractor/invoices/pay'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
        'x-csrf-token': 'test-csrf-token',
        'x-real-ip': '127.0.0.1',
      },
      body: JSON.stringify(body),
    }
  );
}

function segmentData() {
  return { params: Promise.resolve({}) };
}

type ChainTerminals = {
  single?: { data: unknown; error: unknown };
  maybeSingle?: { data: unknown; error?: unknown };
};

// Generic chainable Supabase query mock. All builder methods return the
// chain; single/maybeSingle resolve the configured terminal values; the
// chain itself is thenable so `await ...update().eq()` resolves too.
function makeChain(
  terminals: ChainTerminals = {},
  onInsert?: (payload: unknown) => void
) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'order', 'limit', 'update']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.insert = vi.fn().mockImplementation((payload: unknown) => {
    onInsert?.(payload);
    return chain;
  });
  chain.single = vi
    .fn()
    .mockResolvedValue(terminals.single ?? { data: null, error: null });
  chain.maybeSingle = vi
    .fn()
    .mockResolvedValue(terminals.maybeSingle ?? { data: null, error: null });
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: null, error: null });
  return chain;
}

interface SetupOptions {
  /** contractor_subscriptions.plan_type; null = no active subscription row */
  planType?: string | null;
  invoiceOverrides?: Partial<typeof baseInvoice>;
}

const captured: {
  paymentsInsert: unknown[];
  escrowInsert: unknown[];
} = { paymentsInsert: [], escrowInsert: [] };

function setupMocks(options: SetupOptions = {}) {
  const { planType = null, invoiceOverrides = {} } = options;
  const invoice = { ...baseInvoice, ...invoiceOverrides };

  captured.paymentsInsert = [];
  captured.escrowInsert = [];

  mocks.getCurrentUserFromCookies.mockResolvedValue(payerUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 29,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.checkApiRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 29,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.createNotification.mockResolvedValue(undefined);
  mocks.getEarlyAccessEntitlement.mockResolvedValue({ eligible: false });
  mocks.stripePaymentIntentsCreate.mockImplementation(
    async (params: { amount: number; currency: string }) => ({
      id: 'pi_new_123',
      client_secret: 'pi_new_123_secret',
      amount: params.amount,
      currency: params.currency,
      status: 'requires_payment_method',
    })
  );

  mocks.supabaseFrom.mockImplementation((table: string) => {
    switch (table) {
      case 'invoices':
        return makeChain({ single: { data: invoice, error: null } });
      case 'payments':
        return makeChain(
          {
            // No pre-existing pending payment -> fresh intent path
            maybeSingle: { data: null },
            single: {
              data: { id: 'payment-1', status: 'pending' },
              error: null,
            },
          },
          (payload) => captured.paymentsInsert.push(payload)
        );
      case 'profiles':
        return makeChain({
          single: {
            data: {
              stripe_connect_account_id: 'acct_test_123',
              email: 'contractor@test.com',
              company_name: 'Test Contractors Ltd',
            },
            error: null,
          },
        });
      case 'escrow_transactions':
        return makeChain(
          {
            single: {
              data: { id: 'escrow-1', status: 'pending' },
              error: null,
            },
          },
          (payload) => captured.escrowInsert.push(payload)
        );
      case 'contractor_subscriptions':
        return makeChain({
          maybeSingle: {
            data: planType ? { plan_type: planType, status: 'active' } : null,
          },
        });
      default:
        return makeChain();
    }
  });
}

async function postInvoicePayment() {
  const mod = await import('@/app/api/contractor/invoices/pay/route');
  const req = createPostRequest({ invoiceId: INVOICE_ID });
  return mod.POST(req, segmentData());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/contractor/invoices/pay — tier-aware platform fee', () => {
  it('should return 401 when user is not authenticated', async () => {
    setupMocks();
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const res = await postInvoicePayment();
    expect(res.status).toBe(401);
  });

  it('charges 12% application fee for a basic-tier contractor on a £1000 invoice', async () => {
    setupMocks({ planType: 'basic' });

    const res = await postInvoicePayment();
    expect(res.status).toBe(200);

    expect(mocks.stripePaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 100000,
        currency: 'gbp',
        application_fee_amount: 12000,
        transfer_data: { destination: 'acct_test_123' },
      })
    );
  });

  it('books tier-aware platform_fee / processing_fee / net_amount on the payments row (basic, 12%)', async () => {
    setupMocks({ planType: 'basic' });

    const res = await postInvoicePayment();
    expect(res.status).toBe(200);

    expect(captured.paymentsInsert).toHaveLength(1);
    // FeeCalculationService UK model: platform 12% of £1000 = £120;
    // Stripe estimate 1.5% + £0.20 = £15.20; net = 1000 - 120 - 15.20
    expect(captured.paymentsInsert[0]).toEqual(
      expect.objectContaining({
        amount: 1000,
        platform_fee: 120,
        processing_fee: 15.2,
        net_amount: 864.8,
      })
    );
  });

  it('charges 8% application fee for a professional-tier contractor', async () => {
    setupMocks({ planType: 'professional' });

    const res = await postInvoicePayment();
    expect(res.status).toBe(200);

    expect(mocks.stripePaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ application_fee_amount: 8000 })
    );
    expect(captured.paymentsInsert[0]).toEqual(
      expect.objectContaining({
        platform_fee: 80,
        processing_fee: 15.2,
        net_amount: 904.8,
      })
    );
  });

  it('charges 5% application fee for an enterprise-tier contractor', async () => {
    setupMocks({ planType: 'enterprise' });

    const res = await postInvoicePayment();
    expect(res.status).toBe(200);

    expect(mocks.stripePaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ application_fee_amount: 5000 })
    );
    expect(captured.paymentsInsert[0]).toEqual(
      expect.objectContaining({
        platform_fee: 50,
        processing_fee: 15.2,
        net_amount: 934.8,
      })
    );
  });

  it('maps early-access contractors to the enterprise 5% rate even with no subscription row', async () => {
    setupMocks({ planType: null });
    mocks.getEarlyAccessEntitlement.mockResolvedValue({
      eligible: true,
      role: 'contractor',
    });

    const res = await postInvoicePayment();
    expect(res.status).toBe(200);

    expect(mocks.stripePaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ application_fee_amount: 5000 })
    );
  });

  it('defaults to the basic 12% rate when the contractor has no active subscription', async () => {
    setupMocks({ planType: null });

    const res = await postInvoicePayment();
    expect(res.status).toBe(200);

    expect(mocks.stripePaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ application_fee_amount: 12000 })
    );
    expect(captured.paymentsInsert[0]).toEqual(
      expect.objectContaining({ platform_fee: 120 })
    );
  });
});
