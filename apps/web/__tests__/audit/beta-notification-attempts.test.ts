import { annotatePaymentAlerts } from '@/lib/notifications/payment-alerts';
import type { FeedNotification } from '@/lib/notifications/feed';
it('resolves only the exact funded attempt for this payer, retaining distinct failures', async () => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: [
        { payment_intent_id: 'pi_paid', status: 'held' },
        { payment_intent_id: 'pi_other', status: 'failed' },
      ],
      error: null,
    }),
  };
  const db = { from: vi.fn(() => query) };
  const rows = ['pi_paid', 'pi_other', undefined].map((id, i) => ({
    id: String(i),
    type: 'payment_failed',
    title: 'Payment failed',
    message: 'Please retry.',
    read: false,
    created_at: '2026-11-14T19:43:00Z',
    metadata: { paymentIntentId: id },
  }));
  const result = await annotatePaymentAlerts(db as never, 'payer', rows);
  expect(query.eq).toHaveBeenCalledWith('payer_id', 'payer');
  expect(query.in).toHaveBeenCalledWith('payment_intent_id', [
    'pi_paid',
    'pi_other',
  ]);
  expect(result[0].metadata?.paymentAlertResolved).toBe(true);
  expect(result[0].read).toBe(false);
  expect(result[1]).toEqual(rows[1]);
  expect(result[2]).toEqual(rows[2]);
});
it('does not infer success when the authoritative lookup fails', async () => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: null, error: new Error('offline') }),
  };
  const rows: FeedNotification[] = [
    {
      id: 'n',
      type: 'payment_requires_action',
      title: 'Verify',
      message: '3DS',
      created_at: '2026-11-14',
      read: false,
      metadata: { paymentIntentId: 'pi_pending' },
    },
  ];
  expect(
    await annotatePaymentAlerts({ from: () => query } as never, 'payer', rows)
  ).toEqual(rows);
});
