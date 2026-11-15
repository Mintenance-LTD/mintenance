import { DELETE, POST } from '@/app/api/user/push-token/route';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  remove: vi.fn(),
  upsert: vi.fn(),
  eq: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_options: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ delete: mocks.remove, upsert: mocks.upsert });
  mocks.remove.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
});
const request = () =>
  new Request('http://localhost/api/user/push-token', {
    method: 'DELETE',
    body: JSON.stringify({ pushToken: 'ExponentPushToken[test-device]' }),
  });
const context = { user: { id: 'signed-in-account' } };
it('only unregisters this device for the authenticated owner', async () => {
  const response = await DELETE(request() as never, context as never);
  expect(response.status).toBe(200);
  expect(mocks.eq).toHaveBeenCalledWith('user_id', 'signed-in-account');
  expect(mocks.eq.mock.results[0].value.eq).toHaveBeenCalledWith(
    'push_token',
    'ExponentPushToken[test-device]'
  );
});
it('reports database cleanup failure so the client retains its token for retry', async () => {
  mocks.eq.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: { message: 'Unavailable' } }),
  });
  const response = await DELETE(request() as never, context as never);
  expect(response.status).toBe(503);
  expect(await response.json()).not.toHaveProperty('success', true);
});
it('moves registration atomically to the currently authenticated account', async () => {
  mocks.upsert.mockResolvedValue({ error: null });
  const response = await POST(request() as never, context as never);
  expect(response.status).toBe(200);
  expect(mocks.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      user_id: 'signed-in-account',
      push_token: 'ExponentPushToken[test-device]',
    }),
    { onConflict: 'push_token' }
  );
});
