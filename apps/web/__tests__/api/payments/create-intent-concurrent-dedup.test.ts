// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

/**
 * Header-less duplicate protection for POST /api/payments/create-intent.
 *
 * Audit 2026-07-27: getIdempotencyKeyFromRequest's fallback appended
 * Date.now() + randomUUID, so two rapid double-taps WITHOUT an
 * Idempotency-Key header produced different keys and BOTH passed
 * checkIdempotency — the internal dedup only worked when the client
 * cooperated. The route now derives a deterministic fallback key from
 * (operation, userId, jobId, bidId) via
 * getDeterministicIdempotencyKeyFromRequest.
 *
 * Unlike payment-flow.test.ts, this suite does NOT mock @/lib/idempotency —
 * it exercises the real claim/complete/release logic against an atomic
 * in-memory simulation of the try_claim_idempotency_key RPC (INSERT … ON
 * CONFLICT DO NOTHING semantics), so the dedup path under test is the
 * production one.
 */

const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  validateRequest: vi.fn(),
  detectAnomalies: vi.fn(),
  spendCredit: vi.fn(),
  stripePaymentIntentsCreate: vi.fn(),
  stripePaymentIntentsCancel: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
  getCurrentUserFromBearerToken: vi.fn(),
}));

vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.requireCSRF }));

vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rateLimiterCheckRateLimit },
}));

vi.mock('@/lib/request-ip', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }));

vi.mock('@/lib/admin-verification', () => ({
  verifyAdminRoleFromDatabase: vi.fn(),
}));

vi.mock('@/lib/auth/mfa-step-up', () => ({
  hasValidStepUp: vi.fn(() => true),
}));

vi.mock('@/lib/validation/validator', () => ({
  validateRequest: mocks.validateRequest,
}));

vi.mock('@/lib/validation/schemas', () => ({ paymentIntentSchema: {} }));

vi.mock('@/lib/monitoring/payment-monitor', () => ({
  PaymentMonitoringService: { detectAnomalies: mocks.detectAnomalies },
}));

vi.mock('@/lib/services/referrals/NeighbourhoodReferralService', () => ({
  NeighbourhoodReferralService: { spendCredit: mocks.spendCredit },
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      create: mocks.stripePaymentIntentsCreate,
      cancel: mocks.stripePaymentIntentsCancel,
    },
  },
}));

