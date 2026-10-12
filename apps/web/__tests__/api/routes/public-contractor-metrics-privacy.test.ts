import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), eligible: true, failed: false, filters: [] as unknown[][] }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: mocks.from } }));
vi.mock('@/lib/api/with-api-handler', () => ({ withApiHandler: (_: unknown, handler: Function) => handler }));
vi.mock('@/lib/middleware/public-rate-limiter', () => ({ withPublicRateLimit: (_: unknown, handler: Function) => handler() }));
vi.mock('@/lib/rate-limiter', () => ({ rateLimiter: { checkRateLimit: async () => ({ allowed: true }) } }));
import { GET } from '@/app/api/contractors/[id]/metrics/route';
beforeEach(() => {
  vi.clearAllMocks(); mocks.eligible = true; mocks.failed = false; mocks.filters = [];
  mocks.from.mockImplementation((table: string) => {
    if (table === 'escrow_transactions') throw new Error('Public handler must never query payments');
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'or', 'order']) chain[method] = (...args: unknown[]) => {
      if (table === 'profile_directory') mocks.filters.push([method, ...args]);
      return chain;
    };
    chain.maybeSingle = async () => ({ data: mocks.eligible ? { id: 'contractor' } : null, error: mocks.failed ? new Error('unavailable') : null });
    chain.then = (resolve: Function) => resolve({ data: [], error: null });
    return chain;
  });
});
async function read() {
  return GET({ url: 'https://app.test/api/contractors/contractor/metrics', headers: new Headers() } as never, { params: { id: 'contractor' } } as never);
}
it('returns public performance without private payment metrics or payment queries', async () => {
  const response = await read();
  expect(response.status).toBe(200);
  const { metrics } = await response.json();
  expect(metrics).toHaveProperty('onTimeCompletion');
  expect(metrics).not.toHaveProperty('earnings');
  expect(metrics).not.toHaveProperty('avgProjectValue');
  expect(mocks.filters).toContainEqual(['eq', 'role', 'contractor']);
  expect(mocks.filters).toContainEqual(['or', 'verified.eq.true,admin_verified.eq.true']);
});
it('does not query job history for a missing or ineligible contractor', async () => {
  mocks.eligible = false;
  expect((await read()).status).toBe(404);
  expect(mocks.from.mock.calls.map(call => call[0])).toEqual(['profile_directory']);
});
it('fails closed when directory eligibility cannot be checked', async () => {
  mocks.failed = true;
  expect((await read()).status).toBe(503);
  expect(mocks.from.mock.calls.map(call => call[0])).toEqual(['profile_directory']);
});
