import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  from: vi.fn(),
  hold: vi.fn(),
  risk: vi.fn(),
  log: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
vi.mock('@/lib/services/contractor/TrustScoreService', () => ({
  TrustScoreService: { getGraduatedReleaseDate: m.hold },
}));
vi.mock('@/lib/services/agents/PredictiveAgent', () => ({
  PredictiveAgent: { analyzeJob: m.risk },
}));
vi.mock('@/lib/services/agents/AgentLogger', () => ({
  AgentLogger: { logDecision: m.log },
}));
vi.mock('@/lib/services/payment/PayoutTierService', () => ({
  PayoutTierService: { calculateTier: async () => 'standard' },
}));
vi.mock('@/lib/services/agents/escrow/auto-release-rules', () => ({
  getApplicableRule: async () => null,
  calculateAutoReleaseDate: vi.fn(),
}));
vi.mock('@/lib/services/escrow/HomeownerApprovalService', () => ({
  HomeownerApprovalService: {},
}));
import { evaluateAutoRelease } from '@/lib/services/agents/escrow/evaluate';
let escrow: Record<string, unknown>;
let disputeError: unknown;
let disputeCount: number;
beforeEach(() => {
  vi.clearAllMocks();
  disputeError = null;
  disputeCount = 0;
  escrow = {
    id: 'escrow',
    job_id: 'job',
    status: 'held',
    amount: 1,
    auto_release_enabled: true,
    auto_release_date: '2026-10-06T17:41:57Z',
    cooling_off_ends_at: '2026-10-06T17:41:57Z',
    homeowner_approval_at: '2026-10-04T17:41:57Z',
    homeowner_approval: true,
    release_reason: 'homeowner_approved',
    homeowner_inspection_completed: true,
    admin_hold_status: 'none',
    jobs: {
      id: 'job',
      status: 'completed',
      contractor_id: 'contractor',
      homeowner_id: 'owner',
    },
  };
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
  m.hold.mockResolvedValue(new Date('2026-10-18T17:41:57Z'));
  m.risk.mockResolvedValue([]);
  m.from.mockImplementation(() => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.single = async () => ({ data: escrow, error: null });
    q.in = async () => ({ count: disputeCount, error: disputeError });
    q.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve({ count: 0, error: null }));
    return q;
  });
});
import { afterEach } from 'vitest';
afterEach(() => vi.useRealTimers());
it('releases the inspected £1 job after its advertised deadline without an extra trust hold', async () => {
  expect(await evaluateAutoRelease('escrow')).toMatchObject({ success: true });
  expect(m.hold).not.toHaveBeenCalled();
});
it('keeps the review period before its deadline', async () => {
  vi.setSystemTime(new Date('2026-10-06T17:00:00Z'));
  expect(await evaluateAutoRelease('escrow')).toBeNull();
});
it('retains the trust hold for a previously automatic approval', async () => {
  Object.assign(escrow, {
    release_reason: 'auto_approved',
    homeowner_inspection_completed: false,
    photo_verification_status: 'verified',
    photo_quality_passed: true,
    geolocation_verified: true,
    timestamp_verified: true,
    before_after_comparison_score: 1,
  });
  expect(await evaluateAutoRelease('escrow')).toBeNull();
  expect(m.hold).toHaveBeenCalled();
});
it.each(['admin_hold', 'pending_review'])(
  'retains %s protection',
  async (status) => {
    escrow.admin_hold_status = status;
    expect(await evaluateAutoRelease('escrow')).toBeNull();
  }
);
it('blocks an active dispute', async () => {
  disputeCount = 1;
  expect(await evaluateAutoRelease('escrow')).toBeNull();
});
it('fails closed when dispute state cannot be checked', async () => {
  disputeError = new Error('unavailable');
  expect(await evaluateAutoRelease('escrow')).toBeNull();
  expect(m.risk).not.toHaveBeenCalled();
});

import { EscrowStatusService } from '@/lib/services/escrow/EscrowStatusService';
it('does not show stale photo blockers after explicit homeowner inspection', async () => {
  expect(await EscrowStatusService.getBlockingReasons('escrow')).toEqual([]);
});
it('still shows photo blockers without human inspection', async () => {
  escrow.homeowner_inspection_completed = false;
  expect(await EscrowStatusService.getBlockingReasons('escrow')).toContain(
    'Photo verification pending or failed'
  );
});
