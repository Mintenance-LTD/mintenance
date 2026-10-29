// @vitest-environment node
import { GET as dashboardGET } from '@/app/api/admin/security-dashboard/route';
import { GET as verificationsGET } from '@/app/api/admin/verifications/route';

const db = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  blocked: vi.fn(),
  guards: [] as Array<Record<string, unknown>>,
}));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: db }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (options: Record<string, unknown>, handler: unknown) => {
    db.guards.push(options);
    return handler;
  },
}));
vi.mock('@mintenance/shared', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/cors', () => ({ getCorsHeaders: () => ({}) }));
vi.mock('@/lib/security-monitor', () => ({ securityMonitor: {} }));
vi.mock('@/lib/services/admin/AdminActivityLogger', () => ({
  AdminActivityLogger: {},
}));
vi.mock('@/lib/services/admin/IPBlockingService', () => ({
  IPBlockingService: { getBlockedIPs: db.blocked },
}));

type Row = Record<string, unknown>;
type DbError = { code: string; message: string };
const rows: Record<string, Row[]> = {};
const failures: Record<string, DbError> = {};
// Columns verified against production metadata on 24 October 2026. Unlike
// canned query mocks, this rejects stale column names and applies aliases.
const columns: Record<string, Set<string>> = {
  security_events: new Set([
    'id',
    'event_type',
    'severity',
    'ip_address',
    'user_id',
    'details',
    'metadata',
    'resolved',
    'created_at',
  ]),
  contractor_skills: new Set([
    'contractor_id',
    'skill_name',
    'years_experience',
    'is_verified',
  ]),
};
function query(table: string) {
  let selection = '';
  const chain = {
    select: (value: string) => {
      selection = value;
      return chain;
    },
    eq: () => chain,
    is: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    gte: () => chain,
    in: () => chain,
    not: () => chain,
    range: () => chain,
    then: (resolve: (result: unknown) => unknown) => {
      const fields = selection
        .split(',')
        .map((field) => field.trim().split(':'));
      const invalid = fields.find(
        (parts) => columns[table] && !columns[table].has(parts.at(-1)!)
      );
      const error =
        failures[`${table}:${selection}`] ??
        failures[table] ??
        (invalid
          ? {
              code: '42703',
              message: `column ${invalid.at(-1)} does not exist`,
            }
          : null);
      const data = error
        ? null
        : (rows[table] ?? []).map((row) =>
            Object.fromEntries(
              fields.map((parts) => [parts[0], row[parts.at(-1)!]])
            )
          );
      return Promise.resolve(
        resolve({ data, error, count: data?.length ?? 0 })
      );
    },
  };
  return chain;
}
type Handler = (
  request: Request,
  context: { user: { id: string } }
) => Promise<Response>;
const dashboard = () =>
  (dashboardGET as unknown as Handler)(
    new Request('https://example.test/api/admin/security-dashboard'),
    { user: { id: 'admin' } }
  );
const verifications = () =>
  (verificationsGET as unknown as Handler)(
    new Request('https://example.test/api/admin/verifications'),
    { user: { id: 'admin' } }
  );

beforeEach(() => {
  for (const key of Object.keys(rows)) delete rows[key];
  for (const key of Object.keys(failures)) delete failures[key];
  rows.security_events = [
    {
      id: 'event',
      details: 'Synthetic event detail',
      ip_address: '192.0.2.1',
      resolved: false,
    },
  ];
  rows.profiles = [{ id: 'contractor', admin_verified: false }];
  rows.contractor_skills = [
    {
      contractor_id: 'contractor',
      skill_name: 'Plumbing',
      years_experience: 5,
      is_verified: true,
    },
    {
      contractor_id: 'contractor',
      skill_name: 'Painting',
      years_experience: 2,
      is_verified: false,
    },
  ];
  db.from.mockImplementation(query);
  db.rpc.mockResolvedValue({ data: [{ total_events: 1 }], error: null });
  db.blocked.mockResolvedValue({ ips: [{ ip_address: '192.0.2.1' }] });
});

it('preserves admin authorization and fresh MFA on the security dashboard', () => {
  expect(db.guards).toContainEqual(
    expect.objectContaining({
      roles: ['admin'],
      requireMfaVerifiedWithinMinutes: 15,
    })
  );
  expect(db.guards).toContainEqual({
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
  });
});

it('returns event descriptions and blocked-IP information from the canonical schema', async () => {
  const response = await dashboard();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.recent_events[0].description).toBe('Synthetic event detail');
  expect(body.top_offending_ips).toEqual([
    { ip: '192.0.2.1', count: 1, is_blocked: true },
  ]);
  expect(body.blocked_ips).toHaveLength(1);
  expect(body.warning).toBeUndefined();
});

it.each(['42883', 'PGRST202'])(
  'retains real event/IP data when the metrics RPC is absent (%s)',
  async (code) => {
    db.rpc.mockResolvedValue({
      data: null,
      error: { code, message: 'Missing RPC' },
    });
    const body = await (await dashboard()).json();
    expect(body.recent_events[0].description).toBe('Synthetic event detail');
    expect(body.blocked_ips).toHaveLength(1);
    expect(body.warning).toContain('metrics function not available');
  }
);

it.each(['42703', '42P01', '42501'])(
  'rejects failed event queries instead of reporting an empty dashboard (%s)',
  async (code) => {
    failures.security_events = { code, message: 'column does not exist' };
    await expect(dashboard()).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch recent events',
    });
  }
);

it('does not hide an event failure in the missing-metrics fallback', async () => {
  db.rpc.mockResolvedValue({
    data: null,
    error: { code: 'PGRST202', message: 'Missing RPC' },
  });
  failures.security_events = {
    code: '42703',
    message: 'column does not exist',
  };
  await expect(dashboard()).rejects.toMatchObject({ statusCode: 500 });
});

it('rejects failed IP queries instead of reporting empty blocked-IP data', async () => {
  failures['security_events:ip_address'] = {
    code: '42703',
    message: 'column does not exist',
  };
  await expect(dashboard()).rejects.toMatchObject({
    statusCode: 500,
    message: 'Failed to fetch IP data',
  });
});

it('does not treat arbitrary metrics function errors as a missing RPC', async () => {
  db.rpc.mockResolvedValue({
    data: null,
    error: { code: '42703', message: 'column in function does not exist' },
  });
  await expect(dashboard()).rejects.toMatchObject({
    statusCode: 500,
    message: 'Failed to fetch security metrics',
  });
});

it('preserves verified and unverified skills in the existing response contract', async () => {
  const response = await verifications();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.data[0].skills).toEqual([
    { skill_name: 'Plumbing', years_experience: 5, verified: true },
    { skill_name: 'Painting', years_experience: 2, verified: false },
  ]);
});

it('reports a skills query failure instead of a successful empty skills list', async () => {
  failures.contractor_skills = {
    code: '42703',
    message: 'column does not exist',
  };
  const response = await verifications();
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    error: 'Failed to fetch contractor verification skills',
  });
});

it('allows a legitimately empty skills list', async () => {
  rows.contractor_skills = [];
  const response = await verifications();
  expect(response.status).toBe(200);
  expect((await response.json()).data[0].skills).toEqual([]);
});
