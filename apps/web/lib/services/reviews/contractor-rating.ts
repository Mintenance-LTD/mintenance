import type { SupabaseClient } from '@supabase/supabase-js';

export interface ContractorRatingStats {
  /** Mean star rating across all reviews; 0 when there are none. */
  average: number;
  /** Number of reviews counted. */
  count: number;
}

/**
 * Canonical "rating of a contractor" lookup.
 *
 * The `reviews` table identifies the person being reviewed via
 * `reviewee_id` — there is NO `reviews.contractor_id` column. Querying the
 * non-existent column threw `column reviews.contractor_id does not exist`
 * at the database and, because most callers used a `|| []` fallback, it
 * failed *silently*: trust scores, automated bid acceptance, dispute
 * resolution and the contractor daily-rundown all quietly behaved as if
 * every contractor had zero reviews. The same mistake was independently
 * re-written in 8 files.
 *
 * Centralising the query here means the column name lives in exactly one
 * place, so the bug cannot regress one file at a time.
 */
export async function getContractorRatingStats(
  db: SupabaseClient,
  contractorUserId: string
): Promise<ContractorRatingStats> {
  const { data } = await db
    .from('reviews')
    .select('rating')
    .eq('reviewee_id', contractorUserId);

  const rows = (data ?? []) as Array<{ rating: number | null }>;
  if (rows.length === 0) {
    return { average: 0, count: 0 };
  }
  const sum = rows.reduce((acc, r) => acc + (r.rating ?? 0), 0);
  return { average: sum / rows.length, count: rows.length };
}
