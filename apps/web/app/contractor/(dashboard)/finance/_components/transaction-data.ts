import { platformFeeBreakdown } from '@mintenance/shared';
import { recordedContractorPayout } from '@/lib/contractor/financial-summary';
import type { Transaction, EscrowTransaction } from './types';

export function transformPayments(
  payments: EscrowTransaction[],
  feeRate: number
): Transaction[] {
  return payments
    .map((p: EscrowTransaction) => {
      let mappedStatus: Transaction['status'] = p.status;
      if (p.status === 'released' || p.status === 'completed') {
        mappedStatus = 'released';
      } else if (p.status === 'pending') {
        mappedStatus = 'pending';
      } else if (p.status === 'refunded') {
        mappedStatus = 'refunded';
      }

      const jobTitle = p.job?.title || 'Payment';
      const clientName = p.payer
        ? `${p.payer.first_name || ''} ${p.payer.last_name || ''}`.trim() ||
          'Client'
        : 'Unknown';

      const settled = ['released', 'completed'].includes(p.status);
      const feesFinalized =
        settled && (p.contractorPayout != null || p.platformFee != null);
      const amount = Number(p.amount);
      const payable = !['failed', 'cancelled', 'refunded'].includes(p.status);
      const estimate = platformFeeBreakdown(
        payable ? (p.remainingAmount ?? amount) : 0,
        feeRate
      );
      const platformFee = feesFinalized
        ? (p.platformFee ?? amount - Number(p.contractorPayout))
        : estimate.platformFee;
      const processingFee = p.stripeProcessingFee ?? 0;
      const netAmount = feesFinalized
        ? recordedContractorPayout({
            amount,
            contractor_payout: p.contractorPayout,
            platform_fee: p.platformFee,
          })
        : estimate.netToContractor;

      return {
        id: p.id,
        jobId: p.jobId || p.job_id || '',
        jobTitle,
        client: clientName,
        amount,
        status: mappedStatus,
        date:
          (mappedStatus === 'released' ? p.releasedAt : null) ||
          p.createdAt ||
          p.created_at ||
          '',
        platformFee,
        processingFee,
        netAmount,
        feesFinalized,
        feeRate,
        remainingAmount: p.remainingAmount ?? amount,
      };
    })
    .sort(
      (a, b) =>
        (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0) ||
        b.id.localeCompare(a.id)
    );
}
