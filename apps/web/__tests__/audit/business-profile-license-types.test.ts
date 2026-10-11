import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), writes: [] as unknown[] }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_options: unknown, handler: unknown) => handler,
}));
vi.mock('@mintenance/shared', () => ({ logger: { error: vi.fn() } }));
import { PATCH } from '@/app/api/contractor/business-profile/route';
beforeEach(() => {
  mocks.writes.length = 0;
  mocks.from.mockReset();
  const chain = {
    update: (value: unknown) => {
      mocks.writes.push(value);
      return chain;
    },
    insert: (value: unknown) => {
      mocks.writes.push(value);
      return chain;
    },
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  };
  mocks.from.mockReturnValue(chain);
});
const submit = (licenseType: string) =>
  (PATCH as unknown as (r: Request, c: unknown) => Promise<Response>)(
    new Request('https://example.com/api', {
      method: 'PATCH',
      body: JSON.stringify({
        licenseType,
        licenseNumber: 'TEST',
        submitVerification: true,
      }),
    }),
    { user: { id: 'contractor' } }
  );
it.each([
  'trade',
  'gas_safe',
  'electrical',
  'plumbing',
  'hvac',
  'roofing',
  'other',
])('persists the offered %s license and a pending review', async (type) => {
  expect((await submit(type)).status).toBe(200);
  expect(mocks.writes).toContainEqual({
    license_type: type,
    license_number: 'TEST',
    verification_status: 'pending',
  });
  expect(mocks.writes).toContainEqual(
    expect.objectContaining({ user_id: 'contractor', status: 'pending' })
  );
});
it('rejects unknown license types before database writes', async () => {
  expect((await submit('made-up-type')).status).toBe(400);
  expect(mocks.from).not.toHaveBeenCalled();
});
