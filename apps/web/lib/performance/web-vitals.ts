/**
 * Web Vitals reporting utilities.
 *
 * This module processes Core Web Vitals metrics captured by
 * `useReportWebVitals` from `next/web-vitals` (see WebVitalsMonitor).
 *
 * No standalone `web-vitals` package is needed -- Next.js bundles it
 * internally and exposes the hook.
 */
import { logger } from '@mintenance/shared';

/** Shape of a Web Vital metric reported by Next.js */
interface WebVitalMetric {
  /** Metric name (CLS, FID, FCP, LCP, TTFB, INP) */
  name: string;
  /** Metric value */
  value: number;
  /** Delta since last report */
  delta?: number;
  /** Unique metric id */
  id: string;
  /** Rating: good, needs-improvement, poor */
  rating?: string;
}

/**
 * Thresholds for "poor" Core Web Vitals scores.
 * Based on https://web.dev/vitals/#core-web-vitals-thresholds
 */
const POOR_THRESHOLDS: Record<string, number> = {
  FCP: 1800, // First Contentful Paint (ms)
  LCP: 2500, // Largest Contentful Paint (ms)
  CLS: 0.1, // Cumulative Layout Shift (unitless)
  FID: 100, // First Input Delay (ms)
  TTFB: 600, // Time to First Byte (ms)
  INP: 200, // Interaction to Next Paint (ms)
};

/**
 * Send a metric to the Vercel Analytics endpoint (production only).
 * Falls back to `fetch` when `navigator.sendBeacon` is unavailable.
 */
function sendToAnalyticsEndpoint(metric: WebVitalMetric): void {
  const analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID;
  if (!analyticsId) return;

  const vitalsUrl = 'https://vitals.vercel-analytics.com/v1/vitals';
  const body = JSON.stringify({
    dsn: analyticsId,
    id: metric.id,
    page: window.location.pathname,
    href: window.location.href,
    event_name: metric.name,
    value: metric.value.toString(),
    speed:
      (navigator as Navigator & { connection?: { effectiveType?: string } })
        .connection?.effectiveType || '',
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(vitalsUrl, body);
  } else {
    fetch(vitalsUrl, {
      body,
      method: 'POST',
      credentials: 'omit',
      keepalive: true,
    });
  }
}

/**
 * Log metric to the browser console during development.
 * Uses colour-coded labels for quick visual scanning.
 */
function logMetricToConsole(metric: WebVitalMetric): void {
  const threshold = POOR_THRESHOLDS[metric.name];
  const isPoor = threshold !== undefined && metric.value > threshold;
  const colour = isPoor ? '#ef4444' : '#22c55e';
  const label = isPoor ? 'POOR' : 'GOOD';

  // eslint-disable-next-line no-console -- intentional dev-only diagnostic output
  console.log(
    `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${label})`,
    `color: ${colour}; font-weight: bold;`
  );
}

/**
 * Warn via the structured logger when a metric exceeds its "poor" threshold.
 * This fires in all environments so production issues surface in log aggregation.
 */
function warnOnPoorMetric(metric: WebVitalMetric): void {
  const threshold = POOR_THRESHOLDS[metric.name];
  if (threshold === undefined) return;

  if (metric.value > threshold) {
    logger.warn(`Poor ${metric.name} detected`, {
      name: metric.name,
      value: metric.value,
      threshold,
      page:
        typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      service: 'web-vitals',
    });
  }
}

/**
 * Central handler called for every Web Vital metric.
 * Used as the callback for `useReportWebVitals` in WebVitalsMonitor.
 */
export function reportWebVitals(metric: WebVitalMetric): void {
  // 1. Dev console output
  if (process.env.NODE_ENV === 'development') {
    logMetricToConsole(metric);
  }

  // 2. Structured logger warning for poor scores (all envs)
  warnOnPoorMetric(metric);

  // 3. Vercel Analytics endpoint (production with NEXT_PUBLIC_ANALYTICS_ID)
  if (process.env.NODE_ENV === 'production') {
    sendToAnalyticsEndpoint(metric);
  }
}
