/**
 * EscrowService unit tests.
 * Reads go through the shared supabase mock; writes go through a mocked
 * mobileApiClient. Covers happy paths, the timeline step-builder branches,
 * the not-authenticated guard, and the error/catch paths.
 */

import { EscrowService } from '../EscrowService';
import {
  __setMockData,
  __resetSupabaseMock,
  supabase,
} from '../../config/supabase';

jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { post: jest.fn() },
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { mobileApiClient } from '../../utils/mobileApiClient';

const mockPost = mobileApiClient.post as jest.Mock;

beforeEach(() => {
  __resetSupabaseMock();
  mockPost.mockReset();
  mockPost.mockResolvedValue({});
});

describe('getEscrowStatus', () => {
  it('maps a row into the EscrowStatus shape (with a blocking reason)', async () => {
    __setMockData({
      id: 'e1',
      status: 'held',
      amount: 350,
      job_id: 'j1',
      release_blocked_reason: 'awaiting inspection',
      auto_release_date: '2026-07-01',
      homeowner_approval: true,
    });
    const status = await EscrowService.getEscrowStatus('e1');
    expect(status.id).toBe('e1');
    expect(status.blockingReasons).toEqual(['awaiting inspection']);
    expect(status.estimatedReleaseDate).toBe('2026-07-01');
    expect(status.homeownerApproval).toBe(true);
    expect(status.photoVerificationStatus).toBe('pending'); // default
  });

  it('defaults blockingReasons to an empty array when no blocker', async () => {
    __setMockData({ id: 'e2', status: 'held', amount: 100, job_id: 'j2' });
    const status = await EscrowService.getEscrowStatus('e2');
    expect(status.blockingReasons).toEqual([]);
    expect(status.estimatedReleaseDate).toBeNull();
  });

  it('throws a friendly error when the row is missing', async () => {
    __setMockData(null); // single() -> PGRST116 error
    await expect(EscrowService.getEscrowStatus('missing')).rejects.toThrow();
  });
});

describe('getEscrowTimeline', () => {
  it('builds completed steps for an approved + completed escrow', async () => {
    __setMockData({
      id: 'e1',
      status: 'completed',
      job_completed_at: '2026-06-01',
      homeowner_approval: true,
      created_at: '2026-05-01',
      released_at: '2026-06-05',
    });
    const tl = await EscrowService.getEscrowTimeline('e1');
    expect(tl.currentStatus).toBe('completed');
    const byStep = Object.fromEntries(tl.steps.map((s) => [s.step, s.status]));
    expect(byStep.payment_received).toBe('completed');
    expect(byStep.job_completed).toBe('completed');
    expect(byStep.homeowner_approval).toBe('completed');
    expect(byStep.payment_released).toBe('completed');
  });

  it('marks homeowner_approval blocked when there is a blocking reason', async () => {
    __setMockData({
      id: 'e1',
      status: 'held',
      release_blocked_reason: 'dispute open',
      homeowner_approval: false,
    });
    const tl = await EscrowService.getEscrowTimeline('e1');
    const approval = tl.steps.find((s) => s.step === 'homeowner_approval')!;
    expect(approval.status).toBe('blocked');
    expect(approval.blockedReason).toBe('dispute open');
    expect(tl.steps.find((s) => s.step === 'payment_received')!.status).toBe(
      'completed'
    );
  });

  it('leaves steps pending for a brand-new pending escrow', async () => {
    __setMockData({ id: 'e1', status: 'pending' });
    const tl = await EscrowService.getEscrowTimeline('e1');
    const byStep = Object.fromEntries(tl.steps.map((s) => [s.step, s.status]));
    expect(byStep.payment_received).toBe('pending');
    expect(byStep.homeowner_approval).toBe('pending');
    expect(byStep.payment_released).toBe('pending');
  });

  it('throws a friendly error when the row is missing', async () => {
    __setMockData(null);
    await expect(EscrowService.getEscrowTimeline('x')).rejects.toThrow();
  });
});

describe('getContractorEscrows', () => {
  it('throws when there is no authenticated user', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
    });
    await expect(EscrowService.getContractorEscrows()).rejects.toThrow();
  });

  it('returns mapped escrows for the authenticated contractor', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: 'u1' } },
    });
    __setMockData([
      { id: 'e1', status: 'held', amount: 200, job_id: 'j1' },
      {
        id: 'e2',
        status: 'completed',
        amount: 500,
        job_id: 'j2',
        release_blocked_reason: 'hold',
      },
    ]);
    const list = await EscrowService.getContractorEscrows();
    expect(list).toHaveLength(2);
    expect(list[1].blockingReasons).toEqual(['hold']);
  });
});

describe('write operations (mobileApiClient)', () => {
  it('requestAdminReview posts the reason', async () => {
    await EscrowService.requestAdminReview('e1', 'no response');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/escrow/e1/request-admin-review',
      { reason: 'no response' }
    );
  });

  it('approveCompletion posts the inspection flag', async () => {
    await EscrowService.approveCompletion('e1', true);
    expect(mockPost).toHaveBeenCalledWith('/api/escrow/e1/homeowner/approve', {
      inspectionCompleted: true,
    });
  });

  it('rejectCompletion posts the reason', async () => {
    await EscrowService.rejectCompletion('e1', 'poor work');
    expect(mockPost).toHaveBeenCalledWith('/api/escrow/e1/homeowner/reject', {
      reason: 'poor work',
    });
  });

  it('markInspectionCompleted posts to the inspect endpoint', async () => {
    await EscrowService.markInspectionCompleted('e1');
    expect(mockPost).toHaveBeenCalledWith('/api/escrow/e1/homeowner/inspect');
  });

  it.each([
    ['requestAdminReview', () => EscrowService.requestAdminReview('e1')],
    ['approveCompletion', () => EscrowService.approveCompletion('e1', false)],
    ['rejectCompletion', () => EscrowService.rejectCompletion('e1', 'r')],
    [
      'markInspectionCompleted',
      () => EscrowService.markInspectionCompleted('e1'),
    ],
  ])(
    '%s rethrows a friendly error when the API fails',
    async (_label, call) => {
      mockPost.mockRejectedValueOnce(new Error('network down'));
      await expect(call()).rejects.toThrow();
    }
  );
});

describe('getHomeownerPendingApproval', () => {
  it('returns the raw joined row', async () => {
    __setMockData({ id: 'e1', job: { id: 'j1', title: 'Fix sink' } });
    const result = await EscrowService.getHomeownerPendingApproval('e1');
    expect(result).toEqual({ id: 'e1', job: { id: 'j1', title: 'Fix sink' } });
  });

  it('throws a friendly error when the row is missing', async () => {
    __setMockData(null);
    await expect(
      EscrowService.getHomeownerPendingApproval('missing')
    ).rejects.toThrow();
  });
});
