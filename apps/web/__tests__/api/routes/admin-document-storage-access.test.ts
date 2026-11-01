import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  from: vi.fn(),
  sign: vi.fn(),
  rows: [] as Record<string, unknown>[],
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {},
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: m.from,
    storage: { from: () => ({ createSignedUrls: m.sign }) },
  },
}));
import { GET } from '@/app/api/admin/verifications/documents/route';
beforeEach(() => {
  vi.clearAllMocks();
  m.rows = [];
  m.sign.mockImplementation(async (paths: string[]) => ({
    data: paths.map((path) => ({ path, signedUrl: `signed:${path}` })),
  }));
  m.from.mockImplementation((table: string) => {
    const q: Record<string, unknown> = {};
    for (const method of ['select', 'not', 'order', 'limit', 'eq', 'in'])
      q[method] = () => q;
    q.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({
        data: table === 'contractor_documents' ? m.rows : [],
        error: null,
      }).then(resolve);
    return q;
  });
});
const read = () =>
  GET(
    { url: 'https://app.test/api/admin/verifications/documents' } as never,
    {} as never
  );
it('binds each signed URL to its submitting contractor, including duplicate foreign references', async () => {
  m.rows = [
    {
      id: 'owner',
      contractor_id: 'victim',
      storage_path: 'victim/private.pdf',
    },
    {
      id: 'forged',
      contractor_id: 'actor',
      storage_path: 'victim/private.pdf',
    },
    {
      id: 'valid',
      contractor_id: 'actor',
      storage_path: 'actor/folder/own.pdf',
    },
  ];
  const body = await (await read()).json();
  expect(m.sign).toHaveBeenCalledWith(
    ['victim/private.pdf', 'actor/folder/own.pdf'],
    3600
  );
  expect(
    body.rows.map((r: { signed_url: string | null }) => r.signed_url)
  ).toEqual(['signed:victim/private.pdf', null, 'signed:actor/folder/own.pdf']);
});
it.each([
  'actor/../victim/private.pdf',
  'actor/%2e%2e/private.pdf',
  'actor/%252e%252e/private.pdf',
  'actor\\private.pdf',
  'actor//private.pdf',
  'actor/./private.pdf',
  '/actor/private.pdf',
  'actor/private.pdf?download=x',
  'actor/private.pdf#x',
  'actor/\u0000private.pdf',
  null,
])('does not sign unsafe stored path %s', async (storage_path) => {
  m.rows = [{ contractor_id: 'actor', storage_path }];
  expect((await (await read()).json()).rows[0].signed_url).toBeNull();
  expect(m.sign).not.toHaveBeenCalled();
});
