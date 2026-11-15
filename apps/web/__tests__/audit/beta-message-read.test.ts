import { fetchThreadMessages } from '@/lib/messages/thread-messages';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), csrf: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ getCsrfHeaders: mocks.csrf }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.csrf.mockResolvedValue({ 'x-csrf-token': 'renewed' });
});
afterEach(() => vi.unstubAllGlobals());
it.each([true, false])(
  'clears unread only after the authenticated read acknowledgement succeeds (%s)',
  async (ok) => {
    mocks.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [
            {
              id: 'm',
              senderId: 'sender',
              content: 'Hello',
              createdAt: '2026-11-14',
              read: false,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok });
    const clearUnread = vi.fn();
    const rows = await fetchThreadMessages('job-one', clearUnread);
    expect(rows[0].content).toBe('Hello');
    expect(mocks.fetch).toHaveBeenLastCalledWith(
      '/api/messages/threads/job-one/read',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-csrf-token': 'renewed' }),
      })
    );
    expect(clearUnread).toHaveBeenCalledTimes(ok ? 1 : 0);
  }
);
