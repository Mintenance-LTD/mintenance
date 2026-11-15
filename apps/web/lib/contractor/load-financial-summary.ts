import 'server-only';
import { platformFeeRateForTier } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { collectRows } from '@/lib/db/collect-rows';
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';
import {
  contractorFinancialSummary,
  type ContractorPayment,
} from './financial-summary';

/** Caller supplies the authenticated contractor ID, never a request parameter. */
export async function loadContractorFinancialSummary(contractorId: string) {
  const [payments, tier] = await Promise.all([
    collectRows<ContractorPayment>((from, to) =>
      serverSupabase
        .from('escrow_transactions')
        .select(
          'id, job_id, amount, status, contractor_payout, platform_fee, released_at, created_at'
        )
        .eq('payee_id', contractorId)
        .order('id')
        .range(from, to)
    ),
    FeeCalculationService.resolveContractorTier(contractorId),
  ]);
  // Read balances only for escrow IDs already scoped to this contractor.
  for (let offset = 0; offset < payments.length; offset += 500) {
    const batch = payments.slice(offset, offset + 500);
    const { data, error } = await serverSupabase
      .from('escrow_refund_balances')
      .select('escrow_id, remaining_minor, needs_review')
      .in(
        'escrow_id',
        batch.map((p) => p.id)
      );
    if (error || data?.some((row) => row.needs_review))
      throw new Error('Payment balances require reconciliation.');
    const balances = new Map(
      (data ?? []).map((row) => [row.escrow_id, row.remaining_minor])
    );
    for (const payment of batch)
      payment.remaining_minor = balances.get(payment.id);
  }
  return {
    ...contractorFinancialSummary(payments),
    feeRate: platformFeeRateForTier(tier),
  };
}
