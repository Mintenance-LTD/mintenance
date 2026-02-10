// @ts-expect-error web-vitals package is not installed - will be resolved when package is added
import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';
import { logger } from '@mintenance/shared';

const vitalsUrl = 'https://vitals.vercel-analytics.com/v1/vitals';

function sendToAnalytics(metric: { name: string; value: number; delta?: number; id: string }) {
  const body = JSON.stringify({
    dsn: process.env.NEXT_PUBLIC_ANALYTICS_ID,
    id: metric.id,
    page: window.location.pathname,
    href: window.location.href,
    event_name: metric.name,
    value: metric.value.toString(),
    speed: (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType || '',
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

export function reportWebVitals(metric: { name: string; value: number; delta?: number; id: string }) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    ;
  }

  // Send to analytics
  sendToAnalytics(metric);

  // Report to performance monitoring service
  switch (metric.name) {
    case 'FCP':
      // First Contentful Paint
      if (metric.value > 1800) {
        logger.warn('Poor FCP detected', { value: metric.value, service: 'web-vitals' });
      }
      break;
    case 'LCP':
      // Largest Contentful Paint
      if (metric.value > 2500) {
        logger.warn('Poor LCP detected', { value: metric.value, service: 'web-vitals' });
      }
      break;
    case 'CLS':
      // Cumulative Layout Shift
      if (metric.value > 0.1) {
        logger.warn('Poor CLS detected', { value: metric.value, service: 'web-vitals' });
      }
      break;
    case 'FID':
      // First Input Delay
      if (metric.value > 100) {
        logger.warn('Poor FID detected', { value: metric.value, service: 'web-vitals' });
      }
      break;
    case 'TTFB':
      // Time to First Byte
      if (metric.value > 600) {
        logger.warn('Poor TTFB detected', { value: metric.value, service: 'web-vitals' });
      }
      break;
    case 'INP':
      // Interaction to Next Paint
      if (metric.value > 200) {
        logger.warn('Poor INP detected', { value: metric.value, service: 'web-vitals' });
      }
      break;
  }
}

// Initialize monitoring
export function initWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onINP(sendToAnalytics);
}
