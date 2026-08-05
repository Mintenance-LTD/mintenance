// @vitest-environment node
/**
 * IDOR regression tests for GET /api/jobs/[id]/rooms.
 *
 * RLS (job_rooms_select_via_job) never runs on web, so the handler re-checks
 * the same visibility rule in code before returning the room snapshot:
 * homeowner, assigned contractor, an open job ('posted'/'published'), or admin.
 *
 * globals: true in vitest.config — do not import from 'vitest' directly.
 */

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
  createRequestScopedClient: () => null,
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: () => Promise.resolve(H.state.user),
  getCurrentUserFromBearerToken: () => Promise.resolve(null),
}));

vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: {
    checkRateLimit: () =>
      Promise.resolve({ allowed: true, remaining: 59, resetTime: 9_999_999_999_999 }),
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
    `http://localhost:3000/api/jobs/${JOB_ID}/rooms`,
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

function setJob(fields: {
  homeowner_id?: string | null;
  contractor_id?: string | null;
  status: string;
}) {
  H.state.tables.jobs = {
    data: {
      id: JOB_ID,
      homeowner_id: fields.homeowner_id ?? HOMEOWNER_ID,
      contractor_id: fields.contractor_id ?? null,
      status: fields.status,
    },
    error: null,
  };
}

describe('GET /api/jobs/[id]/rooms — visibility gate', () => {
  beforeEach(() => {
    H.state.user = null;
    H.state.tables = {
      job_rooms: {
        data: [
          {
            id: 'room-1',
            property_room_id: 'pr-1',
            name: 'Kitchen',
            room_type: 'kitchen',
            size_sqm_at_post: 12,
            created_at: '2026-08-01T00:00:00Z',
          },
        ],
        error: null,
      },
    };
    // Default: assigned job owned by HOMEOWNER, worked by CONTRACTOR.
    setJob({ contractor_id: CONTRACTOR_ID, status: 'in_progress' });
  });

  it('lets the homeowner read the room snapshot', async () => {
    asUser(HOMEOWNER_ID, 'homeowner');
    const res = await makeGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rooms).toHaveLength(1);
  });

  it('lets the assigned contractor read the room snapshot', async () => {
    asUser(CONTRACTOR_ID, 'contractor');
    expect((await makeGet()).status).toBe(200);
  });

  it('lets any authenticated user read an OPEN (posted) job', async () => {
    setJob({ contractor_id: null, status: 'posted' });
    asUser(STRANGER_ID, 'contractor');
    expect((await makeGet()).status).toBe(200);
  });

  it('BLOCKS a stranger on an assigned job with 403 (IDOR)', async () => {
    asUser(STRANGER_ID, 'contractor');
    expect((await makeGet()).status).toBe(403);
  });

  it('BLOCKS a non-owner homeowner on an in-progress job with 403 (IDOR)', async () => {
    asUser(STRANGER_ID, 'homeowner');
    expect((await makeGet()).status).toBe(403);
  });

  it('allows an admin through', async () => {
    asUser(STRANGER_ID, 'admin');
    expect((await makeGet()).status).toBe(200);
  });

  it('rejects a non-UUID job id with 404 before any lookup', async () => {
    asUser(HOMEOWNER_ID, 'homeowner');
    const request = new NextRequest(
      'http://localhost:3000/api/jobs/not-a-uuid/rooms',
      { method: 'GET' }
    );
    const res = await GET(request, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });
    expect(res.status).toBe(404);
  });
});
