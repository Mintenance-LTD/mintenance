/**
 * Regression tests for release-escrow/_helpers.notifyAndEmailContractor.
 *
 * BUG (fixed): escrow_transactions.amount is stored in POUNDS (major units)
 * — create-intent/embedded-checkout insert the server-authoritative bid amount
 * unscaled while sending Stripe `* 100`. notifyAndEmailContractor used to do
 * `amount / 100 // Convert from cents`, mislabelling pounds as pence, so a £500
 * payout rendered as "£5.00" in every release notification + email.
 *
 * These tests pin the amount passthrough: the value handed to
 * notifyPaymentEvent and sendPaymentReleasedEmail must equal the pounds amount,
 * NOT amount / 100.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  notifyPaymentEvent: vi.fn(),
  sendPaymentReleasedEmail: vi.fn(),
  profileSingle: vi.fn(),
  supabaseFrom: vi.fn(),
  stripeTransferCreate: vi.fn(),
  paymentIntentRetrieve: vi.fn(),
  feeTransfer: vi.fn(),
  calculateFees: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Dynamic import target inside notifyAndEmailContractor
vi.mock('@/lib/services/notifications/NotificationHelper', () => ({
  notifyPaymentEvent: mocks.notifyPaymentEvent,
}));

vi.mock('@/lib/email-service', () => ({
  EmailService: {
    sendPaymentReleasedEmail: mocks.sendPaymentReleasedEmail,
  },
}));

// Supabase profiles lookup for the contractor email
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: async (
      _name: string,
      args: { p_escrow_id: string; p_amount: number; p_destination: string }
    ) => ({
      data: [
        {
          created_at: new Date().toISOString(),
          transfer_id: null,
          idempotency_key: `escrow_release_${args.p_escrow_id}`,
          stripe_parameters: {
            amount: args.p_amount,
            currency: 'gbp',
            destination: args.p_destination,
          },
        },
      ],
      error: null,
    }),
    from: (...args: unknown[]) => mocks.supabaseFrom(...args),
  },
}));

// Avoid pulling Stripe SDK / heavy services in at module load
vi.mock('@/lib/stripe', () => ({
  stripe: {
    transfers: { create: mocks.stripeTransferCreate },
    paymentIntents: { retrieve: mocks.paymentIntentRetrieve },
  },
}));
vi.mock('@/lib/services/payment/FeeCalculationService', () => ({
  FeeCalculationService: { calculateFees: mocks.calculateFees },
}));
vi.mock('@/lib/services/payment/FeeTransferService', () => ({
  FeeTransferService: { transferPlatformFee: mocks.feeTransfer },
}));
vi.mock('@/lib/services/escrow/EscrowStatusService', () => ({
  EscrowStatusService: {},
}));
vi.mock('@/lib/services/escrow/HomeownerApprovalService', () => ({
  HomeownerApprovalService: {},
}));
vi.mock('@/lib/services/payment/FeeTransferService', () => ({
  FeeTransferService: {},
}));
vi.mock('@mintenance/shared', () => ({
  // The 2026-07 tiered-pricing work moved the platform fee rates into
  // @mintenance/shared. A vi.mock factory must return EVERY export its
  // consumers import, or they throw at import time -- which is what turned
  // this suite red without any production code being wrong.
  PLATFORM_FEE_RATE_BY_TIER: {
    free: 0.12,
    basic: 0.12,
    professional: 0.08,
    enterprise: 0.05,
  },
  DEFAULT_PLATFORM_FEE_RATE: 0.12,
  logger: mocks.logger,
  ESCROW_STATUS: { HELD: 'held' },
}));

const job = {
  id: 'job-1',
  title: 'Fix the roof',
  homeowner_id: 'homeowner-1',
  contractor_id: 'contractor-1',
  status: 'completed',
};

describe('notifyAndEmailContractor — payout amount formatting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notifyPaymentEvent.mockResolvedValue(undefined);
    mocks.sendPaymentReleasedEmail.mockResolvedValue(true);
    mocks.profileSingle.mockResolvedValue({
      data: { email: 'contractor@example.com', full_name: 'Jane Doe' },
    });
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({ single: () => mocks.profileSingle() }),
          }),
        };
      }
      return {
        insert: vi.fn(() => Promise.resolve({ error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      };
    });
    mocks.calculateFees.mockReturnValue({
      platformFee: 60,
      contractorAmount: 430,
      stripeFee: 10,
    });
    mocks.feeTransfer.mockResolvedValue({
      status: 'succeeded',
      feeTransferId: 'fee-transfer-1',
    });
    mocks.stripeTransferCreate.mockResolvedValue({ id: 'tr_1' });
    mocks.paymentIntentRetrieve.mockResolvedValue({ latest_charge: 'ch_1' });
  });

  it('passes the pounds amount straight through to the in-app notification (no /100)', async () => {
    const { notifyAndEmailContractor } =
      await import('@/app/api/payments/release-escrow/_helpers');

    // £500 in escrow (pounds). Would-have-been-broken output: £5.00
    await notifyAndEmailContractor(job, 'escrow-1', 500);

    expect(mocks.notifyPaymentEvent).toHaveBeenCalledTimes(1);
    const arg = mocks.notifyPaymentEvent.mock.calls[0][0];
    expect(arg.amount).toBe(500);
    expect(arg.amount).not.toBe(5); // the old amount/100 bug
  });

  it('passes the pounds amount straight through to the payment-released email (no /100)', async () => {
    const { notifyAndEmailContractor } =
      await import('@/app/api/payments/release-escrow/_helpers');

    await notifyAndEmailContractor(job, 'escrow-1', 500);

    expect(mocks.sendPaymentReleasedEmail).toHaveBeenCalledTimes(1);
    const [, data] = mocks.sendPaymentReleasedEmail.mock.calls[0];
    expect(data.amount).toBe(500);
    expect(data.amount).not.toBe(5);
  });

  it('preserves pence precision for a fractional pounds amount', async () => {
    const { notifyAndEmailContractor } =
      await import('@/app/api/payments/release-escrow/_helpers');

    // £499.99 must stay £499.99, not become £4.9999
    await notifyAndEmailContractor(job, 'escrow-1', 499.99);

    expect(mocks.notifyPaymentEvent.mock.calls[0][0].amount).toBe(499.99);
    expect(mocks.sendPaymentReleasedEmail.mock.calls[0][1].amount).toBe(499.99);
  });

  it('calculates release fees through the shared fee service with the resolved tier', async () => {
    const { calculateReleaseFeeBreakdown } =
      await import('@/app/api/payments/release-escrow/_helpers');

    const result = calculateReleaseFeeBreakdown(500, 'final', 'professional');

    expect(mocks.calculateFees).toHaveBeenCalledWith(500, {
      paymentType: 'final',
      contractorTier: 'professional',
    });
    expect(result).toEqual({
      platformFee: 60,
      contractorAmount: 430,
      stripeFee: 10,
    });
  });

  it('uses the stable escrow idempotency key and reverts a failed transfer claim', async () => {
    const update = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    }));
    mocks.supabaseFrom.mockImplementation((table: string) =>
      table === 'escrow_transactions' ? { update } : undefined
    );
    mocks.stripeTransferCreate.mockRejectedValue(
      new Error('Stripe unavailable')
    );
    const { performStripeTransfer } =
      await import('@/app/api/payments/release-escrow/_helpers');

    await expect(
      performStripeTransfer(
        43000,
        'acct_1',
        job,
        'escrow-1',
        'homeowner_approved',
        'recon-1',
        {
          platformFee: 60,
          contractorAmount: 430,
          stripeFee: 10,
        }
      )
    ).rejects.toThrow('Payment transfer could not be confirmed');

    expect(mocks.stripeTransferCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 43000, destination: 'acct_1' }),
      { idempotencyKey: 'escrow_release_escrow-1' }
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'held' })
    );
  });

  it('returns charge IDs in both Stripe response shapes and fails soft on lookup errors', async () => {
    const { getChargeId } =
      await import('@/app/api/payments/release-escrow/_helpers');

    await expect(getChargeId('pi_1')).resolves.toBe('ch_1');
    mocks.paymentIntentRetrieve.mockResolvedValueOnce({
      latest_charge: { id: 'ch_2' },
    });
    await expect(getChargeId('pi_2')).resolves.toBe('ch_2');
    mocks.paymentIntentRetrieve.mockRejectedValueOnce(new Error('timeout'));
    await expect(getChargeId('pi_3')).resolves.toBeUndefined();
  });

  it('does not make a fee-transfer failure fail the escrow release', async () => {
    const { createFeeTransferRecord } =
      await import('@/app/api/payments/release-escrow/_helpers');
    mocks.feeTransfer.mockRejectedValueOnce(new Error('fee write failed'));

    await expect(
      createFeeTransferRecord({
        escrowTransactionId: 'escrow-1',
        amount: 60,
      } as never)
    ).resolves.toBeUndefined();
    expect(mocks.logger.error).toHaveBeenCalled();
  });

  it('requires an audit row before allowing an admin bypass to proceed', async () => {
    const insert = vi.fn(() => Promise.resolve({ error: null }));
    mocks.supabaseFrom.mockImplementation(() => ({ insert }));
    const { writeAdminBypassAuditLog } =
      await import('@/app/api/payments/release-escrow/_helpers');

    await expect(
      writeAdminBypassAuditLog(
        'admin-1',
        'escrow-1',
        job,
        500,
        'manual_review',
        'approved'
      )
    ).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_ESCROW_BYPASS',
        user_id: 'admin-1',
      })
    );
  });
});
