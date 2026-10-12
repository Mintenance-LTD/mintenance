// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  from: vi.fn(),
  admin: vi.fn(),
  contains: vi.fn(),
  order: vi.fn(),
  insert: vi.fn(),
  failure: '',
  options: [] as unknown[],
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (options: unknown, fn: Function) => {
    m.options.push(options);
    return (request: NextRequest) => fn(request, { user: { id: 'admin' } });
  },
}));
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: (...args: unknown[]) => m.admin(...args),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: (...args: unknown[]) => m.from(...args) },
}));
import { POST } from '@/app/api/admin/evidence-retention/export/manifest/route';
const subject = '11111111-1111-4111-8111-111111111111';
const body = {
  subjectId: subject,
  caseReference: 'CASE-TEST',
  identityVerified: true,
};
const call = (value = body) =>
  POST(
    new NextRequest(
      'http://localhost/api/admin/evidence-retention/export/manifest',
      { method: 'POST', body: JSON.stringify(value) }
    ),
    { params: Promise.resolve({}) }
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.failure = '';
  m.admin.mockResolvedValue(undefined);
  m.from.mockImplementation((table: string) => {
    let cursor = '';
    const q = {
      select: () => q,
      contains: (...args: unknown[]) => {
        m.contains(...args);
        return q;
      },
      order: (...args: unknown[]) => {
        m.order(...args);
        return q;
      },
      limit: () => q,
      gt: (_: string, value: string) => {
        cursor = value;
        return q;
      },
      insert: async (value: unknown) => {
        m.insert(value);
        return { error: m.failure === 'audit' ? {} : null };
      },
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(
          resolve({
            data: cursor
              ? []
              : [{ id: subject, archived_at: '2026-01-01T00:00:00Z' }],
            error: m.failure === table ? {} : null,
          })
        ),
    };
    return q;
  });
});
it('collects both archive types, preserves subject filters and uses their actual primary keys', async () => {
  const response = await call();
  const data = await response.json();
  expect(data.records.map((r: { kind: string }) => r.kind)).toEqual([
    'contract',
    'dispute',
  ]);
  expect(m.contains).toHaveBeenCalledTimes(4);
  for (const args of m.contains.mock.calls)
    expect(args).toEqual(['participant_ids', [subject]]);
  expect(m.order).toHaveBeenCalledWith('contract_id', { ascending: true });
  expect(m.order).toHaveBeenCalledWith('dispute_id', { ascending: true });
  expect(m.insert).toHaveBeenCalledWith(
    expect.objectContaining({ performed_by: 'admin', user_id: null })
  );
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(m.options).toContainEqual(
    expect.objectContaining({
      roles: ['admin'],
      requireMfaVerifiedWithinMinutes: 15,
    })
  );
});
it.each(['retained_contract_records', 'retained_dispute_records', 'audit'])(
  'rejects incomplete inventory when %s fails',
  async (failure) => {
    m.failure = failure;
    await expect(call()).rejects.toMatchObject({ statusCode: 500 });
  }
);
it('requires administrator verification before any read', async () => {
  m.admin.mockRejectedValue(new Error('Denied'));
  await expect(call()).rejects.toThrow('Denied');
  expect(m.from).not.toHaveBeenCalled();
});
it('requires a verified subject', async () => {
  await expect(
    call({ ...body, identityVerified: false })
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(m.from).not.toHaveBeenCalled();
});
