const { from, fetchNearby, nextWindow } = vi.hoisted(() => ({
  from: vi.fn(),
  fetchNearby: vi.fn(),
  nextWindow: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from } }));
vi.mock('@/lib/services/job-notification-audience', () => ({
  fetchNearbyContractors: fetchNearby,
}));
vi.mock('@/lib/services/matching/preferred-hours', () => ({
  nextPreferredWindowStart: nextWindow,
}));

import { JobNotificationService } from '../job-notification-service';

const JOB = {
  id: 'job-1',
  title: 'Fix leaking tap',
  location: '1 High St',
  latitude: 51.9,
  longitude: -2.07,
  city: 'Cheltenham',
};
const service = JobNotificationService.getInstance();
const audience = (...ids: string[]) =>
  ids.map((id) => ({
    id,
    distanceKm: 1,
    matchedVia: 'service_area',
    preferredDays: null,
    preferredHours: null,
  }));

function query(data: unknown, error: unknown = null) {
  const result = { data, error };
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    in: async () => result,
    maybeSingle: async () => result,
  };
  return chain;
}

beforeEach(() => {
  vi.resetAllMocks();
  nextWindow.mockReturnValue(null);
});

it('plans an invitation for each eligible nearby contractor', async () => {
  fetchNearby.mockResolvedValue(audience('c-1', 'c-2'));
  expect(
    await service.planNearbyInvites(JOB, { required_skills: null })
  ).toEqual([
    expect.objectContaining({ user_id: 'c-1', type: 'job_nearby' }),
    expect.objectContaining({ user_id: 'c-2', type: 'job_nearby' }),
  ]);
  expect(fetchNearby).toHaveBeenCalledWith(
    { lat: JOB.latitude, lng: JOB.longitude },
    'Cheltenham'
  );
});

it('narrows the audience when skills match and preserves the fallback when none match', async () => {
  fetchNearby.mockResolvedValue(audience('c-skilled', 'c-unskilled'));
  from.mockReturnValue(
    query([{ contractor_id: 'c-skilled', skill_name: 'plumbing' }])
  );
  expect(
    (
      await service.planNearbyInvites(JOB, { required_skills: ['plumbing'] })
    ).map((x) => x.user_id)
  ).toEqual(['c-skilled']);
  expect(
    await service.planNearbyInvites(JOB, { required_skills: ['roofing'] })
  ).toHaveLength(2);
});

it('keeps contractor working-hours deferrals and bounds the number of queued invites', async () => {
  const outside = new Date('2026-11-23T18:00:00Z');
  nextWindow.mockReturnValue(outside);
  fetchNearby.mockResolvedValue([
    { id: 'legacy', distanceKm: 0, matchedVia: 'legacy_scan' },
    ...audience(
      ...Array.from(
        { length: 65 },
        (_, index) => 'c-' + String(index).padStart(2, '0')
      )
    ),
  ]);
  const planned = await service.planNearbyInvites(JOB, {});
  expect(planned).toHaveLength(50);
  expect(planned[0]).toMatchObject({
    user_id: 'legacy',
    scheduled_for: undefined,
  });
  expect(planned[1]).toMatchObject({
    user_id: 'c-00',
    scheduled_for: outside.toISOString(),
  });
});

it('sends nothing when the audience is empty', async () => {
  fetchNearby.mockResolvedValue([]);
  expect(await service.planNearbyInvites(JOB, {})).toEqual([]);
});

it('plans a direct invitation for an active previously hired contractor', async () => {
  from
    .mockReturnValueOnce(query({ id: 'contractor' }))
    .mockReturnValueOnce(query({ first_name: 'Sam' }));
  const preferred = await service.planPreferredInvite(
    'contractor',
    JOB.title,
    'requester'
  );
  expect(preferred).toMatchObject({
    user_id: 'contractor',
    type: 'job_invitation_from_repeat_client',
    title: 'Sam invited you to bid',
  });
  expect(preferred?.message).not.toMatch(/before other contractors/);
  from.mockReturnValueOnce(query(null));
  expect(
    await service.planPreferredInvite(
      'missing-contractor',
      JOB.title,
      'requester'
    )
  ).toBeNull();
});

it('limits recurring invitations to the selected trade and contractor', async () => {
  fetchNearby.mockResolvedValue(
    audience('gardener', 'plumber', 'other-gardener')
  );
  from.mockReturnValue(
    query([
      { contractor_id: 'gardener', skill_name: 'Landscaping' },
      { contractor_id: 'plumber', skill_name: 'Plumbing' },
      { contractor_id: 'other-gardener', skill_name: 'Gardening' },
    ])
  );
  expect(
    (
      await service.planNearbyInvites(JOB, {
        recurring: { category: 'gardening' },
      })
    ).map((x) => x.user_id)
  ).toEqual(['gardener', 'other-gardener']);
  expect(
    (
      await service.planNearbyInvites(JOB, {
        recurring: { category: 'gardening', contractorId: 'other-gardener' },
      })
    ).map((x) => x.user_id)
  ).toEqual(['other-gardener']);
});

it('reports a lookup failure so the worker can retry without broadening the audience', async () => {
  fetchNearby.mockResolvedValue(audience('gardener'));
  from.mockReturnValue(query(null, { message: 'unavailable' }));
  await expect(
    service.planNearbyInvites(JOB, { recurring: { category: 'gardening' } })
  ).rejects.toThrow('trade audience');
});
