import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), update: vi.fn(), handler: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: mocks.from } }));
vi.mock('@/lib/rate-limiter', () => ({ rateLimiter: { checkRateLimit: async () => ({ allowed: true }) } }));
import { withCronHandler } from '@/lib/cron-handler';
const route = withCronHandler('retention-cleanup', mocks.handler);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', 'synthetic-maintenance-test-secret');
  vi.stubEnv('CRON_SECRET_RETENTION_CLEANUP', '');
  const chain = {
    insert: mocks.insert,
    update: mocks.update,
    select: () => chain,
    single: async () => ({ data: { id: 'run-id' }, error: null }),
    eq: async () => ({ error: null }),
  };
  mocks.from.mockReturnValue(chain);
  mocks.insert.mockReturnValue(chain); mocks.update.mockReturnValue(chain);
});
afterEach(() => vi.unstubAllEnvs());
function request(authorized = true) {
  return new NextRequest('https://app.test/api/cron/retention-cleanup', {
    headers: authorized ? { authorization: 'Bearer synthetic-maintenance-test-secret' } : {},
  });
}
it('records a successful run with actual counts and deferred-review metadata', async () => {
  mocks.handler.mockResolvedValue({ processed: 3, results: { profiles_deferred_for_review: 2 } });
  expect((await route(request())).status).toBe(200);
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ job_name: 'retention-cleanup', status: 'running' }));
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'success', records_processed: 3,
    metadata: { processed: 3, results: { profiles_deferred_for_review: 2 } },
  }));
});
it('records a failed run and returns failure instead of a false success', async () => {
  mocks.handler.mockRejectedValue(new Error('Synthetic cleanup failure'));
  expect((await route(request())).status).toBe(500);
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', error_message: 'Synthetic cleanup failure' }));
});
it('denies unauthenticated execution before creating a run or touching cleanup data', async () => {
  expect((await route(request(false))).status).toBe(401);
  expect(mocks.handler).not.toHaveBeenCalled();
  expect(mocks.from).not.toHaveBeenCalled();
});
