'use client';
import { useEffect, useState } from 'react';
import { readActionResponse } from '@/lib/api/read-action-response';
import type { ReworkRequest } from '@/lib/jobs/rework-evidence';

export function useJobRework(jobId: string, revision?: string | null) {
  const [requests, setRequests] = useState<ReworkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setRequests([]);
    fetch(`/api/jobs/${jobId}/rework`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((r) =>
        readActionResponse<{ requests: ReworkRequest[] }>(
          r,
          'Unable to load rework history. Reload before submitting or approving work.'
        )
      )
      .then((data) => {
        if (!Array.isArray(data.requests))
          throw new Error(
            'Unable to verify rework history. Reload before submitting or approving work.'
          );
        if (!controller.signal.aborted) setRequests(data.requests);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load rework history.'
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [jobId, revision]);
  return { requests, latest: requests[0], loading, error };
}
