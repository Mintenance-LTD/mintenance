'use client';

/**
 * Save / skip actions for the contractor Discover feed.
 *
 * Split out of ContractorDiscoverClient.tsx on 2026-07-20 — that file passed
 * the 500-line pre-commit gate, and this is a self-contained slice: the
 * network calls, their CSRF header, the optimistic set updates and the
 * success/failure toasts. The client keeps layout, filtering and the map.
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { logger } from '@mintenance/shared';
import { getCsrfToken } from '@/lib/csrf-client';

export function useDiscoverJobActions() {
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [skippedJobIds, setSkippedJobIds] = useState<Set<string>>(new Set());
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [loadingSavedJobs, setLoadingSavedJobs] = useState(true);

  useEffect(() => {
    fetch('/api/contractor/saved-jobs')
      .then((r) => r.json())
      .then((d) => setSavedJobIds(new Set<string>(d.jobIds || [])))
      .catch((err) =>
        logger.error('Error loading saved jobs', err, { service: 'ui' })
      )
      .finally(() => setLoadingSavedJobs(false));
  }, []);

  const handleSaveToggle = async (jobId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActionLoadingId(jobId);
    const wasSaved = savedJobIds.has(jobId);
    try {
      const res = await fetch(
        wasSaved
          ? `/api/contractor/saved-jobs?jobId=${jobId}`
          : '/api/contractor/saved-jobs',
        {
          method: wasSaved ? 'DELETE' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': await getCsrfToken(),
          },
          body: wasSaved ? undefined : JSON.stringify({ jobId }),
        }
      );
      // 409 means "already in that state" — treat as success, not an error.
      if (!res.ok && res.status !== 409) throw new Error('Request failed');
      setSavedJobIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) {
          next.delete(jobId);
        } else {
          next.add(jobId);
        }
        return next;
      });
      toast.success(wasSaved ? 'Job removed from saved' : 'Job saved!');
    } catch {
      toast.error(wasSaved ? 'Failed to unsave job' : 'Failed to save job');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSkip = (jobId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSkippedJobIds((prev) => new Set(prev).add(jobId));
  };

  /** "Review again" — clear both local sets so skipped jobs reappear. */
  const resetReviewed = () => {
    setSavedJobIds(new Set());
    setSkippedJobIds(new Set());
  };

  return {
    savedJobIds,
    skippedJobIds,
    actionLoadingId,
    loadingSavedJobs,
    handleSaveToggle,
    handleSkip,
    resetReviewed,
  };
}
