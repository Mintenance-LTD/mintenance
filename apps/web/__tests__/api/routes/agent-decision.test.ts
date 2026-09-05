// @vitest-environment node
/**
 * Regression coverage for POST /api/agents/decision authorization.
 * The endpoint runs user-scoped automation and must not trust IDs supplied
 * in the request body for either the user or the job.
 */
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),
  supabaseFrom: vi.fn(),
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  agentCall: vi.fn(),
  logDecision: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
  getCurrentUserFromBearerToken: mocks.getCurrentUserFromBearerToken,
}));
vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.requireCSRF }));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rateLimiterCheckRateLimit },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: (...args: unknown[]) => mocks.supabaseFrom(...args) },
}));
vi.mock('@mintenance/shared', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

vi.mock('@/lib/services/agents/PricingAgent', () => ({ PricingAgent: { generateRecommendation: mocks.agentCall } }));
vi.mock('@/lib/services/agents/BidAcceptanceAgent', () => ({ BidAcceptanceAgent: { evaluateBid: mocks.agentCall } }));
vi.mock('@/lib/services/agents/SchedulingAgent', () => ({ SchedulingAgent: { optimizeSchedule: mocks.agentCall } }));
vi.mock('@/lib/services/agents/NotificationAgent', () => ({ NotificationAgent: { determineNotificationStrategy: mocks.agentCall } }));
vi.mock('@/lib/services/agents/DisputeResolutionAgent', () => ({ DisputeResolutionAgent: { analyzeDispute: mocks.agentCall } }));
vi.mock('@/lib/services/agents/EscrowReleaseAgent', () => ({ EscrowReleaseAgent: { evaluateAutoRelease: mocks.agentCall } }));
vi.mock('@/lib/services/agents/JobStatusAgent', () => ({ JobStatusAgent: { determineNextStatus: mocks.agentCall } }));
vi.mock('@/lib/services/agents/PredictiveAgent', () => ({ PredictiveAgent: { predictDemand: mocks.agentCall } }));
vi.mock('@/lib/services/agents/AgentOrchestrator', () => ({ AgentOrchestrator: { processJobLifecycle: mocks.agentCall } }));
vi.mock('@/lib/services/agents/AgentLogger', () => ({ AgentLogger: { logDecision: mocks.logDecision } }));

vi.mock('@/lib/errors/api-error', async () => {
  class APIError extends Error {
    constructor(
      public code: string,
      public userMessage: string,
      public statusCode = 500
    ) {
      super(userMessage);
      this.name = 'APIError';
    }
    toResponse() {
      return { error: { code: this.code, message: this.userMessage } };
    }
  }
  class BadRequestError extends APIError {
    constructor(message: string) { super('BAD_REQUEST', message, 400); }
  }
  class ForbiddenError extends APIError {
    constructor(message: string) { super('FORBIDDEN', message, 403); }
  }
  class InternalServerError extends APIError {
    constructor(message: string) { super('INTERNAL_SERVER_ERROR', message, 500); }
  }
  class NotFoundError extends APIError {
    constructor(message: string) { super('NOT_FOUND', message, 404); }
  }
  return {
    APIError,
    BadRequestError,
    ForbiddenError,
    InternalServerError,
    NotFoundError,
    handleAPIError: vi.fn((error: unknown) => {
      const { NextResponse } = require('next/server');
      if (error instanceof APIError) {
        return NextResponse.json(error.toResponse(), { status: error.statusCode });
      }
      return NextResponse.json({ error: { message: 'unexpected' } }, { status: 500 });
    }),
  };
});

const user = {
  id: 'user-1',
  email: 'user@example.com',
  role: 'homeowner' as const,
};

function request(body: unknown) {
  return new NextRequest('http://localhost:3000/api/agents/decision', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': 'test' },
    body: JSON.stringify(body),
  });
}

function validContext(overrides: Record<string, unknown> = {}) {
  return {
    userId: user.id,
    jobId: 'job-1',
    ...overrides,
  };
}

describe('POST /api/agents/decision authorization', () => {
  let POST: typeof import('@/app/api/agents/decision/route').POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.getCurrentUserFromCookies.mockResolvedValue(user);
    mocks.getCurrentUserFromBearerToken.mockResolvedValue(null);
    mocks.requireCSRF.mockResolvedValue(undefined);
    mocks.rateLimiterCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetTime: Date.now() + 60_000,
      retryAfter: 0,
    });
    ({ POST } = await import('@/app/api/agents/decision/route'));
  });

  it('rejects a request that spoofs the signed-in user ID before any DB read', async () => {
    const response = await POST(
      request({ agentName: 'PricingAgent', context: validContext({ userId: 'other-user' }) })
    );

    expect(response.status).toBe(403);
    expect(mocks.supabaseFrom).not.toHaveBeenCalled();
    expect(mocks.agentCall).not.toHaveBeenCalled();
  });

  it('rejects a job that is not owned by the signed-in homeowner', async () => {
    mocks.supabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { homeowner_id: 'other-homeowner', contractor_id: null },
            error: null,
          }),
        }),
      }),
    });

    const response = await POST(
      request({ agentName: 'PricingAgent', context: validContext() })
    );

    expect(response.status).toBe(403);
    expect(mocks.agentCall).not.toHaveBeenCalled();
  });

  it('rejects job-scoped agents without the required job context', async () => {
    const response = await POST(
      request({ agentName: 'PricingAgent', context: { userId: user.id } })
    );

    expect(response.status).toBe(400);
    expect(mocks.supabaseFrom).not.toHaveBeenCalled();
    expect(mocks.agentCall).not.toHaveBeenCalled();
  });
});
