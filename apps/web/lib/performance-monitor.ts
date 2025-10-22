/**
 * Performance Monitoring Utilities for Web App
 * Collects and tracks Core Web Vitals and custom performance metrics
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface PerformanceBudget {
  metric: string;
  warning: number;
  error: number;
  unit: string;
}

export interface PerformanceData {
  metrics: PerformanceMetric[];
  budgets: PerformanceBudget[];
  violations: Array<{
    metric: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'critical';
  }>;
  healthScore: number;
}

// Performance budgets for web app
export const PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  { metric: 'FCP', warning: 1500, error: 2000, unit: 'ms' },
  { metric: 'LCP', warning: 2500, error: 3000, unit: 'ms' },
  { metric: 'FID', warning: 100, error: 300, unit: 'ms' },
  { metric: 'CLS', warning: 0.1, error: 0.25, unit: '' },
  { metric: 'TTFB', warning: 600, error: 1000, unit: 'ms' },
  { metric: 'INP', warning: 200, error: 500, unit: 'ms' },
];

/**
 * Get rating for a metric value based on budget
 */
export function getMetricRating(
  value: number,
  budget: PerformanceBudget
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= budget.warning) return 'good';
  if (value <= budget.error) return 'needs-improvement';
  return 'poor';
}

/**
 * Calculate health score (0-100) based on metrics
 */
