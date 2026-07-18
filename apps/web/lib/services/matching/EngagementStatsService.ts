/**
 * EngagementStatsService — batch per-contractor bid statistics feeding
 * the fairness + responsiveness terms in ScoringService (Phase 3 of the
 * 2026-07-17 matching integration).
 *
 * One query for the whole candidate set (vs. the N+1 pattern used for
 * skills/reviews): bids joined to their job's created_at, aggregated in
 * JS. Missing data degrades to neutral scores in ScoringService — a
 * contractor with no bid history is neither boosted nor buried.
 */
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { ContractorEngagementStats } from './types';

/** Window for "recent wins" in the fairness term. */
export const FAIRNESS_RECENT_WINS_WINDOW_DAYS = 30;

/** Cap on bid rows fetched per batch — the candidate pool is <= 100. */
const MAX_BID_ROWS = 2000;

interface BidStatRow {
  contractor_id: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  job:
    | { created_at: string | null }
    | Array<{ created_at: string | null }>
    | null;
}

function jobCreatedAt(row: BidStatRow): string | null {
  if (!row.job) return null;
  return Array.isArray(row.job)
    ? (row.job[0]?.created_at ?? null)
    : row.job.created_at;
}

export class EngagementStatsService {
  /**
   * Fetch engagement stats for a set of contractors. Returns an empty
   * map on query failure — callers treat missing entries as "no data"
   * (neutral scoring), so a stats outage can never zero out matching.
   */
  static async fetchStats(
    contractorIds: string[]
  ): Promise<Map<string, ContractorEngagementStats>> {
    const stats = new Map<string, ContractorEngagementStats>();
    if (contractorIds.length === 0) return stats;

    const { data, error } = await serverSupabase
      .from('bids')
      .select(
        'contractor_id, status, created_at, updated_at, job:jobs(created_at)'
      )
      .in('contractor_id', contractorIds)
      .order('created_at', { ascending: false })
      .limit(MAX_BID_ROWS);

    if (error || !data) {
      logger.warn('EngagementStatsService: bid stats query failed', {
        service: 'matching',
        error: error?.message,
      });
      return stats;
    }

    const now = Date.now();
    const windowStart =
      now - FAIRNESS_RECENT_WINS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    interface Accumulator {
      recentWins: number;
      lastWinAt: number | null;
      responseHours: number[];
    }
    const acc = new Map<string, Accumulator>();

    for (const row of data as BidStatRow[]) {
      let a = acc.get(row.contractor_id);
      if (!a) {
        a = { recentWins: 0, lastWinAt: null, responseHours: [] };
        acc.set(row.contractor_id, a);
      }

      if (row.status === 'accepted') {
        // updated_at approximates acceptance time (bids flip status in
        // place); created_at is the fallback for legacy rows.
        const winAt = Date.parse(row.updated_at ?? row.created_at ?? '');
        if (Number.isFinite(winAt)) {
          if (winAt >= windowStart) a.recentWins += 1;
          if (a.lastWinAt === null || winAt > a.lastWinAt) a.lastWinAt = winAt;
        }
      }

      const bidAt = Date.parse(row.created_at ?? '');
      const postedAt = Date.parse(jobCreatedAt(row) ?? '');
      if (Number.isFinite(bidAt) && Number.isFinite(postedAt)) {
        const hours = (bidAt - postedAt) / (60 * 60 * 1000);
        // Negative deltas (clock skew / backfilled rows) are noise.
        if (hours >= 0) a.responseHours.push(hours);
      }
    }

    for (const [contractorId, a] of acc) {
      stats.set(contractorId, {
        recentWins: a.recentWins,
        daysSinceLastWin:
          a.lastWinAt === null
            ? null
            : Math.floor((now - a.lastWinAt) / (24 * 60 * 60 * 1000)),
        avgBidResponseHours:
          a.responseHours.length === 0
            ? null
            : a.responseHours.reduce((s, h) => s + h, 0) /
              a.responseHours.length,
      });
    }

    return stats;
  }
}
