import { serverSupabase } from '@/lib/api/supabaseServer';

/** Gross customer payments released for this contractor's assigned jobs.
 * This is neither a job budget nor the contractor's net bank payout.
 */
export async function getReleasedCustomerPayments(
  contractorId: string,
  jobIds: string[]
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  const allowed = new Set(jobIds);
  const ids = [...allowed];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    for (let page = 0; ; page += 1) {
      const { data, error } = await serverSupabase
        .from('escrow_transactions')
        .select('id,job_id,payee_id,amount,status')
        .eq('payee_id', contractorId)
        .in('job_id', batch)
        .in('status', ['released', 'completed'])
        .order('id')
        .range(page * 500, page * 500 + 499);
      if (error) throw new Error('Released customer payments unavailable');
      for (const row of data ?? []) {
        if (row.payee_id !== contractorId || !allowed.has(row.job_id)) continue;
        if (!['released', 'completed'].includes(row.status)) continue;
        const amount = Number(row.amount);
        if (!Number.isFinite(amount) || amount < 0) continue;
        totals.set(
          row.job_id,
          (totals.get(row.job_id) ?? 0) + Math.round(amount * 100)
        );
      }
      if (!data || data.length < 500) break;
    }
  }
  return new Map([...totals].map(([id, minor]) => [id, minor / 100]));
}
