import { serverSupabase } from '@/lib/api/supabaseServer';

const financialTables = [
  'escrow_transactions',
  'payment_funding_reservations',
  'invoices',
  'payments',
  'escrow_payments',
  'payment_tracking',
  'tax_payment_records',
  'contractor_payout_credit_events',
] as const;
const consentTables = [
  'contract_signatures',
  'contract_acceptance_evidence',
  'contract_cosignature_evidence',
  'contract_consents',
] as const;

/** Preview eligibility only. The amendment transaction checks these rules under lock. */
export async function canAmendAcceptedBid(
  job: {
    id: string;
    status: string;
    contractor_id: string | null;
    homeowner_id: string;
    payer_user_id: string | null;
  },
  bid: {
    id: string;
    status: string;
    quote_id: string | null;
    amount: number | string;
  },
  contractorId: string
): Promise<boolean> {
  if (
    job.status !== 'assigned' ||
    job.contractor_id !== contractorId ||
    bid.status !== 'accepted' ||
    !bid.quote_id
  ) {
    return false;
  }

  const { data: contracts, error } = await serverSupabase
    .from('contracts')
    .select(
      'id,contractor_id,homeowner_id,quote_id,amount,status,homeowner_signed_at,contractor_signed_at,agreement_formed_at,cancellation_requested_at,cancellation_deadline'
    )
    .eq('job_id', job.id)
    .limit(2);
  if (error || contracts?.length !== 1) return false;
  const [contract] = contracts;
  if (
    contract.contractor_id !== contractorId ||
    ![job.homeowner_id, job.payer_user_id].includes(contract.homeowner_id) ||
    contract.quote_id !== bid.quote_id ||
    Number(contract.amount) !== Number(bid.amount) ||
    !['draft', 'pending_contractor', 'pending_homeowner'].includes(
      contract.status
    ) ||
    contract.homeowner_signed_at ||
    contract.contractor_signed_at ||
    contract.agreement_formed_at ||
    contract.cancellation_requested_at ||
    contract.cancellation_deadline
  )
    return false;

  const [quote, accepted, ...blockers] = await Promise.all([
    serverSupabase
      .from('current_contractor_quotes')
      .select('total_amount')
      .eq('id', bid.quote_id)
      .eq('contractor_id', contractorId)
      .eq('job_id', job.id)
      .eq('status', 'accepted')
      .maybeSingle(),
    serverSupabase
      .from('bids')
      .select('id')
      .eq('job_id', job.id)
      .eq('status', 'accepted')
      .limit(2),
    ...financialTables.map((table) =>
      serverSupabase.from(table).select('job_id').eq('job_id', job.id).limit(1)
    ),
    ...consentTables.map((table) =>
      serverSupabase
        .from(table)
        .select('contract_id')
        .eq('contract_id', contract.id)
        .limit(1)
    ),
    serverSupabase
      .from('contract_signatories')
      .select('contract_id')
      .eq('contract_id', contract.id)
      .not('signed_at', 'is', null)
      .limit(1),
  ]);

  return (
    !quote.error &&
    !!quote.data &&
    Number(quote.data.total_amount) === Number(bid.amount) &&
    !accepted.error &&
    accepted.data?.length === 1 &&
    accepted.data[0].id === bid.id &&
    blockers.every((result) => !result.error && result.data?.length === 0)
  );
}
