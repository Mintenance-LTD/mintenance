import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// vi.hoisted() creates stable references that survive mockReset: true.
// ---------------------------------------------------------------------------
const {
  mockConstructEvent,
  mockStripeConstructor,
  mockPaymentIntentsRetrieve,
  mockCheckRateLimit,
  mockRpc,
  mockFrom,
  mockLoggerInfo,
  mockLoggerWarn,
  mockLoggerError,
} = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockStripeConstructor: vi.fn(),
  mockPaymentIntentsRetrieve: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerError: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock Stripe
// ---------------------------------------------------------------------------
vi.mock('stripe', () => ({
  default: mockStripeConstructor,
}));

// ---------------------------------------------------------------------------
// Mock rate-limiter
// ---------------------------------------------------------------------------
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: {
    checkRateLimit: mockCheckRateLimit,
  },
  checkWebhookRateLimit: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock serverSupabase
// ---------------------------------------------------------------------------
vi.mock('@/lib/api/supabaseServer', () => {
  const chainable = (): Record<string, any> => {
    const obj: Record<string, any> = {};
    const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'or', 'single', 'maybeSingle', 'order', 'limit', 'range', 'contains'];
    for (const m of methods) {
      if (m === 'single' || m === 'maybeSingle') {
        obj[m] = vi.fn().mockResolvedValue({ data: null, error: null });
      } else {
        obj[m] = vi.fn().mockReturnValue(obj);
      }
    }
    return obj;
  };

  const chain = chainable();
  mockFrom.mockReturnValue(chain);

  return {
    serverSupabase: {
      rpc: mockRpc,
      from: mockFrom,
    },
  };
});

// ---------------------------------------------------------------------------
// Mock logger and shared constants
// ---------------------------------------------------------------------------
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
  BUSINESS_RULES: {
    MAX_JOBS_PER_HOUR: 10,
    LOGIN_LOCKOUT_DURATION_MINUTES: 15,
    MAX_LOGIN_ATTEMPTS: 5,
    MAX_PASSWORD_RESETS_PER_HOUR: 3,
  },
  RATE_LIMITS: {
    WEBHOOK_REQUESTS_PER_MINUTE: 100,
    API_REQUESTS_PER_MINUTE: 100,
    AI_ANALYSIS_PER_MINUTE: 10,
    AI_SEARCH_PER_MINUTE: 20,
    AI_SUGGESTIONS_PER_MINUTE: 20,
    REDIS_TIMEOUT_MS: 5000,
    REDIS_EXPIRE_TIMEOUT_MS: 5000,
    MAX_FALLBACK_ENTRIES: 1000,
    PRODUCTION_FALLBACK_RETRY_AFTER: 60,
  },
  TIME_MS: {
    MINUTE: 60000,
    HOUR: 3600000,
  },
}));

// ---------------------------------------------------------------------------
// Mock @/lib/env
// ---------------------------------------------------------------------------
vi.mock('@/lib/env', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_mock_secret_key',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
    NODE_ENV: 'test',
  },
}));

// ---------------------------------------------------------------------------
// Mock @/lib/errors/api-error
// ---------------------------------------------------------------------------
vi.mock('@/lib/errors/api-error', async () => {
  class APIError extends Error {
    constructor(
      public code: string,
      public userMessage: string,
      public statusCode: number = 500,
      public details?: unknown,
      public field?: string,
    ) {
      super(userMessage);
      this.name = 'APIError';
    }
    toResponse(requestId?: string) {
      return {
        error: { code: this.code, message: this.userMessage },
        timestamp: new Date().toISOString(),
      };
    }
  }
  class BadRequestError extends APIError {
    constructor(message = 'Bad Request', details?: unknown) {
      super('BAD_REQUEST', message, 400, details);
    }
  }
  class InternalServerError extends APIError {
    constructor(message = 'An unexpected error occurred') {
      super('INTERNAL_SERVER_ERROR', message, 500);
    }
  }
  class RateLimitError extends APIError {
    constructor(retryAfter?: number) {
      super('RATE_LIMIT_EXCEEDED', 'Too many requests.', 429, retryAfter ? { retryAfter } : undefined);
    }
  }

  const { NextResponse } = await import('next/server');
  function handleAPIError(error: unknown): any {
    if (error instanceof APIError) {
      return NextResponse.json(error.toResponse(), { status: error.statusCode });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } }, { status: 500 });
  }

  return { APIError, BadRequestError, InternalServerError, RateLimitError, handleAPIError };
});

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks
// ---------------------------------------------------------------------------
import { POST } from '../../app/api/webhooks/stripe/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeReq(headers: Record<string, string>, body: string) {
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: new Headers(headers),
    body,
  });
}

function allowRateLimit() {
  mockCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 19,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
}

function rpcNonDuplicate() {
  mockRpc.mockImplementation(async (fn: string) => {
    if (fn === 'check_webhook_idempotency') {
      return { data: [{ is_duplicate: false, event_id: 'evt_row_1' }], error: null };
    }
    if (fn === 'mark_webhook_processed') {
      return { data: null, error: null };
    }
    return { data: null, error: null };
  });
}

function rpcDuplicate() {
  mockRpc.mockImplementation(async (fn: string) => {
    if (fn === 'check_webhook_idempotency') {
      return { data: [{ is_duplicate: true, event_id: 'evt_row_1' }], error: null };
    }
    if (fn === 'mark_webhook_processed') {
      return { data: null, error: null };
    }
    return { data: null, error: null };
  });
}

function setupFromChain() {
  const chain: Record<string, any> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'or', 'single', 'maybeSingle', 'order', 'limit', 'range', 'contains'];
  for (const m of methods) {
    if (m === 'single' || m === 'maybeSingle') {
      chain[m] = vi.fn().mockResolvedValue({ data: null, error: null });
    } else {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
  }
  mockFrom.mockReturnValue(chain);
}

function setupDefaultMockEvent() {
  mockConstructEvent.mockReturnValue({
    id: 'evt_1',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_1' } },
    created: Math.floor(Date.now() / 1000),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Stripe webhook idempotency', () => {
  beforeEach(() => {
    mockStripeConstructor.mockImplementation(function (this: any) {
      this.webhooks = {
        constructEvent: mockConstructEvent,
      };
      this.paymentIntents = {
        retrieve: mockPaymentIntentsRetrieve,
      };
    });
    allowRateLimit();
    rpcNonDuplicate();
    setupFromChain();
    setupDefaultMockEvent();
  });

  it('marks event processed and returns received true', async () => {
    const res = await POST(makeReq({ 'stripe-signature': 'sig', 'x-forwarded-for': '1.1.1.1' }, '{}'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
  });

  it('returns duplicate=true when idempotency detects duplicate', async () => {
    rpcDuplicate();

    const res = await POST(makeReq({ 'stripe-signature': 'sig', 'x-forwarded-for': '1.1.1.1' }, '{}'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.duplicate).toBe(true);
  });
});
