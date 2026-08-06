// @vitest-environment node
/**
 * IDOR regression tests for GET /api/properties/[id]/rooms.
 *
 * The contractor branch used to fall back to the service-role client trusting
 * the RLS property_rooms_contractor_read policy to gate by job status — but RLS
 * never runs on web, so ANY contractor could read ANY property's rooms. The
 * handler now enforces that policy in code: a contractor may read only when
 * they hold a job on the property with status assigned/in_progress/completed.
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
    authorized: boolean;
    tables: Record<string, { data: unknown; error: unknown }>;
  } = { user: null, authorized: false, tables: {} };

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

vi.mock('@/lib/services/property-team/PropertyTeamService', () => ({
  PropertyTeamService: {
    authorize: () => Promise.resolve({ authorized: H.state.authorized }),
  },
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';

const PROPERTY_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '22222222-2222-4222-8222-222222222222';
const CONTRACTOR_ID = '33333333-3333-4333-8333-333333333333';
const STRANGER_ID = '44444444-4444-4444-8444-444444444444';

function makeGet() {
  const request = new NextRequest(
    `http://localhost:3000/api/properties/${PROPERTY_ID}/rooms`,
    { method: 'GET' }
  );
  return GET(request, { params: Promise.resolve({ id: PROPERTY_ID }) });
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

describe('GET /api/properties/[id]/rooms — contractor gate', () => {
  beforeEach(() => {
    H.state.user = null;
    H.state.authorized = false;
    H.state.tables = {
      // No qualifying job by default — contractor branch denies.
      jobs: { data: null, error: null },
      property_rooms: {
        data: [
          {
            id: 'room-1',
            name: 'Kitchen',
            room_type: 'kitchen',
            size_sqm: 12,
            notes: null,
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-01T00:00:00Z',
          },
        ],
        error: null,
      },
    };
  });

  it('lets the owner (team-view authorized) read rooms', async () => {
    H.state.authorized = true;
    asUser(OWNER_ID, 'homeowner');
    const res = await makeGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rooms).toHaveLength(1);
  });

  it('BLOCKS a contractor with NO qualifying job (IDOR) with 404', async () => {
    asUser(CONTRACTOR_ID, 'contractor');
    // jobs lookup returns nothing → deny.
    expect((await makeGet()).status).toBe(404);
  });

  it('lets a contractor WITH an active job on the property read rooms', async () => {
    asUser(CONTRACTOR_ID, 'contractor');
    H.state.tables.jobs = { data: { id: 'job-1' }, error: null };
    expect((await makeGet()).status).toBe(200);
  });

  it('BLOCKS a homeowner who does not own the property with 404', async () => {
    asUser(STRANGER_ID, 'homeowner');
    expect((await makeGet()).status).toBe(404);
  });

  it('allows an admin through', async () => {
    asUser(STRANGER_ID, 'admin');
    expect((await makeGet()).status).toBe(200);
  });

  it('rejects a non-UUID property id with 404 before any lookup', async () => {
    asUser(OWNER_ID, 'homeowner');
    const request = new NextRequest(
      'http://localhost:3000/api/properties/not-a-uuid/rooms',
      { method: 'GET' }
    );
    const res = await GET(request, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });
    expect(res.status).toBe(404);
  });
});
