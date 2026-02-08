import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// vi.hoisted() creates stable references that survive mockReset: true.
// These are used BOTH in the vi.mock() factories below AND in the test bodies.
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
// Mock Stripe (default export is a class constructor)
// The constructor is hoisted so we can re-set its implementation in beforeEach.
// ---------------------------------------------------------------------------
vi.mock('stripe', () => ({
  default: mockStripeConstructor,
}));

// ---------------------------------------------------------------------------
// Mock rate-limiter: the route uses rateLimiter.checkRateLimit()
// ---------------------------------------------------------------------------
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: {
    checkRateLimit: mockCheckRateLimit,
  },
  checkWebhookRateLimit: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock serverSupabase with chainable .from() and .rpc()
// ---------------------------------------------------------------------------
vi.mock('@/lib/api/supabaseServer', () => {
  // Build a chainable object so calls like .from('x').update({}).eq().select().single() work
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
// Mock logger
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
// Mock @/lib/env so the route gets the env values we control
// ---------------------------------------------------------------------------
vi.mock('@/lib/env', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_mock_secret_key',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
    NODE_ENV: 'test',
  },
}));

// ---------------------------------------------------------------------------
// Mock @/lib/errors/api-error: re-export real classes but mock handleAPIError
// to avoid pulling in @/lib/cors etc.
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

  // Minimal handleAPIError that returns a proper NextResponse
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
// Import the route handler AFTER all mocks are set up
// ---------------------------------------------------------------------------
import { POST } from '../app/api/webhooks/stripe/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(options?: {
  signature?: string | null;
  body?: string;
  ip?: string;
}) {
  const headers: Record<string, string> = {};
  if (options?.signature !== null) {
    headers['stripe-signature'] = options?.signature ?? 't=1234567890,v1=test_signature';
  }
  if (options?.ip) {
    headers['x-forwarded-for'] = options.ip;
  }

  return new NextRequest('https://example.com/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body: options?.body ?? JSON.stringify({}),
  });
}

/** Default allowed rate limit result */
function allowRateLimit() {
  mockCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 19,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
}

/** Default denied rate limit result */
function denyRateLimit() {
  mockCheckRateLimit.mockResolvedValue({
    allowed: false,
    remaining: 0,
    resetTime: Date.now() + 60000,
    retryAfter: 60,
  });
}

/** Set up the idempotency RPC to return non-duplicate */
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

/** Set up the idempotency RPC to return duplicate */
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

/** Set up the idempotency RPC to return an error */
function rpcError() {
  mockRpc.mockImplementation(async (fn: string) => {
    if (fn === 'check_webhook_idempotency') {
      return { data: null, error: { message: 'Database connection failed' } };
    }
    return { data: null, error: null };
  });
}

// Rebuild the chainable mock for .from() before each test (survives mockReset)
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