// Pass-through: preserve the call ordering of the real route without the timer
vi.mock('@/lib/utils/api-timeout', () => ({
  stripeWithTimeout: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock('@mintenance/shared', () => ({ logger: mocks.logger }));

vi.mock('@/lib/errors/api-error', () => {
  class APIError extends Error {
    constructor(
      public code: string,
      public userMessage: string,
      public statusCode: number = 500
    ) {
      super(userMessage);
      this.name = 'APIError';
    }
  }
  class ServiceUnavailableError extends APIError {
    constructor(service = 'Service') {
      super('SERVICE_UNAVAILABLE', `${service} is unavailable`, 503);
    }
  }
  const { NextResponse } = require('next/server');
  return {
    APIError,
    UnauthorizedError: class extends APIError {
      constructor(message = 'Unauthorized') {
        super('UNAUTHORIZED', message, 401);
      }
    },
    ForbiddenError: class extends APIError {
      constructor(message = 'Forbidden') {
        super('FORBIDDEN', message, 403);
      }
    },
    NotFoundError: class extends APIError {
      constructor(resource = 'Resource') {
        super('NOT_FOUND', `${resource} not found`, 404);
      }
    },
    BadRequestError: class extends APIError {
      constructor(message = 'Bad Request') {
        super('BAD_REQUEST', message, 400);
      }
    },
    ServiceUnavailableError,
    handleAPIError: vi.fn((error: unknown) => {
      const status = error instanceof APIError ? error.statusCode : 500;
      return NextResponse.json({ error: String(error) }, { status });
    }),
  };
});

vi.mock('@/lib/errors/payment-errors', () => ({
  createPaymentErrorResponse: vi.fn((error: unknown) => {
    const e = error as { statusCode?: number; userMessage?: string };
    return {
      error: e.userMessage || 'Payment error',
      code: 'payment_error',
      retryable: (e.statusCode ?? 500) >= 500,
      status: e.statusCode ?? 500,
    };
  }),
}));

// ---------------------------------------------------------------------------
// Atomic in-memory idempotency claim store (simulates the SQL RPCs).
// Map operations are synchronous inside the rpc mock, which mirrors the
// atomicity of INSERT … ON CONFLICT DO NOTHING: between two interleaved
// requests, exactly one can transition a key from absent → pending.
// ---------------------------------------------------------------------------
const claimStore = new Map<
  string,
  { status: 'pending' | 'completed'; result?: unknown }
>();

const escrowInserts: Array<Record<string, unknown>> = [];

const JOB = {
  id: 'job-1',
  homeowner_id: 'homeowner-user-id',
  payer_user_id: null,
  is_rental_property: false,
  title: 'Fix the boiler',
  contractor_id: 'contractor-1',
  budget: 500,
  status: 'assigned',
};
const CONTRACT = { id: 'contract-1', status: 'accepted', quote_id: null };
const ACCEPTED_BID = {
  id: 'bid-1',
  amount: 500,
  status: 'accepted',
  quote_id: null,
};

function rpcMock(name: string, args: Record<string, unknown>) {
  const key = args.p_idempotency_key as string;
  if (name === 'try_claim_idempotency_key') {
    const existing = claimStore.get(key);
    if (!existing) {
      claimStore.set(key, { status: 'pending' });
      return {
        data: [
          {
            claimed: true,
            is_duplicate: false,
            is_pending: false,
            cached_result: null,
            cached_created_at: null,
          },
        ],
        error: null,
      };
    }
    if (existing.status === 'completed') {
      return {
        data: [
          {
            claimed: false,
            is_duplicate: true,
            is_pending: false,
            cached_result: existing.result,
            cached_created_at: new Date().toISOString(),
          },
        ],
        error: null,
      };
    }
    return {
      data: [
        {
          claimed: false,
          is_duplicate: false,
          is_pending: true,
          cached_result: null,
          cached_created_at: null,
        },
      ],
      error: null,
    };
  }
  if (name === 'complete_idempotency_claim') {
    claimStore.set(key, { status: 'completed', result: args.p_result });
    return { data: true, error: null };
  }
  if (name === 'release_idempotency_claim') {
    claimStore.delete(key);
    return { data: null, error: null };
  }
  return { data: null, error: { message: `unexpected rpc ${name}` } };
}

/**
 * Fully-chainable thenable query builder. Every filter method returns the
 * builder; awaiting it resolves `{ data: [], count: 0, error: null }` unless
 * .single() was used (then `{ data: null, error: null }`). This satisfies
 * BOTH the route's escrow queries AND the real PaymentMonitoringService's
 * history/velocity queries (empty history ⇒ zero anomalies), which matters
 * because vitest's dynamic-import interception is racy under concurrency —
 * one of the two concurrent requests can receive the REAL monitor module.
 * With empty-history data the real module is as benign as the mock, so the
 * suite still isolates the idempotency layer either way.
 */
function chainBuilder(overrides?: {
  singleData?: unknown;
  onInsert?: (row: Record<string, unknown>) => { data: unknown; error: null };
}) {
  const state = { usedSingle: false };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const self: any = {};
  const filterMethods = [
    'select',
    'eq',
    'neq',
    'in',
    'gte',
    'gt',
    'lte',
    'lt',
    'order',
    'limit',
    'not',
    'is',
    'or',
    'filter',
    'range',
  ];
  for (const m of filterMethods) self[m] = () => self;
  self.single = () => {
    state.usedSingle = true;
    return self;
  };
  self.maybeSingle = self.single;
  self.then = (
    resolve: (v: unknown) => unknown,
    _reject?: (e: unknown) => unknown
  ) =>
    Promise.resolve(
      state.usedSingle
        ? { data: overrides?.singleData ?? null, error: null }
        : { data: [], count: 0, error: null }
    ).then(resolve);
  self.insert = (row: Record<string, unknown>) => {
    if (overrides?.onInsert) {
      const result = overrides.onInsert(row);
      return {
        select: () => ({ single: async () => result }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      };
    }
    return {
      select: () => ({
        single: async () => ({ data: null, error: null }),
      }),
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve),
    };
  };
  return self;
}

function fromMock(tableName: string) {
  switch (tableName) {
    case 'jobs':
      return chainBuilder({ singleData: JOB });
    case 'contracts':
      return chainBuilder({ singleData: CONTRACT });
    case 'bids':
      return chainBuilder({ singleData: ACCEPTED_BID });
    case 'escrow_transactions':
      // .single() lookups (existing-escrow-for-intent) resolve null; the
      // blocking-status .in() list resolves empty — deliberately, so the
      // escrow-state guard (defense in depth) can't mask a broken dedup.
      return chainBuilder({
        onInsert: (row) => {
          escrowInserts.push(row);
          return {
            data: { id: `escrow-${escrowInserts.length}`, ...row },
            error: null,
          };
        },
      });
    case 'profiles':
      return chainBuilder({ singleData: { stripe_customer_id: null } });
    case 'payment_attempts':
    case 'user_devices':
    case 'payment_security_events':
      return chainBuilder();
    default:
      throw new Error(`Unexpected table in test: ${tableName}`);
  }
}

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => fromMock(table),
    rpc: async (name: string, args: Record<string, unknown>) =>
      rpcMock(name, args),
  },
}));

// ---------------------------------------------------------------------------

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/payments/create-intent/route';
import { getDeterministicIdempotencyKeyFromRequest } from '@/lib/idempotency';

