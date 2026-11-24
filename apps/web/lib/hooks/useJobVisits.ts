'use client';

import { useEffect, useState } from 'react';
import type { VisitRecord } from '@/lib/scheduling/visit-history';
import { isValidUUID } from '@/lib/validation/uuid';

export function useJobVisits(jobId: string) {
  const [result, setResult] = useState<{
    jobId: string;
    visits: VisitRecord[];
    failed?: boolean;
  }>();
  useEffect(() => {
    if (!isValidUUID(jobId)) return;
    const abort = new AbortController();
    const query = new URLSearchParams({ view: 'job', jobId });
    fetch(`/api/appointments?${query}`, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load visit history');
        const { appointments } = await response.json();
        if (!Array.isArray(appointments))
          throw new Error('Unable to load visit history');
        if (!abort.signal.aborted) setResult({ jobId, visits: appointments });
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setResult({ jobId, visits: [], failed: true });
      });
    return () => abort.abort();
  }, [jobId]);
  return result?.jobId === jobId ? result : undefined;
}