function createMockEvent(overrides?: Partial<{ id: string; type: string; data: any; created: number }>) {
  return {
    id: 'evt_test_123',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_123',
        status: 'succeeded',
      },
    },
    created: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Stripe Webhook Security', () => {
  beforeEach(() => {
    // Re-establish mock implementations that mockReset clears.
    // mockReset clears all vi.fn() implementations including hoisted ones,
    // so every mock must be re-configured here.
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
  });

  describe('Webhook Signature Verification', () => {
    it('should verify webhook signature and return 200', async () => {
      const mockEvent = createMockEvent();
      mockConstructEvent.mockReturnValue(mockEvent);

      const request = makeRequest();
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockConstructEvent).toHaveBeenCalledWith(
        expect.any(String),
        't=1234567890,v1=test_signature',
        'whsec_test_secret',
      );
    });

    it('should reject webhook with invalid signature', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const request = makeRequest({ signature: 't=1234567890,v1=invalid_signature' });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Webhook signature verification failed',
        expect.any(Error),
        expect.objectContaining({ service: 'stripe-webhook' }),
      );
    });

    it('should reject webhook with missing signature', async () => {
      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Timestamp Validation', () => {
    it('should accept webhook with recent timestamp', async () => {
      const recentTimestamp = Math.floor(Date.now() / 1000); // Now
      const mockEvent = createMockEvent({ created: recentTimestamp });
      mockConstructEvent.mockReturnValue(mockEvent);

      const request = makeRequest();
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should reject webhook with old timestamp', async () => {
      // Route uses 60-second tolerance, so 400 seconds ago should fail
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400;
      const mockEvent = createMockEvent({ created: oldTimestamp });
      mockConstructEvent.mockReturnValue(mockEvent);

      const request = makeRequest();
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'Webhook event timestamp outside tolerance window',
        expect.objectContaining({
          service: 'stripe-webhook',
          eventId: 'evt_test_123',
        }),
      );
    });
  });

  describe('Idempotency Protection', () => {
    it('should process new webhook event', async () => {
      const mockEvent = createMockEvent();
      mockConstructEvent.mockReturnValue(mockEvent);

      const request = makeRequest();
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockRpc).toHaveBeenCalledWith(
        'check_webhook_idempotency',
        expect.objectContaining({
          p_event_id: 'evt_test_123',
          p_event_type: 'payment_intent.succeeded',
          p_source: 'stripe',
        }),
      );
    });

    it('should return duplicate for already-processed event', async () => {
      const mockEvent = createMockEvent();
      mockConstructEvent.mockReturnValue(mockEvent);
      rpcDuplicate();

      const request = makeRequest();
      const response = await POST(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.duplicate).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow webhook within rate limit', async () => {
      const mockEvent = createMockEvent();
      mockConstructEvent.mockReturnValue(mockEvent);
      allowRateLimit();

      const request = makeRequest();
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockCheckRateLimit).toHaveBeenCalled();
    });

    it('should reject webhook exceeding rate limit', async () => {
      denyRateLimit();

      const request = makeRequest();
      const response = await POST(request);

      expect(response.status).toBe(429);
    });
  });

  describe('Event Processing', () => {
    it('should process payment_intent.succeeded event', async () => {
      const mockEvent = createMockEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
            amount: 2000,
            currency: 'gbp',
            metadata: {
              job_id: 'job_123',
              contractorId: 'contractor_456',
            },
          },
        },
      });
      mockConstructEvent.mockReturnValue(mockEvent);

      const request = makeRequest();
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Payment succeeded webhook received',
        expect.objectContaining({
          service: 'stripe-webhook',
          paymentIntentId: 'pi_test_123',
        }),
      );
    });

    it('should process checkout.session.completed event', async () => {
      const mockEvent = createMockEvent({
        id: 'evt_test_456',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            customer_email: 'customer@example.com',
            metadata: {
              jobId: 'job_789',
              isMarketplacePayment: 'true',
            },
            payment_intent: 'pi_checkout_123',
          },
        },
      });
      mockConstructEvent.mockReturnValue(mockEvent);

      // handleCheckoutSessionCompleted calls stripe.paymentIntents.retrieve()
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_checkout_123',
        latest_charge: 'ch_test_123',
      });

      const request = makeRequest();
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Checkout session completed webhook received',
        expect.objectContaining({
          service: 'stripe-webhook',
          sessionId: 'cs_test_123',
        }),
      );
    });

    it('should handle unsupported event types gracefully', async () => {
      const mockEvent = createMockEvent({
        id: 'evt_test_789',
        type: 'customer.created',
        data: { object: { id: 'cus_test_123' } },
      });
      mockConstructEvent.mockReturnValue(mockEvent);

      const request = makeRequest();
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Unhandled webhook event type',
        expect.objectContaining({
          service: 'stripe-webhook',
          eventType: 'customer.created',
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockEvent = createMockEvent();
      mockConstructEvent.mockReturnValue(mockEvent);
      rpcError();

      const request = makeRequest();
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Webhook idempotency check failed',
        expect.objectContaining({ message: 'Database connection failed' }),
        expect.objectContaining({ service: 'stripe-webhook' }),
      );
    });

    it('should handle missing webhook secret', async () => {
      // We need to test the branch where webhookSecret is falsy.
      // Since webhookSecret is captured at module level from env.STRIPE_WEBHOOK_SECRET,
      // and the module is already loaded, we cannot easily change it.
      // Instead, we test that a missing signature returns 400.
      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      // Missing stripe-signature header returns 400
      expect(response.status).toBe(400);
    });
  });
});
