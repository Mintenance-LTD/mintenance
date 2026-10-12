import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), sign: vi.fn(), remove: vi.fn(), delete: vi.fn(), rows: [] as Record<string, unknown>[] }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: {
  from: mocks.from,
  storage: { from: () => ({ createSignedUrls: mocks.sign, remove: mocks.remove }) },
} }));
vi.mock('@/lib/api/with-api-handler', () => ({ withApiHandler: (_: unknown, handler: Function) => handler }));
import { GET, DELETE } from '@/app/api/contractor/documents/route';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rows = [];
  mocks.sign.mockImplementation(async (paths: string[]) => ({ data: paths.map(path => ({ path, signedUrl: `signed:${path}` })) }));
  mocks.remove.mockResolvedValue({ error: null });
  mocks.from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'neq']) chain[method] = () => chain;
    chain.order = async () => ({ data: table === 'contractor_documents' ? mocks.rows : [], error: null });
    chain.single = async () => ({ data: mocks.rows[0], error: null });
    chain.delete = mocks.delete;
    return chain;
  });
});
it('signs only files in the caller namespace even when their own metadata references foreign files', async () => {
  mocks.rows = [
    { id: 'safe', storage_path: 'actor/own.pdf' },
    { id: 'foreign', storage_path: 'victim/private.pdf' },
    { id: 'traversal', storage_path: 'actor/../victim/private.pdf' },
  ];
  const response = await GET({} as never, { user: { id: 'actor' } } as never);
  expect(mocks.sign).toHaveBeenCalledWith(['actor/own.pdf'], 3600);
  const body = await response.json();
  expect(body.documents.find((d: { id: string }) => d.id === 'foreign').public_url).toBeNull();
});
it.each(['victim/private.pdf', 'actor/../victim/private.pdf', 'actor/%2e%2e/secret.pdf', 'actor\\secret.pdf'])(
  'does not delete forged path %s', async (path) => {
    mocks.rows = [{ id: 'doc', contractor_id: 'actor', storage_path: path }];
    const response = await DELETE({ url: 'https://app.test/api/contractor/documents?id=doc' } as never, { user: { id: 'actor' } } as never);
    expect(response.status).toBe(403);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  },
);
