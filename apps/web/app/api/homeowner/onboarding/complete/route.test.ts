import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ update: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_options: unknown, handler: Function) => (request: Request) =>
      handler(request, { user: { id: 'actor', role: 'homeowner' } }),
}));
vi.mock('@/lib/validation/validator', () => ({
  validateRequest: async () => ({
    data: { propertyType: 'terrace', concernTags: ['Plumbing'] },
  }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
import { POST } from './route';
it('saves preferences without completing either platform intro or overwriting other settings', async () => {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi
      .fn()
      .mockResolvedValue({
        data: { settings: { theme: 'dark' }, updated_at: 'stamp' },
        error: null,
      }),
    update: mocks.update,
  };
  chain.eq.mockReturnValue(chain);
  chain.select.mockImplementation((value: string) =>
    value === 'id'
      ? Promise.resolve({ data: [{ id: 'actor' }], error: null })
      : chain
  );
  mocks.update.mockReturnValue(chain);
  mocks.from.mockReturnValue(chain);
  const response = await POST(
    new Request('https://example.test/api/homeowner/onboarding/complete', {
      method: 'POST',
      body: '{}',
    }) as never
  );
  expect(response.status).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith({
    settings: {
      theme: 'dark',
      homeowner_setup_completed: true,
      property_type: 'terrace',
      concern_tags: ['Plumbing'],
    },
    updated_at: expect.any(String),
  });
  expect(mocks.from).toHaveBeenCalledTimes(2);
});
