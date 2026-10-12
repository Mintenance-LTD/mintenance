// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ user: vi.fn(), admin: vi.fn(), memory: vi.fn(), database: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUserFromCookies: mocks.user, getCurrentUserFromBearerToken: mocks.user }));
vi.mock('@/lib/admin-verification', () => ({ verifyAdminRoleFromDatabase: mocks.admin }));
vi.mock('@/lib/auth/mfa-step-up', () => ({ hasValidStepUp: vi.fn() }));
vi.mock('@/lib/csrf', () => ({ requireCSRF: vi.fn() }));
vi.mock('@/lib/rate-limiter', () => ({ rateLimiter: { checkRateLimit: async () => ({ allowed: true }) } }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: mocks.database } }));
vi.mock('@/lib/services/ml-engine/memory/MemoryManager', () => ({ memoryManager: { getMemoryLevels: mocks.memory } }));
import { GET as memory } from '@/app/api/ml/memory/[agentName]/route';
import { GET as levels } from '@/app/api/ml/memory/[agentName]/levels/route';
import { GET as trending } from '@/app/api/ai/trending-searches/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue(null);
  mocks.admin.mockResolvedValue(false);
  mocks.memory.mockReturnValue([{ level: 1 }]);
});

for (const [name, handler] of [['memory', memory], ['levels', levels]] as const) {
  it.each([[null, 401], ['homeowner', 403], ['contractor', 403], ['admin', 403]] as const)(
    `${name} rejects unverified caller %s`, async (role, status) => {
      mocks.user.mockResolvedValue(role ? { id: 'actor', role } : null);
      const response = await handler(new NextRequest('https://app.test/api/ml/memory/test'), { params: Promise.resolve({ agentName: 'test' }) });
      expect(response.status).toBe(status);
      expect(mocks.memory).not.toHaveBeenCalled();
    },
  );
  it(`${name} permits database-verified administrators`, async () => {
    mocks.user.mockResolvedValue({ id: 'actor', role: 'admin' });
    mocks.admin.mockResolvedValue(true);
    const response = await handler(new NextRequest('https://app.test/api/ml/memory/test'), { params: Promise.resolve({ agentName: 'test' }) });
    expect(response.status).toBe(200);
    expect(mocks.admin).toHaveBeenCalledWith('actor');
    expect(mocks.memory).toHaveBeenCalledWith('test');
  });
}
it('never reads raw searches for public trending results', async () => {
  const response = await trending(new NextRequest('https://app.test/api/ai/trending-searches'), { params: Promise.resolve({}) });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ trending: [] });
  expect(mocks.database).not.toHaveBeenCalled();
});
it.each(['-1', '0', '51', '1.5', 'abc'])('rejects invalid trending limit %s', async (limit) => {
  const response = await trending(new NextRequest(`https://app.test/api/ai/trending-searches?limit=${limit}`), { params: Promise.resolve({}) });
  expect(response.status).toBe(400);
  expect(mocks.database).not.toHaveBeenCalled();
});
