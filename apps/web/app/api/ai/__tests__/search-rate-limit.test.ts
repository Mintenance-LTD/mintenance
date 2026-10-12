// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ limit: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/csrf', () => ({ requireCSRF: vi.fn() }));
vi.mock('@/lib/rate-limiter', () => ({ rateLimiter: { checkRateLimit: mocks.limit } }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: mocks.from } }));
import { POST } from '../search/route';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue({ allowed: true, remaining: 9, resetTime: Date.now() + 60000 });
  mocks.from.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    for (const key of ['select', 'eq', 'or', 'order', 'limit']) chain[key] = () => chain;
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
    return chain;
  });
});
const request = (headers: Record<string,string> = {}) => new NextRequest('http://localhost/api/ai/search', { method: 'POST', headers, body: JSON.stringify({ query: 'plumber' }) });
it('uses the shared ten-per-minute route budget', async () => {
  expect((await POST(request(), { params: Promise.resolve({}) })).status).toBe(200);
  expect(mocks.limit).toHaveBeenCalledWith(expect.objectContaining({ maxRequests: 10, windowMs: 60000, identifier: 'unknown:/api/ai/search' }));
});
it('returns retry headers and never searches when the budget is exhausted', async () => {
  mocks.limit.mockResolvedValue({ allowed: false, remaining: 0, resetTime: Date.now()+30000, retryAfter: 30 });
  const response = await POST(request(), { params: Promise.resolve({}) });
  expect(response.status).toBe(429);
  expect(response.headers.get('Retry-After')).toBe('30');
  expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
  expect(mocks.from).not.toHaveBeenCalled();
});
it.each([
  [{ 'x-forwarded-for': 'spoofed, 203.0.113.4' }, '203.0.113.4'],
  [{ 'x-real-ip': '203.0.113.5' }, '203.0.113.5'],
  [{ 'x-vercel-forwarded-for': '203.0.113.6', 'x-forwarded-for': 'spoofed' }, '203.0.113.6'],
] as const)('uses trusted IP extraction for %j', async (headers, ip) => {
  await POST(request(headers), { params: Promise.resolve({}) });
  expect(mocks.limit).toHaveBeenCalledWith(expect.objectContaining({ identifier: `${ip}:/api/ai/search` }));
});