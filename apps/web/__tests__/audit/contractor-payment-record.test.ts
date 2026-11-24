import { beforeEach, expect, it, vi } from 'vitest';
import { readContractorPaymentRecord } from '@/lib/contractor/payment-record';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  retrieve: vi.fn(),
  list: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    transfers: { retrieve: mocks.retrieve },
    balanceTransactions: { list: mocks.list },
  },
}));

const payment = {
  id: 'payment',
  job_id: 'job',
  amount: 1,
  contractor_payout: 0.5,
  released_at: '2026-11-21T13:00:00.000Z',
  status: 'completed',
  transfer_id: 'tr_direct',
};

function stubRows(
  row:
    | (Omit<typeof payment, 'transfer_id'> & { transfer_id: string | null })
    | null
) {
  const filters = vi.fn().mockReturnThis();
  mocks.from.mockImplementation((table) => ({
    select: () => ({
      eq: filters,
      maybeSingle: async () => ({
        data:
          table === 'escrow_transactions'
            ? row
            : table === 'jobs'
              ? { title: 'Garden Maintenance' }
              : { stripe_connect_account_id: 'acct_contractor' },
        error: null,
      }),
    }),
  }));
  return filters;
}

beforeEach(() => vi.resetAllMocks());

it('reads only the exact payment for the payee and keeps escrow, Stripe and bank evidence separate', async () => {
  const filters = stubRows(payment);
  mocks.retrieve.mockResolvedValue({
    destination: 'acct_contractor',
    destination_payment: 'py_direct',
  });
  mocks.list.mockResolvedValue({
    data: [{ created: 1795269600, status: 'pending', amount: 50 }],
  });
  const record = await readContractorPaymentRecord('payment', 'contractor');
  expect(filters).toHaveBeenCalledWith('id', 'payment');
  expect(filters).toHaveBeenCalledWith('payee_id', 'contractor');
  expect(mocks.list).toHaveBeenCalledWith(
    { source: 'py_direct', limit: 2 },
    expect.objectContaining({ stripeAccount: 'acct_contractor' })
  );
  expect(record).toMatchObject({ id: 'payment', contractorAmount: 0.5 });
  expect(record?.steps).toMatchObject([
    { label: 'Released from escrow', at: payment.released_at },
    {
      label: 'Credited to Stripe balance',
      at: new Date(1795269600 * 1000).toISOString(),
      detail: expect.stringContaining('pending availability'),
    },
    {
      label: 'Paid to bank',
      at: null,
      detail: expect.stringContaining('Bank arrival is unconfirmed'),
    },
  ]);
});

it('looks up Stripe only when the recipient owns the payment and the direct transfer exists', async () => {
  stubRows(null);
  expect(await readContractorPaymentRecord('unknown', 'contractor')).toBeNull();
  stubRows({ ...payment, transfer_id: null });
  const batched = await readContractorPaymentRecord('payment', 'contractor');
  expect(batched?.steps[1]).toMatchObject({
    detail: expect.stringContaining('unconfirmed'),
  });
  expect(mocks.retrieve).not.toHaveBeenCalled();
  stubRows(payment);
  mocks.retrieve.mockResolvedValue({
    destination: 'acct_someone_else',
    destination_payment: 'py_direct',
  });
  const mismatched = await readContractorPaymentRecord('payment', 'contractor');
  expect(mismatched?.steps[1].at).toBeUndefined();
  expect(mocks.list).not.toHaveBeenCalled();
});
