/**
 * Property filtering for the jobs list.
 *
 * Jobs have carried property_id since posting-from-a-property shipped, but no
 * screen could use it until the list API started returning the property. This
 * hook owns the selection state, the distinct-property list for the chip row,
 * and the filter itself. Client-side over the already-loaded list — no extra
 * requests.
 *
 * Split from JobsScreen alongside JobsPropertyChips (the screen sat at 499
 * lines against a 500-line cap before this feature).
 */

import { useCallback, useMemo, useState } from 'react';
import type { Job } from '@mintenance/types';
import type { JobPropertyOption } from './JobsPropertyChips';

export function useJobPropertyFilter(allJobs: Job[]) {
  // 'all' with a single-property account behaves exactly as before — the chip
  // row never renders below 2 distinct properties.
  const [propertyFilter, setPropertyFilter] = useState<string>('all');

  /** Distinct properties across the loaded jobs, for the chip row. */
  const jobProperties = useMemo<JobPropertyOption[]>(() => {
    const byId = new Map<string, string>();
    for (const j of allJobs) {
      if (j.property_id && j.propertyLabel && !byId.has(j.property_id)) {
        byId.set(j.property_id, j.propertyLabel);
      }
    }
    return Array.from(byId, ([id, label]) => ({ id, label }));
  }, [allJobs]);

  /**
   * Narrow a job list to the selected property. useCallback so consumers can
   * list it in their memo deps without recomputing every render.
   */
  const byProperty = useCallback(
    (jobs: Job[]): Job[] =>
      propertyFilter === 'all'
        ? jobs
        : jobs.filter((j) => j.property_id === propertyFilter),
    [propertyFilter]
  );

  return { propertyFilter, setPropertyFilter, jobProperties, byProperty };
}
