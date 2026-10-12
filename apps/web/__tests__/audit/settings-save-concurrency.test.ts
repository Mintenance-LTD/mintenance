import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mock = vi.hoisted(() => ({
  from: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mock.from },
}));
import { userSettingsPatch } from '@/app/api/_shared/user-settings-handlers';
const call = () =>
  (
    userSettingsPatch as unknown as (
      request: NextRequest,
      context: unknown
    ) => Promise<Response>
  )(
    new NextRequest('http://localhost/api/users/settings', {
      method: 'PATCH',
      body: JSON.stringify({ silverMode: true, display: { language: 'fr' } }),
    }),
    { user: { id: 'synthetic-user' } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  mock.from.mockImplementation(() => {
    let writing = false;
    const chain = {
      select: () => chain,
      eq: (...args: unknown[]) => {
        if (writing) mock.eq(...args);
        return chain;
      },
      is: () => chain,
      update: (value: unknown) => {
        writing = true;
        mock.update(value);
        return chain;
      },
      maybeSingle: () => (writing ? mock.write() : mock.read()),
    };
    return chain;
  });
});
it('never overwrites settings after a failed read', async () => {
  mock.read.mockResolvedValue({ data: null, error: { message: 'offline' } });
  expect((await call()).status).toBe(503);
  expect(mock.update).not.toHaveBeenCalled();
});
it('re-reads on a conflict and preserves the concurrent setting and sibling fields', async () => {
  const original = { display: { language: 'en', theme: 'dark' } };
  mock.read
    .mockResolvedValueOnce({ data: { settings: original }, error: null })
    .mockResolvedValueOnce({
      data: { settings: { ...original, newConcurrentSetting: true } },
      error: null,
    });
  mock.write
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: { id: 'synthetic-user' }, error: null });
  const result = await call();
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({
    silverMode: true,
    newConcurrentSetting: true,
    display: { language: 'fr', theme: 'dark' },
  });
  expect(mock.eq).toHaveBeenCalledWith('settings', JSON.stringify(original));
});
it('reports a conflict rather than false success after bounded retries', async () => {
  mock.read.mockResolvedValue({ data: { settings: {} }, error: null });
  mock.write.mockResolvedValue({ data: null, error: null });
  expect((await call()).status).toBe(409);
  expect(mock.write).toHaveBeenCalledTimes(3);
});
