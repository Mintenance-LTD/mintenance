import { serverSupabase } from '@/lib/api/supabaseServer';
import { readStripePaymentCredit } from './stripe-payment-credit';

export async function readContractorPaymentRecord(id: string, payeeId: string) {
  const { data: payment, error } = await serverSupabase
    .from('escrow_transactions')
    .select('id,job_id,amount,contractor_payout,released_at,transfer_id,status')
    .eq('id', id)
    .eq('payee_id', payeeId)
    .maybeSingle();
  if (error) throw new Error('Could not load payment. Please retry.');
  if (!payment) return null;

  const [jobResult, profileResult] = await Promise.all([
    serverSupabase
      .from('jobs')
      .select('title')
      .eq('id', payment.job_id)
      .maybeSingle(),
    payment.transfer_id
      ? serverSupabase
          .from('profiles')
          .select('stripe_connect_account_id')
          .eq('id', payeeId)
          .maybeSingle()
      : null,
  ]);
  const stripeCredit = await readStripePaymentCredit(
    payment.transfer_id,
    profileResult?.data?.stripe_connect_account_id ?? null
  );
  const steps = [
    {
      label: 'Released from escrow',
      detail: payment.released_at
        ? 'Mintenance recorded the release.'
        : payment.status === 'disputed'
          ? 'Release is paused while the dispute is reviewed.'
          : 'No escrow release date is recorded for this payment.',
      at: payment.released_at,
    },
    {
      label: 'Credited to Stripe balance',
      detail: stripeCredit
        ? stripeCredit.reversal
          ? stripeCredit.reversal === 'full'
            ? 'Stripe recorded the credit and later reversed the transfer.'
            : 'Stripe recorded the credit and later reversed part of the transfer.'
          : stripeCredit.pending
            ? 'Stripe recorded the credit. It is pending availability in your balance.'
            : 'Stripe recorded the credit in your connected account.'
        : 'A Stripe balance credit is unconfirmed for this payment. Weekly transfers can combine several jobs.',
      at: stripeCredit?.creditedAt,
    },
    {
      label: 'Paid to bank',
      detail:
        'Bank arrival is unconfirmed for this payment. Mintenance has no bank payout linked to this record.',
      at: null,
    },
  ];
  return {
    id: payment.id,
    jobId: payment.job_id,
    jobTitle: jobResult.data?.title ?? 'Job payment',
    amount: Number(payment.amount),
    contractorAmount:
      payment.contractor_payout == null
        ? null
        : Number(payment.contractor_payout),
    status: payment.status,
    steps,
  };
}
