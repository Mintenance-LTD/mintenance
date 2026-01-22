import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

const vitalsUrl = 'https://vitals.vercel-analytics.com/v1/vitals';

function sendToAnalytics(metric: { name: string; value: number; delta?: number; id: string }) {
  const body = JSON.stringify({
    dsn: process.env.NEXT_PUBLIC_ANALYTICS_ID,
    id: metric.id,
    page: window.location.pathname,
    href: window.location.href,
    event_name: metric.name,
    value: metric.value.toString(),
    speed: navigator.connection?.effectiveType || '',
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
        :', metric.value);
      }
      break;
    case 'LCP':
      // Largest Contentful Paint
      if (metric.value > 2500) {
        :', metric.value);
      }
      break;
    case 'CLS':
      // Cumulative Layout Shift
      if (metric.value > 0.1) {
        :', metric.value);
      }
      break;
    case 'FID':
      // First Input Delay
      if (metric.value > 100) {
        :', metric.value);
      }
      break;
    case 'TTFB':
      // Time to First Byte
      if (metric.value > 600) {
        :', metric.value);
      }
      break;
    case 'INP':
      // Interaction to Next Paint
      if (metric.value > 200) {
        :', metric.value);
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
