import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  start: vi.fn(),
  finish: vi.fn(),
  warn: vi.fn(),
  handler: vi.fn(),
}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: m.warn, error: vi.fn() },
}));
vi.mock('@/lib/cron-auth', () => ({ requireCronAuth: () => null }));
vi.mock('@/lib/request-ip', () => ({ getClientIp: () => '127.0.0.1' }));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: async () => ({ allowed: true }) },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => ({
      insert: () => ({ select: () => ({ single: m.start }) }),
      update: () => ({ eq: m.finish }),
    }),
  },
}));
import { withCronHandler } from '@/lib/cron-handler';
beforeEach(() => {
  vi.clearAllMocks();
  m.start.mockResolvedValue({ data: { id: 'run' }, error: null });
  m.finish.mockResolvedValue({ error: null });
  m.handler.mockResolvedValue({ processed: 1 });
});
const request = new NextRequest('http://localhost/api/cron/example');
it('reports returned tracking errors without replaying successful business work', async () => {
  m.finish.mockResolvedValue({
    error: { message: 'private database diagnostic' },
  });
  const response = await withCronHandler('example', m.handler)(request);
  expect(response.status).toBe(200);
  expect(m.handler).toHaveBeenCalledTimes(1);
  expect(m.warn).toHaveBeenCalledWith(
    'Failed to log cron completion',
    expect.objectContaining({
      jobName: 'example',
      runId: 'run',
      error: 'Cron completion tracking could not be saved',
    })
  );
  expect(JSON.stringify(m.warn.mock.calls)).not.toContain(
    'private database diagnostic'
  );
});
it('does not report a tracking failure after a confirmed completion write', async () => {
  expect((await withCronHandler('example', m.handler)(request)).status).toBe(
    200
  );
  expect(m.warn).not.toHaveBeenCalled();
});
it('keeps the original job failure when completion tracking also fails', async () => {
  m.handler.mockRejectedValue(new Error('Operation failed'));
  m.finish.mockResolvedValue({ error: { message: 'database unavailable' } });
  expect((await withCronHandler('example', m.handler)(request)).status).toBe(
    500
  );
  expect(m.warn).toHaveBeenCalledWith(
    'Failed to log cron completion',
    expect.any(Object)
  );
  expect(m.handler).toHaveBeenCalledTimes(1);
});
