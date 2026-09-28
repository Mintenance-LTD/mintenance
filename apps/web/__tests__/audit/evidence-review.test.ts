import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  admin: vi.fn(),
  from: vi.fn(),
  options: [] as object[],
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (options: object, fn: Function) => {
    m.options.push(options);
    return (request: NextRequest) =>
      fn(request, { user: { id: 'trusted-admin' } });
  },
}));
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: (...args: unknown[]) => m.admin(...args),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: (...args: unknown[]) => m.rpc(...args),
    from: (...args: unknown[]) => m.from(...args),
  },
}));
import { GET, POST } from '@/app/api/admin/evidence-retention/route';
const decision = {
  kind: 'dispute',
  id: '11111111-1111-4111-8111-111111111111',
  revision: 2,
  legalHold: true,
  reason: 'Ongoing synthetic claim',
  reviewDueAt: '2026-10-22T12:00:00Z',
};
function submit(body: object = decision) {
  return POST(
    new NextRequest('http://localhost/api/admin/evidence-retention', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) }
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  m.rpc.mockResolvedValue({ data: 3, error: null });
  m.admin.mockResolvedValue(undefined);
});
it('requires fresh MFA and forwards the trusted administrator and expected revision', async () => {
  expect(m.options).toContainEqual({
    roles: ['admin'],
    requireMfaVerifiedWithinMinutes: 15,
  });
  expect(await (await submit()).json()).toEqual({ success: true, revision: 3 });
  expect(m.rpc).toHaveBeenCalledWith(
    'review_retained_evidence',
    expect.objectContaining({
      p_admin_id: 'trusted-admin',
      p_expected_revision: 2,
      p_legal_hold: true,
    })
  );
});
it('does not reserve a decision when the database role check fails', async () => {
  m.admin.mockRejectedValue(new Error('Denied'));
  await expect(submit()).rejects.toThrow('Denied');
  expect(m.rpc).not.toHaveBeenCalled();
});
it('rejects caller-supplied administrator identity', async () => {
  await expect(
    submit({ ...decision, adminId: 'different-admin' })
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(m.rpc).not.toHaveBeenCalled();
});
it.each([
  ['40001', 409],
  ['P0002', 404],
  ['22023', 400],
  ['08006', 500],
])(
  'does not report success for database error %s',
  async (code, statusCode) => {
    m.rpc.mockResolvedValue({ data: null, error: { code } });
    await expect(submit()).rejects.toMatchObject({ statusCode });
  }
);

function list(query = '') {
  return GET(
    new NextRequest(`http://localhost/api/admin/evidence-retention${query}`),
    { params: Promise.resolve({}) }
  );
}
it('continues beyond 50 tied archive timestamps without exposing evidence payloads', async () => {
  const rows = Array.from({ length: 51 }, (_, index) => ({
    id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
    archived_at: '2026-09-22T12:00:00+00:00',
    review_due_at: '2026-10-22T12:00:00Z',
  }));
  const filters: string[] = [];
  const selections: string[] = [];
  m.from.mockImplementation((table: string) => {
    let filter = '';
    const builder = {
      select: (selection: string) => {
        selections.push(selection);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      or: (value: string) => {
        filter = value;
        filters.push(value);
        return builder;
      },
      in: () => builder,
      then: (resolve: (value: object) => unknown) =>
        resolve({
          data:
            table === 'retained_contract_records'
              ? filter
                ? rows.slice(50)
                : rows
              : [],
          error: null,
        }),
    };
    return builder;
  });
  const first = await (await list()).json();
  expect(first.records).toHaveLength(50);
  expect(first.next).toContain('contractAfter=');
  const second = await (await list(`?${first.next}`)).json();
  expect(second.records).toHaveLength(1);
  expect(second.records[0].id).toBe(rows[50].id);
  expect(second.next).toBeNull();
  expect(filters[0]).toContain(`contract_id.gt.${rows[49].id}`);
  expect(selections.join(',')).not.toContain('evidence');
});
it.each([
  'not-json',
  Buffer.from(
    JSON.stringify({ archivedAt: 'bad),id.gt.0', id: 'not-a-uuid' })
  ).toString('base64url'),
])(
  'rejects malformed pagination cursors before querying archives',
  async (cursor) => {
    await expect(list(`?contractAfter=${cursor}`)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(m.from).not.toHaveBeenCalled();
  }
);
it('checks the administrator role before listing private archive metadata', async () => {
  m.admin.mockRejectedValue(new Error('Denied'));
  await expect(list()).rejects.toThrow('Denied');
  expect(m.from).not.toHaveBeenCalled();
});
