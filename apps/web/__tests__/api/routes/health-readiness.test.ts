import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  env: {
    NODE_ENV: 'production',
    SUPABASE_SERVICE_ROLE_KEY: 'test-only',
    UPSTASH_REDIS_REST_URL: 'https://redis.example.test/',
    UPSTASH_REDIS_REST_TOKEN: 'test-only',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_WEBHOOK_SECRET: 'whsec_mock',
  },
  fetch: vi.fn(),
}));
vi.mock('@/lib/env', () => ({ env: mocks.env }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: () => ({ select: () => ({ limit: async () => ({ error: null }) }) }) },
}));
import { GET } from '@/app/api/health/route';

beforeEach(() => {
  vi.useFakeTimers();
  mocks.env.NODE_ENV = 'production';
  mocks.env.UPSTASH_REDIS_REST_TOKEN = 'test-only';
  mocks.fetch.mockReset();
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockImplementation(async (url: string) => new Response(
    JSON.stringify(url.includes('redis.example.test') ? { result: 'PONG' } : {}),
    { status: 200 },
  ));
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function probe() {
  return GET({} as never, {} as never);
}

it('uses a direct uncached bounded Redis probe and exposes no service details', async () => {
  const response = await probe();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.status).toBe('healthy');
  expect(body).not.toHaveProperty('services');
  expect(mocks.fetch).toHaveBeenCalledWith('https://redis.example.test/ping', expect.objectContaining({
    cache: 'no-store', signal: expect.any(AbortSignal),
  }));
});

it.each(['http', 'invalid', 'network'])('returns 503 for Redis %s failure', async (failure) => {
  mocks.fetch.mockImplementation(async (url: string) => {
    if (!url.includes('redis.example.test')) return new Response('{}');
    if (failure === 'network') throw new Error('connection failed');
    return new Response(JSON.stringify({ result: 'unexpected' }), { status: failure === 'http' ? 503 : 200 });
  });
  const response = await probe();
  expect(response.status).toBe(503);
  expect((await response.json()).status).toBe('unhealthy');
});

it.each([['production', 503, 'unhealthy'], ['development', 200, 'degraded']])(
  'handles missing Redis configuration in %s', async (environment, status, health) => {
    mocks.env.NODE_ENV = environment as string;
    mocks.env.UPSTASH_REDIS_REST_TOKEN = '';
    const response = await probe();
    expect(response.status).toBe(status);
    expect((await response.json()).status).toBe(health);
  },
);
