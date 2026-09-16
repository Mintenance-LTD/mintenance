import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({ run: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/services/payment/AdminReleaseRecoveryService', () => ({
  runAdminReleaseRecovery: state.run,
}));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: async () => ({ allowed: true }) },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: state.from },
}));
import { GET } from '@/app/api/cron/admin-release-recovery/route';
const secret = 'synthetic-cron-test-value';
const path = '/api/cron/admin-release-recovery';
const request = (headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost${path}`, { headers });
describe('admin release recovery cron authentication', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', secret);
    vi.stubEnv('CRON_SECRET_ADMIN_RELEASE_RECOVERY', '');
    vi.stubEnv('CRON_HMAC_TOLERANCE_SECONDS', '300');
    state.run
      .mockReset()
      .mockResolvedValue({ processed: 0, confirmed: 0, failed: 0 });
    const q = {
      insert: () => q,
      select: () => q,
      single: async () => ({ data: { id: 'run' }, error: null }),
      update: () => q,
      eq: async () => ({ error: null }),
    };
    state.from.mockReset().mockReturnValue(q);
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([{}, { authorization: 'Bearer wrong' }])(
    'rejects unauthorized callers before worker or execution tracking',
    async (headers) => {
      expect((await GET(request(headers))).status).toBe(401);
      expect(state.run).not.toHaveBeenCalled();
      expect(state.from).not.toHaveBeenCalled();
    }
  );
  it('rejects when no cron secret is configured', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect(
      (await GET(request({ authorization: `Bearer ${secret}` }))).status
    ).toBe(401);
    expect(state.run).not.toHaveBeenCalled();
  });
  it.each(['expired', 'wrong-path'])('rejects an %s HMAC', async (kind) => {
    const ts = Math.floor(Date.now() / 1000) - (kind === 'expired' ? 1000 : 0);
    const signature = createHmac('sha256', secret)
      .update(`${ts}.${kind === 'wrong-path' ? '/api/cron/other' : path}`)
      .digest('hex');
    expect(
      (
        await GET(
          request({
            'x-cron-timestamp': String(ts),
            'x-cron-signature': signature,
          })
        )
      ).status
    ).toBe(401);
    expect(state.run).not.toHaveBeenCalled();
  });
  it('accepts the configured scheduler credential', async () => {
    expect(
      (await GET(request({ authorization: `Bearer ${secret}` }))).status
    ).toBe(200);
    expect(state.run).toHaveBeenCalledTimes(1);
  });
  it('reports recovery failures to cron monitoring', async () => {
    state.run.mockResolvedValue({
      processed: 1,
      confirmed: 0,
      failed: 1,
    });
    expect(
      (await GET(request({ authorization: `Bearer ${secret}` }))).status
    ).toBe(503);
  });
});
