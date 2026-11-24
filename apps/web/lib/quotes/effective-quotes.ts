import { serverSupabase } from '@/lib/api/supabaseServer';
import { collectRows } from '@/lib/db/collect-rows';
import { effectiveQuoteStatus } from './quote-status';
import { loadContractorJobActions } from '@/lib/contractor/load-job-actions';

export interface QuoteLinkedJob {
  id: string;
  nextStep: string;
}

const jobStatusLabel: Record<string, string> = {
  in_progress: 'Work in progress',
  completed: 'Job completed',
  cancelled: 'Job cancelled',
};

/** Use the linked bid outcome and expiry consistently on every contractor surface. */
export async function withEffectiveQuoteStatuses<
  T extends { id: string; status: string; valid_until?: string | null },
>(
  quotes: T[],
  contractorId: string,
  includeJobs = false
): Promise<(T & { linkedJob?: QuoteLinkedJob })[]> {
  const linkedBids = new Map<string, { status: string; job_id: string }>();
  for (let offset = 0; offset < quotes.length; offset += 500) {
    const ids = quotes.slice(offset, offset + 500).map((q) => q.id);
    const bids = await collectRows<{
      quote_id: string;
      status: string;
      job_id: string;
    }>((from, to) =>
      serverSupabase
        .from('bids')
        .select('quote_id, status, job_id')
        .eq('contractor_id', contractorId)
        .in('quote_id', ids)
        .order('updated_at')
        .order('id')
        .range(from, to)
    );
    for (const bid of bids)
      if (linkedBids.get(bid.quote_id)?.status !== 'accepted')
        linkedBids.set(bid.quote_id, bid);
  }
  const effective = quotes.map((q) => ({
    ...q,
    status: effectiveQuoteStatus(q, linkedBids.get(q.id)?.status),
  }));
  if (!includeJobs) return effective;

  const ids = Array.from(
    new Set(
      effective.flatMap((quote) => {
        const bid = linkedBids.get(quote.id);
        return quote.status === 'accepted' && bid?.job_id ? [bid.job_id] : [];
      })
    )
  );
  const jobs: { id: string; status: string }[] = [];
  const nextSteps = new Map<string, string>();
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = await collectRows<{ id: string; status: string }>(
      (from, to) =>
        serverSupabase
          .from('jobs')
          .select('id, status')
          .eq('contractor_id', contractorId)
          .in('id', ids.slice(offset, offset + 100))
          .order('id')
          .range(from, to)
    );
    const actions = await loadContractorJobActions(
      contractorId,
      batch.filter((job) =>
        ['assigned', 'in_progress', 'disputed'].includes(job.status)
      )
    );
    jobs.push(...batch);
    for (const [id, action] of actions) nextSteps.set(id, action.label);
  }
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  return effective.map((quote) => {
    const bid = linkedBids.get(quote.id);
    const job = bid && jobById.get(bid.job_id);
    if (quote.status !== 'accepted' || !job) return quote;
    return {
      ...quote,
      linkedJob: {
        id: job.id,
        nextStep:
          nextSteps.get(job.id) ??
          jobStatusLabel[job.status] ??
          'Review job details',
      },
    };
  });
}
