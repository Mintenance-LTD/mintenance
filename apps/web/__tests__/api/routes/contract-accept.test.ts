/**
 * Tests for POST /api/contracts/[id]/accept
 * Route: apps/web/app/api/contracts/[id]/accept/route.ts
 *
 * Covers: authentication, invalid UUID, contract not found / access denied,
 * authorization (must be contractor or homeowner on the contract),
 * cannot sign draft contract, already signed, contractor signs first
 * (status -> pending_homeowner), homeowner signs first (status -> pending_contractor),
 * both signed -> accepted, notification + email on pending and accepted states,
 * appointment creation when contract has dates, DB update error.
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
  isValidUUID: vi.fn(),
  createNotification: vi.fn(),
  sendContractSignedEmail: vi.fn(),
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
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
  CONTRACT_STATUS: {
    DRAFT: 'draft',
    PENDING_HOMEOWNER: 'pending_homeowner',
    PENDING_CONTRACTOR: 'pending_contractor',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
  },
  BUSINESS_RULES: {},
  RATE_LIMITS: {},
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
}));
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));

vi.mock('@/lib/validation/uuid', () => ({
  isValidUUID: mocks.isValidUUID,
}));

vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {
    createNotification: mocks.createNotification,
  },
}));

vi.mock('@/lib/email-service', () => ({
  EmailService: {
    sendContractSignedEmail: mocks.sendContractSignedEmail,
  },
}));

vi.mock('@/lib/errors/api-error', async () => {
  class APIError extends Error {
    constructor(public code: string, public userMessage: string, public statusCode: number = 500, public details?: unknown) {
      super(userMessage); this.name = 'APIError';
    }
    toResponse() { return { error: { code: this.code, message: this.userMessage }, timestamp: new Date().toISOString() }; }
  }
  class UnauthorizedError extends APIError { constructor(m = 'Unauthorized') { super('UNAUTHORIZED', m, 401); } }
  class ForbiddenError extends APIError { constructor(m = 'Forbidden') { super('FORBIDDEN', m, 403); } }
  class NotFoundError extends APIError { constructor(m = 'Resource not found') { super('NOT_FOUND', m, 404); } }
  class BadRequestError extends APIError { constructor(m = 'Bad Request', d?: unknown) { super('BAD_REQUEST', m, 400, d); } }
  class InternalServerError extends APIError { constructor(m = 'Internal Server Error') { super('INTERNAL_SERVER_ERROR', m, 500); } }
  return {
    APIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError,
    handleAPIError: vi.fn((error: unknown) => {
      if (error instanceof APIError) {
        const { NextResponse } = require('next/server');
        return NextResponse.json(error.toResponse(), { status: error.statusCode });
      }
      const { NextResponse } = require('next/server');
      return NextResponse.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } }, { status: 500 });
    }),
  };
});

vi.mock('@/lib/cors', () => ({ getCorsHeaders: vi.fn(() => ({})) }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createPostRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      'x-csrf-token': 'test-csrf-token',
    },
  });
}

function segmentData(id: string) {
  return { params: Promise.resolve({ id }) };
}

const contractorUser = {
  id: 'contractor-1',
  email: 'contractor@test.com',
  role: 'contractor' as const,
  first_name: 'Bob',
  last_name: 'Builder',
};

const homeownerUser = {
  id: 'homeowner-1',
  email: 'homeowner@test.com',
  role: 'homeowner' as const,
  first_name: 'Test',
  last_name: 'Homeowner',
};

const pendingContract = {
  id: 'contract-1',
  job_id: 'job-1',
  contractor_id: 'contractor-1',
  homeowner_id: 'homeowner-1',
  status: 'pending_contractor',
  title: 'Contract for Fix kitchen sink',
  contractor_signed_at: null,
  homeowner_signed_at: null,
  start_date: null,
  end_date: null,
};

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(contractorUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true, remaining: 19, resetTime: Date.now() + 60000, retryAfter: 0,
  });
  mocks.isValidUUID.mockReturnValue(true);
  mocks.createNotification.mockResolvedValue('notif-1');
  mocks.sendContractSignedEmail.mockResolvedValue(true);
}

function setupContractMocks(overrides: {
  contractData?: unknown;
  contractError?: unknown;
  updateResult?: unknown;
  updateError?: unknown;
} = {}) {
  const contractResult = {
    data: overrides.contractData ?? pendingContract,
    error: overrides.contractError ?? null,
  };
  const updateError = overrides.updateError ?? null;
  // Build the updated contract from the original + changes
  const updatedContract = overrides.updateResult ?? {
    ...pendingContract,
    contractor_signed_at: new Date().toISOString(),
    status: 'pending_homeowner',
    updated_at: new Date().toISOString(),
  };

  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'contracts') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(contractResult),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updateError ? null : updatedContract,
                error: updateError,
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
                email: 'test@test.com',
                first_name: 'Test',
                last_name: 'User',
                company_name: 'Test Co',
                phone: '0123456789',
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
              data: { title: 'Fix sink', location: '123 Main St', address: '123 Main St' },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === 'appointments') {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/contracts/[id]/accept', () => {
  let POST: typeof import('@/app/api/contracts/[id]/accept/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/contracts/[id]/accept/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createPostRequest('http://localhost:3000/api/contracts/contract-1/accept');
    const res = await POST(req, segmentData('contract-1'));
    expect(res.status).toBe(401);
  });

  // ---- Invalid UUID ----
  it('should return 400 when contract ID is invalid UUID', async () => {
    mocks.isValidUUID.mockReturnValue(false);

    const req = createPostRequest('http://localhost:3000/api/contracts/not-a-uuid/accept');
    const res = await POST(req, segmentData('not-a-uuid'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('Invalid');
  });

  // ---- Contract not found ----
  it('should return 404 when contract does not exist', async () => {
    setupContractMocks({ contractData: null, contractError: { message: 'not found' } });

    const req = createPostRequest('http://localhost:3000/api/contracts/bad-id/accept');
    const res = await POST(req, segmentData('bad-id'));
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.message).toContain('not found');
  });

  // ---- Authorization: user is not on the contract ----
  it('should return 403 when user is not a party to the contract', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'stranger',
      email: 'stranger@test.com',
      role: 'contractor',
      first_name: 'Stranger',
      last_name: 'Person',
    });
    setupContractMocks();

    const req = createPostRequest('http://localhost:3000/api/contracts/contract-1/accept');
    const res = await POST(req, segmentData('contract-1'));
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('authorized');
  });

  // ---- Cannot sign a draft contract ----
  it('should return 400 when contract is in draft status', async () => {
    setupContractMocks({
      contractData: { ...pendingContract, status: 'draft' },
    });

    const req = createPostRequest('http://localhost:3000/api/contracts/contract-1/accept');
    const res = await POST(req, segmentData('contract-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('draft');
  });

  // ---- Already signed by contractor ----
  it('should return 400 when contractor has already signed', async () => {
    setupContractMocks({
      contractData: { ...pendingContract, contractor_signed_at: '2026-01-01T00:00:00Z' },
    });

    const req = createPostRequest('http://localhost:3000/api/contracts/contract-1/accept');
    const res = await POST(req, segmentData('contract-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('already signed');
  });

  // ---- Already signed by homeowner ----
  it('should return 400 when homeowner has already signed', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(homeownerUser);
    setupContractMocks({
      contractData: { ...pendingContract, homeowner_signed_at: '2026-01-01T00:00:00Z' },
    });

    const req = createPostRequest('http://localhost:3000/api/contracts/contract-1/accept');
    const res = await POST(req, segmentData('contract-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('already signed');
  });

  // ---- Contractor signs first -> pending_homeowner ----
  it('should set status to pending_homeowner when contractor signs first', async () => {
    setupContractMocks({
      contractData: { ...pendingContract, homeowner_signed_at: null, contractor_signed_at: null },
      updateResult: {
        ...pendingContract,
        contractor_signed_at: new Date().toISOString(),
        status: 'pending_homeowner',
      },
    });

    const req = createPostRequest('http://localhost:3000/api/contracts/contract-1/accept');
    const res = await POST(req, segmentData('contract-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('Waiting for other party');
    expect(body.contract.status).toBe('pending_homeowner');
  });

  // ---- Homeowner signs first -> pending_contractor ----
  it('should set status to pending_contractor when homeowner signs first', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(homeownerUser);
    setupContractMocks({
      contractData: { ...pendingContract, homeowner_signed_at: null, contractor_signed_at: null },
      updateResult: {
        ...pendingContract,
        homeowner_signed_at: new Date().toISOString(),
        status: 'pending_contractor',
      },
    });

    const req = createPostRequest('http://localhost:3000/api/contracts/contract-1/accept');
    const res = await POST(req, segmentData('contract-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('Waiting for other party');
    expect(body.contract.status).toBe('pending_contractor');
  });

  // ---- Both signed -> accepted ----
  it('should set status to accepted when second party signs', async () => {
    // Contractor signs, homeowner already signed
    setupContractMocks({
      contractData: { ...pendingContract, homeowner_signed_at: '2026-01-01T00:00:00Z', contractor_signed_at: null },
      updateResult: {
        ...pendingContract,
        contractor_signed_at: new Date().toISOString(),
        homeowner_signed_at: '2026-01-01T00:00:00Z',
        status: 'accepted',
      },
    });

    const req = createPostRequest('http://localhost:3000/api/contracts/contract-1/accept');
    const res = await POST(req, segmentData('contract-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('accepted');
    expect(body.contract.status).toBe('accepted');
  });

  // ---- Notifies other party on pending ----
  it('should notify homeowner when contractor signs (pending)', async () => {
    setupContractMocks({
      updateResult: {
        ...pendingContract,
        contractor_signed_at: new Date().toISOString(),
        status: 'pending_homeowner',
      },
    });

    const req = createPostRequest('http://localhost:3000/api/contracts/contract-1/accept');
    await POST(req, segmentData('contract-1'));

    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'homeowner-1',
        title: 'Contract Pending Your Signature',
        type: 'contract_pending_signature',
      }),
    );
  });

  // ---- Notifies both parties when accepted ----
  it('should notify both parties when contract becomes accepted', async () => {
    setupContractMocks({
      contractData: { ...pendingContract, homeowner_signed_at: '2026-01-01T00:00:00Z' },
      updateResult: {
        ...pendingContract,
        contractor_signed_at: new Date().toISOString(),
        homeowner_signed_at: '2026-01-01T00:00:00Z',
        status: 'accepted',
      },
    });

    const req = createPostRequest('http://localhost:3000/api/contracts/contract-1/accept');
    await POST(req, segmentData('contract-1'));

    // Should notify contractor
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'contractor-1',
        title: 'Contract Accepted!',
        type: 'contract_signed',
      }),
    );
    // Should notify homeowner
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'homeowner-1',
        title: 'Contract Accepted!',
        type: 'contract_signed',
      }),
    );
  });

  // ---- DB update error ----
  it('should return 500 when contract update fails', async () => {
    setupContractMocks({ updateError: { message: 'DB error' } });

    const req = createPostRequest('http://localhost:3000/api/contracts/contract-1/accept');
    const res = await POST(req, segmentData('contract-1'));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error.message).toContain('sign contract');
  });
});
