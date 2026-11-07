// @vitest-environment node
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({
  read: vi.fn(),
  eq: vi.fn(),
  options: [] as unknown[],
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (options: unknown, handler: unknown) => {
    state.options.push(options);
    return handler;
  },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: (...args: unknown[]) => {
          state.eq(table, ...args);
          return q;
        },
        maybeSingle: () => state.read(table),
      };
      return q;
    },
  },
}));
import { GET } from '@/app/api/contractor/quotes/[id]/amendment-context/route';
const call = () =>
  (
    GET as unknown as (
      request: NextRequest,
      context: object
    ) => Promise<Response>
  )(
    new NextRequest(
      'http://localhost/api/contractor/quotes/quote/amendment-context'
    ),
    { user: { id: 'owner' }, params: { id: 'quote' } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  state.read.mockResolvedValue({
    data: { id: 'quote', updated_at: '2026-11-07T00:00:00.123456Z' },
    error: null,
  });
});
it('requires contractor authorization and scopes both reads to the authenticated owner', async () => {
  const result = await call();
  expect(state.options[0]).toMatchObject({ roles: ['contractor'] });
  for (const table of ['contractor_quotes', 'current_contractor_quotes']) {
    expect(state.eq).toHaveBeenCalledWith(table, 'id', 'quote');
    expect(state.eq).toHaveBeenCalledWith(table, 'contractor_id', 'owner');
  }
  expect(result.headers.get('Cache-Control')).toBe('no-store');
  expect(await result.json()).toMatchObject({
    is_current: true,
    quote: { updated_at: '2026-11-07T00:00:00.123456Z' },
  });
});
it('preserves historical access without advertising a current quote', async () => {
  state.read
    .mockResolvedValueOnce({ data: { id: 'quote' }, error: null })
    .mockResolvedValueOnce({ data: null, error: null });
  expect(await (await call()).json()).toMatchObject({
    is_current: false,
    quote: { id: 'quote' },
  });
});
it('does not reveal foreign or missing quotes', async () => {
  state.read.mockResolvedValue({ data: null, error: null });
  await expect(call()).rejects.toMatchObject({ statusCode: 404 });
  expect(state.read).toHaveBeenCalledTimes(1);
});
it.each([0, 1])('fails closed when lookup %s is unavailable', async (index) => {
  if (index)
    state.read.mockResolvedValueOnce({ data: { id: 'quote' }, error: null });
  state.read.mockResolvedValueOnce({
    data: null,
    error: { message: 'unavailable' },
  });
  await expect(call()).rejects.toMatchObject({ statusCode: 500 });
});
