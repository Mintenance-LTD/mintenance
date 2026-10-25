import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  user: { id: 'actor', role: 'homeowner' },
  upsert: vi.fn(),
  from: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_options: unknown, handler: Function) => (request: Request) =>
      handler(request, { user: mocks.user }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
import { PUT } from './route';
beforeEach(() => {
  mocks.user.role = 'homeowner';
  mocks.from.mockReturnValue({ upsert: mocks.upsert });
  mocks.upsert.mockReset().mockResolvedValue({ error: null });
});
const request = (body: object) =>
  new Request('https://example.test/api/onboarding/progress', {
    method: 'PUT',
    body: JSON.stringify(body),
  }) as never;
const progress = {
  journey: 'intro-homeowner',
  platform: 'web',
  status: 'completed',
  step: 4,
};
it('writes progress under the authenticated user and server version', async () => {
  expect((await PUT(request(progress))).status).toBe(200);
  expect(mocks.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: 'actor', version: 2, ...progress }),
    expect.anything()
  );
});
it('rejects supplied ownership fields and inaccessible persona guides', async () => {
  await expect(
    PUT(request({ ...progress, user_id: 'victim' }))
  ).rejects.toThrow('Invalid guide progress');
  await expect(
    PUT(request({ ...progress, journey: 'guide-admin-admin-money' }))
  ).rejects.toThrow('not available');
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it('accepts a landlord guide without changing account privileges', async () => {
  await PUT(request({ ...progress, journey: 'guide-landlord-portfolio' }));
  expect(mocks.from).toHaveBeenCalledWith('onboarding_journeys');
});
it('surfaces a failed database write', async () => {
  mocks.upsert.mockResolvedValue({ error: { message: 'unavailable' } });
  await expect(PUT(request(progress))).rejects.toThrow('Could not save');
});
it.each(['homeowner', 'contractor'])(
  'saves only the authenticated %s benefits notice',
  async (role) => {
    mocks.user.role = role;
    await PUT(
      request({
        ...progress,
        journey: `notice-early-access-${role}`,
        status: 'skipped',
      })
    );
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'actor',
        journey: `notice-early-access-${role}`,
        status: 'skipped',
      }),
      expect.anything()
    );
    await expect(
      PUT(
        request({
          ...progress,
          journey: `notice-early-access-${role === 'homeowner' ? 'contractor' : 'homeowner'}`,
        })
      )
    ).rejects.toThrow('not available');
  }
);