function makeHeaderlessRequest(): NextRequest {
  // NO Idempotency-Key header — the scenario under test.
  return new NextRequest(
    new URL('/api/payments/create-intent', 'http://localhost:3000'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
        'x-csrf-token': 'test-csrf-token',
      },
      body: JSON.stringify({
        amount: 500,
        currency: 'gbp',
        jobId: JOB.id,
        contractorId: JOB.contractor_id,
      }),
    }
  );
}

const callRoute = (request: NextRequest) =>
  POST(request, { params: Promise.resolve({}) });

describe('create-intent header-less duplicate protection', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    claimStore.clear();
    escrowInserts.length = 0;

    // Warm the route's dynamic imports so the mocked modules are already in
    // the module cache. Two CONCURRENT first-time dynamic imports of a
    // vi.mock'd module race in vitest — the loser can receive the REAL
    // module (observed: real PaymentMonitoringService 403-blocking request
    // B while request A got the mock).
    await import('@/lib/monitoring/payment-monitor');
    await import('@/lib/services/referrals/NeighbourhoodReferralService');
    await import('@/lib/errors/payment-errors');

    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'homeowner-user-id',
      email: 'homeowner@test.com',
      role: 'homeowner',
      first_name: 'Test',
      last_name: 'Homeowner',
    });
    mocks.requireCSRF.mockResolvedValue(undefined);
    mocks.rateLimiterCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 19,
      resetTime: Date.now() + 60_000,
      retryAfter: 0,
    });
    mocks.validateRequest.mockResolvedValue({
      data: {
        amount: 500,
        currency: 'gbp',
        jobId: JOB.id,
        contractorId: JOB.contractor_id,
        metadata: undefined,
      },
    });
    mocks.detectAnomalies.mockResolvedValue({
      isAnomalous: false,
      riskScore: 0.1,
      reasons: [],
      blockedReasons: [],
    });
    mocks.spendCredit.mockResolvedValue(0);
    // Slow Stripe down slightly so the second concurrent request reaches the
    // idempotency claim while the first is still mid-flight — the exact race
    // the deterministic key must win.
    mocks.stripePaymentIntentsCreate.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 25));
      return {
        id: 'pi_test_1',
        client_secret: 'pi_test_1_secret',
      };
    });
  });

  it('two CONCURRENT header-less double-taps create exactly ONE PaymentIntent', async () => {
    const [resA, resB] = await Promise.all([
      callRoute(makeHeaderlessRequest()),
      callRoute(makeHeaderlessRequest()),
    ]);

    // THE core assertion: only one request reached Stripe.
    expect(mocks.stripePaymentIntentsCreate).toHaveBeenCalledTimes(1);
    // And only one escrow row was inserted.
    expect(escrowInserts).toHaveLength(1);

    // One request wins with a 200; the loser either got the pending-claim
    // 503 (in-flight conflict) or, if scheduling let the winner finish
    // first, the cached duplicate 200 carrying the SAME intent.
    const statuses = [resA.status, resB.status].sort();
    expect(statuses[0]).toBe(200);
    expect([200, 503]).toContain(statuses[1]);

    if (statuses[1] === 200) {
      const [bodyA, bodyB] = await Promise.all([resA.json(), resB.json()]);
      expect(bodyA.paymentIntentId).toBe('pi_test_1');
      expect(bodyB.paymentIntentId).toBe('pi_test_1');
    }
  });

  it('a SEQUENTIAL header-less double-tap returns the cached intent, not a new one', async () => {
    const first = await callRoute(makeHeaderlessRequest());
    expect(first.status).toBe(200);

    const second = await callRoute(makeHeaderlessRequest());
    expect(second.status).toBe(200);

    expect(mocks.stripePaymentIntentsCreate).toHaveBeenCalledTimes(1);
    expect(escrowInserts).toHaveLength(1);

    const [firstBody, secondBody] = await Promise.all([
      first.json(),
      second.json(),
    ]);
    expect(secondBody.paymentIntentId).toBe(firstBody.paymentIntentId);
  });

  it('a client-supplied Idempotency-Key header still wins over the derived key', () => {
    const request = new NextRequest(
      new URL('/api/payments/create-intent', 'http://localhost:3000'),
      {
        method: 'POST',
        headers: { 'Idempotency-Key': 'client-key-42' },
      }
    );
    expect(
      getDeterministicIdempotencyKeyFromRequest(
        request,
        'create_payment_intent',
        'user-1',
        'job-1:bid-1'
      )
    ).toBe('client-key-42');
  });

  it('the header-less fallback is deterministic — no timestamp, no randomness', () => {
    const make = () =>
      getDeterministicIdempotencyKeyFromRequest(
        new NextRequest(
          new URL('/api/payments/create-intent', 'http://localhost:3000'),
          { method: 'POST' }
        ),
        'create_payment_intent',
        'user-1',
        'job-1:bid-1'
      );
    const a = make();
    const b = make();
    expect(a).toBe(b);
    expect(a).toBe('create_payment_intent:user-1:job-1:bid-1');
  });
});
