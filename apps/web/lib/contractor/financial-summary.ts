/** Escrow amounts are GBP, not pence. Only settled payments are earnings. */
export interface ContractorPayment {
  id: string;
  job_id: string;
  amount: number | string;
  status: string;
  contractor_payout?: number | string | null;
  platform_fee?: number | string | null;
  released_at?: string | null;
  created_at: string;
  remaining_minor?: number;
}

export const HELD_ESCROW_STATUSES = [
  'held',
  'release_pending',
  'awaiting_homeowner_approval',
  'pending_review',
  'disputed',
] as const;

export function recordedContractorPayout(
  payment: Pick<
    ContractorPayment,
    'amount' | 'contractor_payout' | 'platform_fee'
  >
): number {
  if (payment.contractor_payout == null && payment.platform_fee == null)
    throw new Error('Released payment fees require reconciliation.');
  const amount = Number(payment.amount);
  const payout = Number(
    payment.contractor_payout ?? amount - Number(payment.platform_fee)
  );
  if (
    !Number.isFinite(amount) ||
    !Number.isFinite(payout) ||
    payout < 0 ||
    payout > amount
  )
    throw new Error('Released payment amounts require reconciliation.');
  return Math.round(payout * 100) / 100;
}

function monthKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`;
}

export function contractorFinancialSummary(
  payments: ContractorPayment[],
  now = new Date()
) {
  const settled = payments.filter((p) =>
    ['released', 'completed'].includes(p.status)
  );
  const held = payments.filter((p) =>
    (HELD_ESCROW_STATUSES as readonly string[]).includes(p.status)
  );
  const sum = (rows: ContractorPayment[]) =>
    rows.reduce(
      (total, p) => total + Math.round(recordedContractorPayout(p) * 100),
      0
    ) / 100;
  const currentMonth = monthKey(now);
  const [year, month] = currentMonth.split('-').map(Number);
  const previousMonth = monthKey(new Date(Date.UTC(year, month - 2, 15)));
  const inMonth = (key: string) =>
    settled.filter(
      (p) => p.released_at && monthKey(new Date(p.released_at)) === key
    );
  const thisMonthRevenue = sum(inMonth(currentMonth));
  const previousMonthRevenue = sum(inMonth(previousMonth));
  const allTimeRevenue = sum(settled);
  const paidJobs = new Set(settled.map((p) => p.job_id)).size;
  const pendingPayouts =
    held.reduce((total, p) => {
      const grossMinor = Math.round(Number(p.amount) * 100);
      const remaining = p.remaining_minor ?? grossMinor;
      if (
        !Number.isSafeInteger(remaining) ||
        remaining < 0 ||
        remaining > grossMinor
      )
        throw new Error('Held payment balance requires reconciliation.');
      return total + remaining;
    }, 0) / 100;
  return {
    allTimeRevenue,
    thisMonthRevenue,
    pendingPayouts,
    heldCount: held.length,
    avgJobValue: paidJobs
      ? Math.round((allTimeRevenue * 100) / paidJobs) / 100
      : 0,
    revenueChange:
      previousMonthRevenue > 0
        ? ((thisMonthRevenue - previousMonthRevenue) / previousMonthRevenue) *
          100
        : 0,
    monthlyRevenue: Array.from({ length: 6 }, (_, i) => {
      const date = new Date(Date.UTC(year, month - 6 + i, 15));
      const rows = inMonth(monthKey(date));
      return {
        year: date.getUTCFullYear(),
        monthKey: monthKey(date),
        month: date.toLocaleDateString('en-GB', {
          month: 'short',
          timeZone: 'Europe/London',
        }),
        revenue: sum(rows),
        jobs: new Set(rows.map((p) => p.job_id)).size,
      };
    }),
  };
}

export type ContractorFinancialSummary = ReturnType<
  typeof contractorFinancialSummary
> & { feeRate: number };
