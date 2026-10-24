'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import {
  readJourney,
  writeJourney,
  type JourneyProgress,
} from '@/lib/onboarding/journey-state';

export function useJourneyProgress(userId: string, journey: string) {
  const [progress, setProgress] = useState<JourneyProgress | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const save = useCallback(
    (value: JourneyProgress) => {
      const requestRevision = ++revision.current;
      const pending = { ...value, pending: true };
      writeJourney(userId, journey, pending);
      setProgress(pending);
      setLoaded(true);
      // Preserve interaction order when Next/Finish are pressed quickly.
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          try {
            const response = await fetchWithCsrf('/api/onboarding/progress', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                journey,
                platform: 'web',
                status: value.status,
                step: value.step,
              }),
            });
            if (!response.ok) throw new Error('Save failed');
            if (requestRevision === revision.current) {
              const saved = { ...value, pending: false };
              writeJourney(userId, journey, saved);
              setProgress(saved);
              setError(null);
            }
          } catch {
            if (requestRevision === revision.current)
              setError(
                'Could not sync progress. Retry to save it to your account.'
              );
          }
        });
      return queue.current;
    },
    [userId, journey]
  );
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const loadRevision = revision.current;
      const local = readJourney(userId, journey);
      if (local?.pending) {
        setLoaded(true);
        await save(local);
        return;
      }
      try {
        const response = await fetch('/api/onboarding/progress', { signal });
        if (!response.ok) throw new Error('Load failed');
        const body = await response.json();
        if (signal?.aborted || loadRevision !== revision.current) return;
        const remote = body.progress.find(
          (row: { journey: string; platform: string }) =>
            row.journey === journey && row.platform === 'web'
        );
        const value = remote
          ? { status: remote.status, step: remote.step }
          : local;
        setProgress(value);
        if (value) writeJourney(userId, journey, value);
        setError(null);
      } catch {
        if (signal?.aborted || loadRevision !== revision.current) return;
        setProgress(local);
        setError(
          'Could not load account progress. You can continue here and retry syncing.'
        );
      }
      if (!signal?.aborted) setLoaded(true);
    },
    [userId, journey, save]
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const retry = () => {
      void load(controller.signal);
    };
    window.addEventListener('online', retry);
    return () => {
      controller.abort();
      window.removeEventListener('online', retry);
    };
  }, [load]);
  return { progress, loaded, error, save, retry: () => load() };
}
