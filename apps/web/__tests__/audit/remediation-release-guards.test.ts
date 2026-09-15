import { beforeEach, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  eligible: vi.fn(),
  approve: vi.fn(),
  autoApprove: vi.fn(),
  block: vi.fn(),
  mfa: vi.fn(),
  validate: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/services/escrow/HomeownerApprovalService', () => ({
  HomeownerApprovalService: {
    checkAutoApprovalEligibility: mocks.eligible,
    approveCompletion: mocks.approve,
    processAutoApproval: mocks.autoApprove,
  },
}));
vi.mock('@/lib/services/escrow/EscrowStatusService', () => ({
  EscrowStatusService: { getBlockingReasons: mocks.block },
}));
vi.mock('@/lib/payments/high-risk-checks', () => ({
  requiresMFA: mocks.mfa,
  validateMFAForPayment: mocks.validate,
  HighRiskOperation: { ESCROW_RELEASE: 'release' },
}));
import { checkReleaseConditions } from '@/app/api/payments/release-escrow/_release-conditions';
import { validateEscrowMFA } from '@/app/api/payments/release-escrow/_validation';
const escrow = {
  admin_hold_status: null,
  homeowner_approval: false,
  photo_verification_status: 'verified',
  photo_quality_passed: true,
  geolocation_verified: true,
  timestamp_verified: true,
  cooling_off_ends_at: null,
};
let disputes: { count: number; error: unknown };
let approval: { data: unknown; error: unknown };
beforeEach(() => {
  vi.clearAllMocks();
  disputes = { count: 0, error: null };
  approval = {
    data: { homeowner_approval: true, cooling_off_ends_at: null },
    error: null,
  };
  mocks.from.mockImplementation(() => ({
    select: () => ({
      eq: () => ({ in: async () => disputes, single: async () => approval }),
    }),
  }));
  mocks.eligible.mockResolvedValue(true);
  mocks.autoApprove.mockResolvedValue(undefined);
  mocks.approve.mockResolvedValue(undefined);
  mocks.block.mockResolvedValue(['blocked']);
  mocks.mfa.mockResolvedValue({ required: true });
  mocks.validate.mockResolvedValue({ valid: true });
});
describe('release prerequisite failures', () => {
  it.each(['admin_hold', 'pending_review'])(
    'does not approve escrow on %s',
    async (status) => {
      await expect(
        checkReleaseConditions(
          'escrow',
          { ...escrow, admin_hold_status: status },
          'job'
        )
      ).rejects.toThrow('admin hold');
      expect(mocks.autoApprove).not.toHaveBeenCalled();
      expect(mocks.approve).not.toHaveBeenCalled();
    }
  );
  it('fails closed on dispute query failure before automatic or explicit approval', async () => {
    disputes.error = new Error('Database unavailable');
    await expect(
      checkReleaseConditions('escrow', escrow, 'job', { actorId: 'payer' })
    ).rejects.toThrow('dispute state');
    expect(mocks.approve).not.toHaveBeenCalled();
    expect(mocks.autoApprove).not.toHaveBeenCalled();
  });
  it('blocks disputed jobs before the waiver can mutate approval', async () => {
    disputes.count = 1;
    const result = await checkReleaseConditions('escrow', escrow, 'job', {
      actorId: 'payer',
    });
    expect(result.blocked?.status).toBe(403);
    expect(mocks.approve).not.toHaveBeenCalled();
  });
  it('does not bypass a rejected explicit approval', async () => {
    mocks.eligible.mockResolvedValue(false);
    mocks.approve.mockRejectedValue(new Error('Ownership changed'));
    const result = await checkReleaseConditions('escrow', escrow, 'job', {
      actorId: 'payer',
    });
    expect(result.blocked?.status).toBe(403);
    expect(await result.blocked?.json()).toMatchObject({
      error: 'Ownership changed',
    });
  });
  it('waits for homeowner approval when there is no eligible auto-approval or waiver', async () => {
    mocks.eligible.mockResolvedValue(false);
    const result = await checkReleaseConditions('escrow', escrow, 'job');
    expect(result.blocked?.status).toBe(403);
    expect(mocks.approve).not.toHaveBeenCalled();
  });
  it('requires persisted auto-approval rather than accepting a service return', async () => {
    approval.data = { homeowner_approval: false };
    const result = await checkReleaseConditions('escrow', escrow, 'job');
    expect(result.blocked?.status).toBe(403);
  });
  it('fails closed when persisted auto-approval cannot be read', async () => {
    approval.error = new Error('DB unavailable');
    await expect(
      checkReleaseConditions('escrow', escrow, 'job')
    ).rejects.toThrow('completion approval');
  });
  it.each([
    { photo_verification_status: 'pending' },
    { photo_quality_passed: false },
    { geolocation_verified: false },
    { timestamp_verified: false },
  ])('blocks auto-release with incomplete evidence %j', async (incomplete) => {
    const result = await checkReleaseConditions(
      'escrow',
      { ...escrow, ...incomplete },
      'job'
    );
    expect(result.blocked?.status).toBe(403);
  });
  it('respects the persisted cooling-off deadline', async () => {
    approval.data = {
      homeowner_approval: true,
      cooling_off_ends_at: new Date(Date.now() + 3600000).toISOString(),
    };
    const result = await checkReleaseConditions('escrow', escrow, 'job');
    expect(result.blocked?.status).toBe(403);
  });
});
describe('release MFA boundary', () => {
  it('requires an MFA token for high-risk release', async () => {
    expect(
      (await validateEscrowMFA('payer', 'escrow', 500, null))?.status
    ).toBe(403);
    expect(mocks.validate).not.toHaveBeenCalled();
  });
  it('rejects a supplied but invalid token', async () => {
    mocks.validate.mockResolvedValue({ valid: false });
    expect(
      (await validateEscrowMFA('payer', 'escrow', 500, 'invalid'))?.status
    ).toBe(403);
  });
  it('accepts only a validated token', async () => {
    expect(await validateEscrowMFA('payer', 'escrow', 500, 'valid')).toBeNull();
    expect(mocks.validate).toHaveBeenCalledWith('payer', 'valid', 'release');
  });
});
