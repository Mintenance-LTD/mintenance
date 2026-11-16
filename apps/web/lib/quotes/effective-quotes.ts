import { serverSupabase } from '@/lib/api/supabaseServer';
import { collectRows } from '@/lib/db/collect-rows';
import { effectiveQuoteStatus } from './quote-status';

/** Use the linked bid outcome and expiry consistently on every contractor surface. */
export async function withEffectiveQuoteStatuses<
  T extends { id: string; status: string; valid_until?: string | null },
>(quotes: T[], contractorId: string): Promise<T[]> {
  const statuses = new Map<string, string>();
  for (let offset = 0; offset < quotes.length; offset += 500) {
    const ids = quotes.slice(offset, offset + 500).map((q) => q.id);
    const bids = await collectRows<{ quote_id: string; status: string }>(
      (from, to) =>
        serverSupabase
          .from('bids')
          .select('quote_id, status')
          .eq('contractor_id', contractorId)
          .in('quote_id', ids)
          .order('updated_at')
          .order('id')
          .range(from, to)
    );
    for (const bid of bids)
      if (statuses.get(bid.quote_id) !== 'accepted')
        statuses.set(bid.quote_id, bid.status);
  }
  return quotes.map((q) => ({
    ...q,
    status: effectiveQuoteStatus(q, statuses.get(q.id)),
  }));
}
