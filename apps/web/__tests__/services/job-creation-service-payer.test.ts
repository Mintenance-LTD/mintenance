import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));

vi.mock('@/lib/security/url-validation', () => ({
  validateURLs: vi.fn(),
}));

vi.mock('@mintenance/shared', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/services/job-notification-service', () => ({
  JobNotificationService: {
    getInstance: () => ({
      notifyNearbyContractors: vi.fn(),
      notifyPreferredContractor: vi.fn(),
    }),
  },
}));

import { JobCreationService } from '@/lib/services/job-creation-service';

type PayerPayload = {
  property_id?: string;
  tenancy_metadata?: Record<string, unknown>;
  payer_user_id?: string;
};

function queryResult<T>(data: T, error: unknown = null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data, error })),
  };
  return chain;
}

function resolvePayer(payload: PayerPayload, userId = 'creator-id') {
  const service = JobCreationService.getInstance() as unknown as {
    resolvePayerFromEmail: (id: string, value: PayerPayload) => Promise<void>;
  };
  return service.resolvePayerFromEmail(userId, payload);
}

describe('JobCreationService payer delegation', () => {
  beforeEach(() => {
    mocks.from.mockReset();
  });

  it('rejects a client-supplied payer id instead of trusting it', async () => {
    await expect(
      resolvePayer({ payer_user_id: 'unrelated-user-id' })
    ).rejects.toThrow('server-managed');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects payer email delegation without an existing property', async () => {
    await expect(
      resolvePayer({
        tenancy_metadata: { payer_email: 'manager@example.com' },
      })
    ).rejects.toThrow('property is required');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects an account that is not an accepted property admin or manager', async () => {
    mocks.from.mockReturnValueOnce(queryResult({ id: 'payer-id' }));
    mocks.from.mockReturnValueOnce(queryResult(null));

    await expect(
      resolvePayer({
        property_id: 'property-id',
        tenancy_metadata: { payer_email: 'manager@example.com' },
      })
    ).rejects.toThrow('accepted property admin or manager');
  });

  it('resolves an accepted property admin or manager as the payer', async () => {
    mocks.from.mockReturnValueOnce(queryResult({ id: 'payer-id' }));
    mocks.from.mockReturnValueOnce(queryResult({ id: 'team-member-id' }));
    const payload: PayerPayload = {
      property_id: 'property-id',
      tenancy_metadata: { payer_email: 'manager@example.com' },
    };

    await resolvePayer(payload);

    expect(payload.payer_user_id).toBe('payer-id');
    expect(mocks.from).toHaveBeenNthCalledWith(1, 'profiles');
    expect(mocks.from).toHaveBeenNthCalledWith(2, 'property_team_members');
  });
});
