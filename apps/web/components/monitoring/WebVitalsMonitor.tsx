'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { useCallback } from 'react';
import { reportWebVitals } from '@/lib/performance/web-vitals';

/**
 * Captures Core Web Vitals (CLS, FID, LCP, TTFB, INP, FCP) via the
 * Next.js `useReportWebVitals` hook and routes them through the
 * central `reportWebVitals` handler.
 *
 * Rendered once in the root layout -- no visible UI.
 */
export function WebVitalsMonitor() {
  const handleMetric = useCallback((metric: { name: string; value: number; delta?: number; id: string; rating?: string }) => {
    reportWebVitals(metric);
  }, []);

  useReportWebVitals(handleMetric);

  // No visible output -- this component exists solely for its side-effect.
  return null;
}