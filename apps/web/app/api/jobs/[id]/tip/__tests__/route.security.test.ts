// @vitest-environment node
/**
 * IDOR regression tests for GET /api/jobs/[id]/tip.
 *
 * On web there is no Supabase session (auth is a custom JWT cookie), so the
 * route's `createRequestScopedClient(request) ?? serverSupabase` resolves to
 * the service-role client and RLS never runs. The handler must therefore gate
 * on job participation IN CODE before returning tip rows (amounts, notes,
 * payer/payee ids). These tests pin that gate.
 *
 * globals: true in vitest.config — do not import from 'vitest' directly.
 */

// Hoisted mutable state + plain-function mocks. Plain functions (not vi.fn)
// survive the global `vi.resetAllMocks()` in test/setup.ts, so the mock
// behaviour stays intact across every test in this file.
const H = vi.hoisted(() => {
  const state: {
    user: {
      id: string;
      email: string;
      role: string;
      first_name: string;
      last_name: string;
    } | null;
    tables: Record<string, { data: unknown; error: unknown }>;
  } = { user: null, tables: {} };

  const makeBuilder = (table: string) => {
    const resp = () => state.tables[table] ?? { data: null, error: null };
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      in: () => b,
      limit: () => b,
      order: () => Promise.resolve(resp()),
      single: () => Promise.resolve(resp()),
      maybeSingle: () => Promise.resolve(resp()),
    };
    return b;
  };

  return { state, client: { from: (table: string) => makeBuilder(table) } };
});

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: H.client,
  // Web has no Supabase session → request-scoped client is null → the route
  // falls back to the service-role client. This is exactly the condition that
  // makes the in-code gate load-bearing.
  createRequestScopedClient: () => null,
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: () => Promise.resolve(H.state.user),
  getCurrentUserFromBearerToken: () => Promise.resolve(null),
}));

vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: {
    checkRateLimit: () =>
      Promise.resolve({ allowed: true, remaining: 29, resetTime: 9_999_999_999_999 }),
  },
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';

const JOB_ID = '11111111-1111-4111-8111-111111111111';
const HOMEOWNER_ID = '22222222-2222-4222-8222-222222222222';
const CONTRACTOR_ID = '33333333-3333-4333-8333-333333333333';
const STRANGER_ID = '44444444-4444-4444-8444-444444444444';

function makeGet() {
  const request = new NextRequest(
    `http://localhost:3000/api/jobs/${JOB_ID}/tip`,
    { method: 'GET' }
  );
  return GET(request, { params: Promise.resolve({ id: JOB_ID }) });
}

function asUser(id: string, role: string) {
  H.state.user = {
    id,
    email: `${id}@example.com`,
    role,
    first_name: 'Test',
    last_name: 'User',
  };
}

describe('GET /api/jobs/[id]/tip — participant gate', () => {
  beforeEach(() => {
    H.state.user = null;
    H.state.tables = {
      jobs: {
        data: {
          id: JOB_ID,
          homeowner_id: HOMEOWNER_ID,
          contractor_id: CONTRACTOR_ID,
        },
        error: null,
      },
      job_tips: {
        data: [
          {
            id: 'tip-1',
            amount: 10,
            currency: 'gbp',
            status: 'completed',
            note: 'thanks',
            paid_at: null,
            created_at: '2026-08-01T00:00:00Z',
            payer_id: HOMEOWNER_ID,
            payee_id: CONTRACTOR_ID,
          },
        ],
        error: null,
      },
    };
  });

  it('lets the job homeowner read tips', async () => {
    asUser(HOMEOWNER_ID, 'homeowner');
    const res = await makeGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tips).toHaveLength(1);
    expect(body.totalCompleted).toBe(10);
  });

  it('lets the assigned contractor read tips', async () => {
    asUser(CONTRACTOR_ID, 'contractor');
    const res = await makeGet();
    expect(res.status).toBe(200);
  });

  it('BLOCKS a stranger contractor with 403 (IDOR)', async () => {
    asUser(STRANGER_ID, 'contractor');
    const res = await makeGet();
    expect(res.status).toBe(403);
  });

  it('BLOCKS a stranger homeowner with 403 (IDOR)', async () => {
    asUser(STRANGER_ID, 'homeowner');
    const res = await makeGet();
    expect(res.status).toBe(403);
  });

  it('allows an admin through', async () => {
    asUser(STRANGER_ID, 'admin');
    const res = await makeGet();
    expect(res.status).toBe(200);
  });

  it('returns 404 when the job does not exist', async () => {
    asUser(HOMEOWNER_ID, 'homeowner');
    H.state.tables.jobs = { data: null, error: { code: 'PGRST116' } };
    const res = await makeGet();
    expect(res.status).toBe(404);
  });
});
