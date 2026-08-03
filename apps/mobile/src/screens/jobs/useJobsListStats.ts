/**
 * KPI stats + filter-tab counts for the jobs list.
 *
 * Moved verbatim out of JobsScreen when the property filter landed — the
 * screen sat at 499 lines against the 500-line cap, and these two memos are
 * the most self-contained block in it. No behaviour change intended.
 */

import { useMemo } from 'react';
import type { Job } from '@mintenance/types';
import type { FilterStatus, JobStats } from './types';

export function useJobsListStats(allJobs: Job[], bidPendingJobs: Job[]) {
  const stats: JobStats = useMemo(() => {
    const now = Date.now();
    let newToday = 0;
    let totalBudget = 0;
    let budgetCount = 0;
    let activeCount = 0;
    let totalBids = 0;
    let completedCount = 0;
    let postedCount = 0;

    // Defensive coercion against server NUMERIC-as-string regressions
    // (route fixed 2026-05-22; guards "AVG VALUE" KPI from `+=` on string).
    const toNum = (v: unknown): number | null => {
      if (v == null) return null;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    };

    allJobs.forEach((j) => {
      const age =
        (now - new Date(j.created_at || j.createdAt || now).getTime()) /
        (1000 * 3600 * 24);
      if (age < 1) newToday++;
      const b = toNum(j.budget) ?? toNum(j.budget_min) ?? 0;
      if (b > 0) {
        totalBudget += b;
        budgetCount++;
      }
      if (j.status === 'in_progress') activeCount++;
      if (j.status === 'completed') completedCount++;
      if (j.status === 'posted') postedCount++;
      if (j.bids) totalBids += j.bids.length;
    });

    return {
      total: allJobs.length,
      newToday,
      avgBudget: budgetCount > 0 ? Math.round(totalBudget / budgetCount) : 0,
      activeCount,
      totalBids,
      completedCount,
      postedCount,
    };
  }, [allJobs]);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      all: allJobs.length,
      posted: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      bid: bidPendingJobs.length,
      active: 0,
    };
    allJobs.forEach((j) => {
      const s = j.status as FilterStatus;
      if (s in counts) counts[s]++;
      // "active" = assigned + in_progress for contractors
      if (s === 'in_progress' || s === 'assigned') counts.active++;
    });
    return counts;
  }, [allJobs, bidPendingJobs]);

  return { stats, filterCounts };
}
