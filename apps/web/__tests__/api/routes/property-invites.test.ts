// @vitest-environment node
/**
 * Tests for /api/properties/invites
 * Route: apps/web/app/api/properties/invites/route.ts
 *
 * This is the invitee's half of the property-team feature, which did not exist
 * before: invites were written as `pending` rows and emailed, but the only RLS
 * policy on property_team_members was owner-scoped and no accept route existed,
 * so nobody could ever join a team. Production holds zero rows.
 *
 * The properties worth pinning are the security ones:
 *   - you can only answer an invite addressed to your own verified email
 *   - `role` comes from the invite, never from the request body (otherwise an
 *     invitee could promote themselves to admin of someone else's property)
 *   - an invite can only be answered once
 */
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  supabaseFrom: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
  getCurrentUserFromBearerToken: mocks.getCurrentUserFromBearerToken,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: (...a: unknown[]) => mocks.supabaseFrom(...a) },
}));
vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.requireCSRF }));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rateLimiterCheckRateLimit },
}));
vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
  BUSINESS_RULES: {},
  RATE_LIMITS: {},
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
}));
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));
vi.mock('@/lib/cors', () => ({ getCorsHeaders: vi.fn(() => ({})) }));

vi.mock('@/lib/errors/api-error', async () => {
  class APIError extends Error {
    constructor(
      public code: string,
      public userMessage: string,
      public statusCode = 500
    ) {
      super(userMessage);
    }
    toResponse() {
      return { error: { code: this.code, message: this.userMessage } };
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
    constructor(m = 'Not found') {
      super('NOT_FOUND', m, 404);
    }
  }
  class BadRequestError extends APIError {
    constructor(m = 'Bad Request') {
      super('BAD_REQUEST', m, 400);
    }
  }
  return {
    APIError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
    handleAPIError: vi.fn((e: unknown) => {
      const { NextResponse } = require('next/server');
      if (e instanceof APIError)
        return NextResponse.json(e.toResponse(), { status: e.statusCode });
      return NextResponse.json({ error: 'unexpected' }, { status: 500 });
    }),
  };
});

const ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const INVITE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PROPERTY_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const MY_EMAIL = 'me@example.com';

const me = {
  id: ME,
  email: MY_EMAIL,
  role: 'homeowner' as const,
  first_name: 'M',
  last_name: 'E',
};

/** Captures whatever the route writes so tests can assert on the payload. */
let updatePayload: Record<string, unknown> | null = null;
let inviteRow: Record<string, unknown> | null = null;
let listRows: unknown[] = [];

function wireSupabase() {
  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { email: MY_EMAIL },
              error: null,
            }),
          }),
        }),
      };
    }
    // property_team_members
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.or = () => chain;
    chain.order = async () => ({ data: listRows, error: null });
    chain.maybeSingle = async () => ({ data: inviteRow, error: null });
    chain.update = (payload: Record<string, unknown>) => {
      updatePayload = payload;
      const upd: Record<string, unknown> = {};
      upd.eq = () => upd;
      (upd as { then: unknown }).then = (r: (v: unknown) => void) =>
        r({ error: null });
      return upd;
    };
    return chain;
  });
}

function req(body?: unknown, method = 'POST') {
  return new NextRequest(
    new URL('/api/properties/invites', 'http://localhost:3000'),
    {
      method,
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 't' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }
  );
}

async function callPost(body: unknown) {
  const { POST } = await import('@/app/api/properties/invites/route');
  return POST(req(body), { params: Promise.resolve({}) });
}

async function callGet() {
  const { GET } = await import('@/app/api/properties/invites/route');
  return GET(req(undefined, 'GET'), { params: Promise.resolve({}) });
}

beforeEach(() => {
  vi.clearAllMocks();
  updatePayload = null;
  listRows = [];
  inviteRow = {
    id: INVITE_ID,
    property_id: PROPERTY_ID,
    email: MY_EMAIL,
    role: 'manager',
    status: 'pending',
    user_id: null,
  };
  mocks.getCurrentUserFromCookies.mockResolvedValue(me);
  mocks.getCurrentUserFromBearerToken.mockResolvedValue(null);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 19,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  wireSupabase();
});

describe('GET /api/properties/invites', () => {
  it('lists invites addressed to me with their property', async () => {
    listRows = [
      {
        id: INVITE_ID,
        role: 'manager',
        status: 'pending',
        email: MY_EMAIL,
        created_at: '2026-07-01T00:00:00Z',
        property_id: PROPERTY_ID,
        properties: {
          id: PROPERTY_ID,
          property_name: '14 Bramley Court',
          address: 'Bath',
        },
      },
    ];
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invites).toHaveLength(1);
    expect(body.invites[0].propertyName).toBe('14 Bramley Court');
    expect(body.invites[0].role).toBe('manager');
  });

  it('handles the embed arriving as an array rather than an object', async () => {
    listRows = [
      {
        id: INVITE_ID,
        role: 'viewer',
        status: 'pending',
        email: MY_EMAIL,
        created_at: '2026-07-01T00:00:00Z',
        property_id: PROPERTY_ID,
        properties: [
          { id: PROPERTY_ID, property_name: 'Flat 2', address: 'Bristol' },
        ],
      },
    ];
    const res = await callGet();
    const body = await res.json();
    expect(body.invites[0].propertyName).toBe('Flat 2');
  });
});

describe('POST /api/properties/invites', () => {
  it('accepts an invite addressed to me and binds it to my account', async () => {
    const res = await callPost({ inviteId: INVITE_ID, action: 'accept' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('accepted');
    expect(body.role).toBe('manager');
    expect(updatePayload).toMatchObject({ status: 'accepted', user_id: ME });
  });

  it('declines without claiming the row', async () => {
    const res = await callPost({ inviteId: INVITE_ID, action: 'decline' });
    expect(res.status).toBe(200);
    expect(updatePayload).toMatchObject({ status: 'declined', user_id: null });
  });

  it('never takes the role from the request body', async () => {
    const res = await callPost({
      inviteId: INVITE_ID,
      action: 'accept',
      role: 'admin',
    });
    // .strict() rejects the extra key outright...
    expect(res.status).toBe(400);
    // ...and nothing was written.
    expect(updatePayload).toBeNull();
  });

  it('refuses an invite addressed to a different email', async () => {
    inviteRow = { ...inviteRow!, email: 'someone.else@example.com' };
    const res = await callPost({ inviteId: INVITE_ID, action: 'accept' });
    expect(res.status).toBe(403);
    expect(updatePayload).toBeNull();
  });

  it('refuses an invite that was already answered', async () => {
    inviteRow = { ...inviteRow!, status: 'accepted' };
    const res = await callPost({ inviteId: INVITE_ID, action: 'accept' });
    expect(res.status).toBe(400);
    expect(updatePayload).toBeNull();
  });

  it('404-style rejects an unknown invite', async () => {
    inviteRow = null;
    const res = await callPost({ inviteId: INVITE_ID, action: 'accept' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid action', async () => {
    const res = await callPost({ inviteId: INVITE_ID, action: 'maybe' });
    expect(res.status).toBe(400);
  });
});