export function calculateHealthScore(metrics: PerformanceMetric[]): number {
  if (metrics.length === 0) return 100;

  let score = 100;
  let goodCount = 0;
  let needsImprovementCount = 0;
  let poorCount = 0;

  metrics.forEach(metric => {
    if (metric.rating === 'good') goodCount++;
    else if (metric.rating === 'needs-improvement') needsImprovementCount++;
    else poorCount++;
  });

  const total = metrics.length;
  score =
    (goodCount / total) * 100 -
    (needsImprovementCount / total) * 30 -
    (poorCount / total) * 50;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Collect Core Web Vitals using the Web Vitals library
 */
export function collectCoreWebVitals(): Promise<PerformanceMetric[]> {
  return new Promise(resolve => {
    const metrics: PerformanceMetric[] = [];

    // Use Performance Observer API to collect metrics
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Collect FCP (First Contentful Paint)
      try {
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(
          entry => entry.name === 'first-contentful-paint'
        );
        if (fcpEntry) {
          const budget = PERFORMANCE_BUDGETS.find(b => b.metric === 'FCP')!;
          metrics.push({
            name: 'FCP',
            value: Math.round(fcpEntry.startTime),
            rating: getMetricRating(fcpEntry.startTime, budget),
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('Error collecting FCP:', error);
      }

      // Collect TTFB (Time to First Byte)
      try {
        const navEntry = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        if (navEntry) {
          const ttfb = navEntry.responseStart - navEntry.requestStart;
          const budget = PERFORMANCE_BUDGETS.find(b => b.metric === 'TTFB')!;
          metrics.push({
            name: 'TTFB',
            value: Math.round(ttfb),
            rating: getMetricRating(ttfb, budget),
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('Error collecting TTFB:', error);
      }

      // Collect LCP using PerformanceObserver
      try {
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            const budget = PERFORMANCE_BUDGETS.find(b => b.metric === 'LCP')!;
            metrics.push({
              name: 'LCP',
              value: Math.round(lastEntry.renderTime || lastEntry.loadTime),
              rating: getMetricRating(
                lastEntry.renderTime || lastEntry.loadTime,
                budget
              ),
              timestamp: Date.now(),
            });
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (error) {
        console.error('Error collecting LCP:', error);
      }

      // Collect FID using PerformanceObserver
      try {
        const fidObserver = new PerformanceObserver(list => {
          list.getEntries().forEach((entry: any) => {
            const budget = PERFORMANCE_BUDGETS.find(b => b.metric === 'FID')!;
            metrics.push({
              name: 'FID',
              value: Math.round(entry.processingStart - entry.startTime),
              rating: getMetricRating(
                entry.processingStart - entry.startTime,
                budget
              ),
              timestamp: Date.now(),
            });
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (error) {
        console.error('Error collecting FID:', error);
      }

      // Collect CLS using PerformanceObserver
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver(list => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          const budget = PERFORMANCE_BUDGETS.find(b => b.metric === 'CLS')!;
          metrics.push({
            name: 'CLS',
            value: Math.round(clsValue * 1000) / 1000,
            rating: getMetricRating(clsValue, budget),
            timestamp: Date.now(),
          });
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (error) {
        console.error('Error collecting CLS:', error);
      }

      // Wait a bit for metrics to be collected
      setTimeout(() => {
        resolve(metrics);
      }, 1000);
    } else {
      resolve([]);
    }
  });
}

/**
 * Collect custom performance metrics
 */
export function collectCustomMetrics(): PerformanceMetric[] {
  const metrics: PerformanceMetric[] = [];

  if (typeof window === 'undefined') return metrics;

  // Measure DOM Content Loaded time
  try {
    const navEntry = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    if (navEntry) {
      const domContentLoaded =
        navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
      metrics.push({
        name: 'DOMContentLoaded',
        value: Math.round(domContentLoaded),
        rating: domContentLoaded < 1000 ? 'good' : domContentLoaded < 2000 ? 'needs-improvement' : 'poor',
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error('Error collecting DOM metrics:', error);
  }

  // Measure resource count
  try {
    const resources = performance.getEntriesByType('resource');
    metrics.push({
      name: 'ResourceCount',
      value: resources.length,
      rating: resources.length < 50 ? 'good' : resources.length < 100 ? 'needs-improvement' : 'poor',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error collecting resource metrics:', error);
  }

  return metrics;
}

/**
 * Get all performance data
 */
export async function getPerformanceData(): Promise<PerformanceData> {
  const coreMetrics = await collectCoreWebVitals();
  const customMetrics = collectCustomMetrics();
  const allMetrics = [...coreMetrics, ...customMetrics];

  // Check for budget violations
  const violations: PerformanceData['violations'] = [];
  allMetrics.forEach(metric => {
    const budget = PERFORMANCE_BUDGETS.find(b => b.metric === metric.name);
    if (budget) {
      if (metric.value > budget.error) {
        violations.push({
          metric: metric.name,
          value: metric.value,
          threshold: budget.error,
          severity: 'critical',
        });
      } else if (metric.value > budget.warning) {
        violations.push({
          metric: metric.name,
          value: metric.value,
          threshold: budget.warning,
          severity: 'warning',
        });
      }
    }
  });

  return {
    metrics: allMetrics,
    budgets: PERFORMANCE_BUDGETS,
    violations,
    healthScore: calculateHealthScore(allMetrics),
  };
}

/**
 * Store performance data in localStorage
 */
export function storePerformanceData(data: PerformanceData): void {
  if (typeof window === 'undefined') return;

  try {
    const history = getPerformanceHistory();
    history.push({
      timestamp: Date.now(),
      healthScore: data.healthScore,
      violations: data.violations.length,
    });

    // Keep only last 50 entries
    const trimmed = history.slice(-50);
    localStorage.setItem('performance-history', JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error storing performance data:', error);
  }
}

/**
 * Get performance history from localStorage
 */
export function getPerformanceHistory(): Array<{
  timestamp: number;
  healthScore: number;
  violations: number;
}> {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem('performance-history');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading performance history:', error);
    return [];
  }
}

/**
 * Report performance metric to analytics
 */
export function reportPerformanceMetric(metric: PerformanceMetric): void {
  // This would integrate with your analytics service (e.g., Google Analytics, Sentry)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'web_vitals', {
      event_category: 'Web Vitals',
      event_label: metric.name,
      value: Math.round(metric.value),
      metric_rating: metric.rating,
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${metric.name}: ${metric.value}ms (${metric.rating})`);
  }
}
