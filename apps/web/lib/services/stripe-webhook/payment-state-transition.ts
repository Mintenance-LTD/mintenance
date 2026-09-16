import { serverSupabase } from '@/lib/api/supabaseServer';

interface PaymentEscrow {
  id: string;
  job_id: string;
  payer_id: string;
  payee_id: string;
  status: string;
  amount: number;
}

/** The database owns escrow/job locking and checks the trusted cash ledger. */
export async function applyPaymentIntentState(
  intentId: string,
  outcome: 'succeeded' | 'failed' | 'canceled',
  cashMinor?: number,
  currency?: string
): Promise<PaymentEscrow | null> {
  const { data, error } = await serverSupabase.rpc(
    'apply_payment_intent_state',
    {
      p_intent_id: intentId,
      p_outcome: outcome,
      p_cash_minor: cashMinor ?? null,
      p_currency: currency ?? null,
    }
  );
  if (error || !Array.isArray(data)) {
    throw new Error('Failed to persist atomic payment state');
  }
  return (data[0] as PaymentEscrow | undefined) ?? null;
}
