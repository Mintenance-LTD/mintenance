// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { handleAPIError } from '@/lib/errors/api-error';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  updateScore: vi.fn(),
  notifyNearbyContractors: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from, rpc: mocks.rpc },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_config: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/rate-limiter', () => ({
  checkJobCreationRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock('@/lib/services/verification/HomeownerVerificationService', () => ({
  HomeownerVerificationService: {
    isFullyVerified: vi.fn(async () => ({ canPostJobs: true })),
  },
}));
vi.mock('@/lib/services/jobs/SeriousBuyerService', () => ({
  SeriousBuyerService: { updateScore: mocks.updateScore },
}));
vi.mock('@/lib/services/job-notification-service', () => ({
  JobNotificationService: {
    getInstance: () => ({
      notifyNearbyContractors: mocks.notifyNearbyContractors,
    }),
  },
}));
import { POST } from '@/app/api/jobs/route';
import { GET as propertyJobs } from '@/app/api/properties/[id]/jobs/route';
import { JobCreationService } from '@/lib/services/job-creation-service';

const propertyId = randomUUID();
const actorId = randomUUID();
const ownerId = randomUUID();
const jobId = randomUUID();
const form = {
  title: 'Repair the kitchen pipe',
  description: 'The kitchen pipe is leaking beneath the sink.',
  category: 'plumbing',
  property_id: propertyId,
  requirements: { contractor_before_photos: true },
};
const createdJob = {
  id: jobId,
  title: form.title,
  homeowner_id: ownerId,
  property_id: propertyId,
  status: 'posted',
};
const context = (id: string) =>
  ({ user: { id, role: 'homeowner' }, params: { id: propertyId } }) as never;
const submit = (body: object = form, id = actorId, requestId?: string) =>
  POST(
    new NextRequest('https://example.test/api/jobs', {
      method: 'POST',
      headers: requestId ? { 'x-job-submission-id': requestId } : {},
      body: JSON.stringify(body),
    }),
    context(id)
  ).catch((error) => handleAPIError(error));

let membership: { role: string; status: string } | null;
beforeEach(() => {
  vi.resetAllMocks();
  membership = { role: 'manager', status: 'accepted' };
  mocks.from.mockImplementation((table: string) => {
    const eq = new Map<string, unknown>();
    const read = () => {
      if (table === 'properties' && eq.get('id') === propertyId)
        return {
          data: {
            owner_id: ownerId,
            address: '1 Test Road',
            latitude: 51.5,
            longitude: -0.12,
          },
          error: null,
        };
      if (
        table === 'property_team_members' &&
        eq.get('property_id') === propertyId &&
        eq.get('user_id') === actorId &&
        membership?.status === eq.get('status')
      )
        return { data: membership, error: null };
      return { data: null, error: null };
    };
    const chain = {
      select: () => chain,
      eq: (name: string, value: unknown) => {
        eq.set(name, value);
        return chain;
      },
      single: read,
      maybeSingle: read,
      order: () => ({
        data:
          table === 'jobs' && eq.get('property_id') === propertyId
            ? [{ id: jobId, title: form.title, status: 'posted' }]
            : [],
        error: null,
      }),
    };
    return chain;
  });
  mocks.rpc.mockResolvedValue({
    data: { job: createdJob, created: true },
    error: null,
  });
});

it.each(['manager', 'admin'])(
  'posts an accepted property %s’s job as the current owner and returns it in shared history',
  async (role) => {
    membership = { role, status: 'accepted' };
    const response = await submit();
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ job: { id: jobId } });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('create_job_once', {
      p_user_id: actorId,
      p_request_id: expect.stringMatching(/^[a-f0-9-]{36}$/),
      p_fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      p_job: expect.objectContaining({
        homeowner_id: ownerId,
        property_id: propertyId,
      }),
      p_photo_urls: [],
    });
    expect(mocks.rpc.mock.calls[0][1].p_job).not.toHaveProperty(
      'payer_user_id'
    );
    expect(mocks.updateScore).toHaveBeenCalledWith(
      jobId,
      ownerId,
      expect.any(Object)
    );
    const history = await propertyJobs(
      new NextRequest(`https://example.test/api/properties/${propertyId}/jobs`),
      context(actorId)
    );
    expect(await history.json()).toEqual([
      { id: jobId, title: form.title, status: 'posted' },
    ]);
  }
);

it.each([
  { role: 'viewer', status: 'accepted' },
  { role: 'manager', status: 'pending' },
  null,
])('rejects a member without posting permission (%j)', async (member) => {
  membership = member;
  expect((await submit()).status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it('passes the owner and submission ID through for an owner retry', async () => {
  const requestId = randomUUID();
  mocks.rpc.mockResolvedValueOnce({
    data: { job: createdJob, created: false },
    error: null,
  });
  expect((await submit(form, ownerId, requestId)).status).toBe(201);
  expect(mocks.rpc).toHaveBeenCalledWith(
    'create_job_once',
    expect.objectContaining({
      p_user_id: ownerId,
      p_request_id: requestId,
    })
  );
  expect(mocks.notifyNearbyContractors).not.toHaveBeenCalled();
});

it('refuses to change the payer or record completed work as a delegate', async () => {
  expect((await submit({ ...form, payer_user_id: actorId })).status).toBe(400);
  expect((await submit({ ...form, homeowner_id: actorId })).status).toBe(400);
  expect(
    (
      await submit({
        ...form,
        tenancy_metadata: { payer_email: 'synthetic@example.test' },
      })
    ).status
  ).toBe(403);
  expect((await submit({ ...form, status: 'completed' })).status).toBe(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it('reports revocation at commit time without dispatching the job', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
  expect((await submit()).status).toBe(403);
  expect(mocks.notifyNearbyContractors).not.toHaveBeenCalled();
});

it('keeps internal owner-only creation calls and report conversion scoped to the owner', async () => {
  await expect(
    JobCreationService.getInstance().createJob(
      { id: actorId, role: 'homeowner' },
      form
    )
  ).rejects.toThrow('Only the property owner');
  expect(
    (
      await submit(
        { ...form, source_tenant_report_id: randomUUID() },
        actorId,
        randomUUID()
      )
    ).status
  ).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
