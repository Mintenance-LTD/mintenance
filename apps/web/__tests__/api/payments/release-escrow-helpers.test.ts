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
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mocks.profileSingle(),
        }),
      }),
    }),
  },
}));

// Avoid pulling Stripe SDK / heavy services in at module load
vi.mock('@/lib/stripe', () => ({ stripe: {} }));
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
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
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
});
