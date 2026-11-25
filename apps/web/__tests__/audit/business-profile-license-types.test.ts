import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  queueResult: vi.fn(),
  credentialInsert: vi.fn(),
  activeCredential: vi.fn(),
  writes: [] as unknown[],
}));
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
  mocks.queueResult.mockReset();
  mocks.queueResult.mockResolvedValue({ data: null, error: null });
  mocks.credentialInsert.mockReset().mockResolvedValue({ error: null });
  mocks.activeCredential.mockReset().mockResolvedValue({ data: null, error: null });
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
  mocks.from.mockImplementation((table) => {
    if (table === 'admin_verification_queue') {
      return { select: () => ({ eq: () => ({ maybeSingle: mocks.queueResult }) }) };
    }
    if (table === 'credential_verifications') {
      const credentials = {
        ...chain,
        insert: (value: unknown) => {
          mocks.writes.push(value);
          return mocks.credentialInsert();
        },
        select: () => credentials,
        eq: () => credentials,
        in: () => credentials,
        maybeSingle: mocks.activeCredential,
      };
      return credentials;
    }
    return chain;
  });
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

it('accepts a retry against an existing pending credential without rolling back the review', async () => {
  mocks.credentialInsert.mockResolvedValue({ error: { code: '23505' } });
  mocks.activeCredential.mockResolvedValue({
    data: { id: 'existing-credential', status: 'pending', expires_at: null },
    error: null,
  });

  expect((await submit('electrical')).status).toBe(200);
  expect(mocks.activeCredential).toHaveBeenCalledOnce();
  expect(mocks.writes).not.toContainEqual({ verification_status: null });
});
it('rejects unknown license types before database writes', async () => {
  expect((await submit('made-up-type')).status).toBe(400);
  expect(mocks.from).not.toHaveBeenCalled();
});

it.each([
  { state: 'ready', label: 'Ready for review', businessDetails: true, nextStep: 'manual review' },
  { state: 'incomplete', label: 'Evidence needed', businessDetails: false, nextStep: 'Add your business name and address.' },
])('returns $label to Android after submitting', async ({ state, label, businessDetails, nextStep }) => {
  mocks.queueResult.mockResolvedValue({
    data: {
      queue_status: state,
      identity_submitted: false,
      business_submitted: false,
      mobile_credential_submitted: true,
      mobile_review_requested: true,
      business_details_submitted: businessDetails,
    },
    error: null,
  });

  const response = await submit('electrical');
  expect(response.status).toBe(200);
  expect((await response.json()).accountReview).toEqual({
    state,
    label,
    nextSteps: expect.arrayContaining([expect.stringContaining(nextStep)]),
  });
});
