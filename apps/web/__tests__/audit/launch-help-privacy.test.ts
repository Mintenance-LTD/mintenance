import { it, expect, vi } from 'vitest';
const insert = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: () => ({ insert }) },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_config: unknown, handler: Function) => handler,
}));
import { POST } from '@/app/api/help/articles/track-view/route';

it('records article popularity without retaining visitor identifiers or client-supplied tracking fields', async () => {
  const response = await POST(
    new Request('http://localhost/api/help/articles/track-view', {
      method: 'POST',
      headers: {
        'user-agent': 'Sensitive device details',
        'x-forwarded-for': '192.0.2.1',
      },
      body: JSON.stringify({
        articleTitle: 'How payments work',
        category: 'Payments & Billing',
        user_id: 'visitor',
        ip_address: '192.0.2.1',
        user_agent: 'injected',
      }),
    }) as never,
    {} as never
  );
  expect(response.status).toBe(200);
  expect(insert).toHaveBeenCalledWith({
    article_title: 'How payments work',
    category: 'Payments & Billing',
  });
});
