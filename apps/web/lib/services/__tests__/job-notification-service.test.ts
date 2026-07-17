// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

const { mockFrom, mockCreateNotification, mockFetchAudience } = vi.hoisted(
  () => ({
    mockFrom: vi.fn(),
    mockCreateNotification: vi.fn(),
    mockFetchAudience: vi.fn(),
  })
);

function buildChain(result?: { data?: unknown; error?: unknown }) {
  const resolved = {
    data: result?.data ?? null,
    error: result?.error ?? null,
  };
  const chain: Record<string, any> = {};
  for (const m of ['select', 'eq', 'not', 'in', 'update']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(resolved);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolved);
  chain.then = (
    onFulfilled?: (v: typeof resolved) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => Promise.resolve(resolved).then(onFulfilled, onRejected);
  return chain;
}

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mockFrom },
}));

vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: mockCreateNotification },
}));

vi.mock('@/lib/services/job-notification-audience', () => ({
  fetchNearbyContractors: mockFetchAudience,
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

function audience(...ids: string[]) {
  return ids.map((id) => ({
    id,
    distanceKm: 1,
    matchedVia: 'service_area' as const,
  }));
}

describe('JobNotificationService.notifyNearbyContractors', () => {
  beforeEach(() => {
    mockCreateNotification.mockResolvedValue('notif-id');
  });

  it('fans out job_nearby through NotificationService per matched contractor', async () => {
    mockFetchAudience.mockResolvedValue(audience('c-1', 'c-2'));

    await JobNotificationService.getInstance().notifyNearbyContractors(JOB, {
      required_skills: null,
    });

    expect(mockFetchAudience).toHaveBeenCalledWith(
      { lat: JOB.latitude, lng: JOB.longitude },
      'Cheltenham'
    );
    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'c-1',
        type: 'job_nearby',
        metadata: { jobId: JOB.id },
      })
    );
  });

  it('keeps the soft skill filter: only skilled contractors when some match', async () => {
    mockFetchAudience.mockResolvedValue(audience('c-skilled', 'c-unskilled'));
    mockFrom.mockReturnValue(
      buildChain({
        data: [{ contractor_id: 'c-skilled', skill_name: 'plumbing' }],
        error: null,
      })
    );

    await JobNotificationService.getInstance().notifyNearbyContractors(JOB, {
      required_skills: ['plumbing'],
    });

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'c-skilled' })
    );
  });

  it('keeps the notify-all fallback when zero contractors match the skills', async () => {
    mockFetchAudience.mockResolvedValue(audience('c-1', 'c-2'));
    mockFrom.mockReturnValue(buildChain({ data: [], error: null }));

    await JobNotificationService.getInstance().notifyNearbyContractors(JOB, {
      required_skills: ['roofing'],
    });

    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
  });

  it('sends nothing when the audience is empty', async () => {
    mockFetchAudience.mockResolvedValue([]);

    await JobNotificationService.getInstance().notifyNearbyContractors(JOB, {
      required_skills: null,
    });

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});

describe('JobNotificationService.notifyPreferredContractor', () => {
  beforeEach(() => {
    mockCreateNotification.mockResolvedValue('notif-id');
  });

  it('sends job_invitation_from_repeat_client with the contractor bid URL', async () => {
    mockFrom.mockReturnValue(
      buildChain({
        data: { id: 'c-9', role: 'contractor', first_name: 'Sam' },
        error: null,
      })
    );

    await JobNotificationService.getInstance().notifyPreferredContractor(
      'c-9',
      'job-1',
      'Fix leaking tap',
      'h-1'
    );

    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'c-9',
        type: 'job_invitation_from_repeat_client',
        actionUrl: '/contractor/jobs/job-1',
        metadata: expect.objectContaining({ job_id: 'job-1' }),
      })
    );
  });

  it('skips silently when the contractor no longer exists', async () => {
    mockFrom.mockReturnValue(buildChain({ data: null, error: null }));

    await JobNotificationService.getInstance().notifyPreferredContractor(
      'c-gone',
      'job-1',
      'Fix leaking tap',
      'h-1'
    );

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
