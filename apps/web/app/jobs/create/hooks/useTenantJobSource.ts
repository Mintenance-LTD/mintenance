'use client';

import { useEffect, useState } from 'react';
import {
  formDataPatchFromParams,
  initialFormDataFromParams,
} from '../utils/url-prefill';
import type { JobFormData } from '../utils/validation';

export interface ReportDraftPhoto {
  slot: number;
  url: string;
}

type Source = { key: string } & (
  | { jobId: string }
  | { error: string }
  | { form: JobFormData; photos: ReportDraftPhoto[] | null }
);

export function useTenantJobSource(reportId?: string, userId?: string) {
  const key = reportId && userId ? `${userId}:${reportId}` : null;
  const [result, setResult] = useState<Source>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!key || !reportId) return;
    const controller = new AbortController();
    const search = new URLSearchParams({ reportId });
    void (async () => {
      try {
        const response = await fetch(
          `/api/landlord/reports/job-draft?${search}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error('Report unavailable');
        const source = await response.json();
        if (controller.signal.aborted) return;
        if (source.jobId) {
          setResult({ key, jobId: source.jobId });
          return;
        }
        const fields = formDataPatchFromParams(
          new URLSearchParams({
            category: source.category,
            urgency: source.urgency,
          })
        );
        setResult({
          key,
          form: {
            ...initialFormDataFromParams(null),
            ...fields,
            property_id: source.propertyId,
            location: source.location || '',
            description: source.description || '',
            is_rental_property: true,
          },
          photos: source.photos,
        });
      } catch {
        if (!controller.signal.aborted)
          setResult({
            key,
            error: 'Could not open this report as a job draft.',
          });
      }
    })();
    return () => controller.abort();
  }, [key, reportId, attempt]);

  return {
    source: result && result.key === key ? result : undefined,
    retry: () => setAttempt((value) => value + 1),
  };
}
