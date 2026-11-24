import { serverSupabase } from '@/lib/api/supabaseServer';

/** Gross customer payments released for this contractor's assigned jobs.
 * This is neither a job budget nor the contractor's net bank payout.
 */
export async function getReleasedCustomerPayments(
  contractorId: string,
  jobIds: string[]
): Promise<Map<string, number>> {
  return (await getCustomerPayments(contractorId, jobIds, false)).released;
}

const releasedStatuses = ['released', 'completed'];
const openStatuses = ['disputed', 'pending_review', 'release_pending', 'awaiting_homeowner_approval', 'held', 'pending'];

export async function getCustomerPayments(contractorId: string, jobIds: string[], includeOpen = true) {
  const totals = new Map<string, number>();
  const open = new Map<string, string>();
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
        .in('status', includeOpen ? [...releasedStatuses, ...openStatuses] : releasedStatuses)
        .order('id')
        .range(page * 500, page * 500 + 499);
      if (error) throw new Error('Released customer payments unavailable');
      for (const row of data ?? []) {
        if (row.payee_id !== contractorId || !allowed.has(row.job_id)) continue;
        if (!releasedStatuses.includes(row.status)) {
          const priority = openStatuses.indexOf(row.status);
          const current = openStatuses.indexOf(open.get(row.job_id) ?? '');
          if (includeOpen && priority >= 0 && (current < 0 || priority < current)) open.set(row.job_id, row.status);
          continue;
        }
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
  return { released: new Map([...totals].map(([id, minor]) => [id, minor / 100])), open };
}
