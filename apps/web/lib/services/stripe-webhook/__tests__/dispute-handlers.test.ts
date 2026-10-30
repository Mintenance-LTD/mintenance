// @vitest-environment node
import type Stripe from 'stripe';
const m = vi.hoisted(() => ({
  retrieve: vi.fn(),
  rpc: vi.fn(),
  enqueue: vi.fn(),
}));
vi.mock('@/lib/stripe', () => ({
  stripe: { disputes: { retrieve: m.retrieve } },
}));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc: m.rpc } }));
vi.mock('@/lib/utils/api-timeout', () => ({
  stripeWithTimeout: (fn: () => unknown) => fn(),
}));
vi.mock('@/lib/services/admin/OperatorAlertService', () => ({
  OperatorAlertService: { enqueue: m.enqueue },
}));
import {
  handleDisputeCreated,
  handleDisputeUpdated,
  handleDisputeClosed,
} from '../dispute-handlers';
const dispute = {
  id: 'dp_test',
  charge: 'ch_test',
  payment_intent: 'pi_test',
  amount: 12000,
  currency: 'gbp',
  reason: 'product_not_received',
  status: 'needs_response',
  livemode: false,
  evidence_details: { due_by: 1800000000 },
} as Stripe.Dispute;
beforeEach(() => {
  vi.clearAllMocks();
  m.retrieve.mockResolvedValue(dispute);
  m.rpc.mockResolvedValue({
    data: { status: 'needs_response', requiresReview: false },
    error: null,
  });
  m.enqueue.mockResolvedValue(undefined);
});
describe('provider chargeback synchronization', () => {
  it.each([handleDisputeCreated, handleDisputeUpdated, handleDisputeClosed])(
    'refreshes and atomically persists each delivery type',
    async (handler) => {
      await handler(dispute, vi.fn());
      expect(m.retrieve).toHaveBeenCalledWith('dp_test');
      expect(m.rpc).toHaveBeenCalledWith('sync_stripe_payment_dispute', {
        p_dispute: {
          id: 'dp_test',
          payment_intent: 'pi_test',
          charge: 'ch_test',
          amount: 12000,
          currency: 'gbp',
          status: 'needs_response',
          reason: 'product_not_received',
          evidence_due_by: 1800000000,
        },
      });
      expect(m.enqueue).toHaveBeenCalledWith('stripe-chargeback-review', null);
    }
  );
  it('uses current terminal status for an old created event', async () => {
    m.retrieve.mockResolvedValue({ ...dispute, status: 'won' });
    m.rpc.mockResolvedValue({
      data: { status: 'won', requiresReview: false },
      error: null,
    });
    await handleDisputeCreated(dispute, vi.fn());
    expect(m.rpc.mock.calls[0][1].p_dispute.status).toBe('won');
    expect(m.enqueue).not.toHaveBeenCalled();
  });
  it('does not acknowledge a failed atomic write', async () => {
    m.rpc.mockResolvedValue({
      data: null,
      error: { message: 'DB unavailable' },
    });
    await expect(handleDisputeCreated(dispute, vi.fn())).rejects.toThrow(
      'Failed to persist'
    );
    expect(m.enqueue).not.toHaveBeenCalled();
  });
  it('retries when durable operator alert enqueue fails', async () => {
    m.enqueue.mockRejectedValue(Error('outbox unavailable'));
    await expect(handleDisputeCreated(dispute, vi.fn())).rejects.toThrow(
      'outbox unavailable'
    );
  });
  it('alerts for paid or unmatched chargebacks even after winning', async () => {
    m.rpc.mockResolvedValue({
      data: { status: 'won', requiresReview: true },
      error: null,
    });
    await handleDisputeClosed(dispute, vi.fn());
    expect(m.enqueue).toHaveBeenCalledOnce();
  });
  it('rejects mismatched provider identity or mode', async () => {
    m.retrieve.mockResolvedValue({ ...dispute, livemode: true });
    await expect(handleDisputeCreated(dispute, vi.fn())).rejects.toThrow(
      'identity'
    );
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
