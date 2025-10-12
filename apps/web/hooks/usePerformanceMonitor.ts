'use client';

import { useEffect, useState, useCallback } from 'react';

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
}

interface PerformanceMonitorOptions {
  enableWebVitals?: boolean;
  enableCustomMetrics?: boolean;
  enableResourceTiming?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  reportInterval?: number;
}

export const usePerformanceMonitor = (options: PerformanceMonitorOptions = {}) => {
  const {
    enableWebVitals = true,
    enableCustomMetrics = true,
    enableResourceTiming = true,
    onMetricsUpdate,
    reportInterval = 5000,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    navigationStart: 0,
    domContentLoaded: 0,
    loadComplete: 0,
  });

  const [isMonitoring, setIsMonitoring] = useState(false);

  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setMetrics(prev => {
      const updated = { ...prev, ...newMetrics };
      if (onMetricsUpdate) {
        onMetricsUpdate(updated);
      }
      return updated;
    });
  }, [onMetricsUpdate]);

  const measureWebVitals = useCallback(() => {
    if (!enableWebVitals || typeof window === 'undefined') return;

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        updateMetrics({ fcp: fcpEntry.startTime });
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        updateMetrics({ lcp: lastEntry.startTime });
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fidEntry = entries[0] as any;
      if (fidEntry && fidEntry.processingStart !== undefined) {
        updateMetrics({ fid: fidEntry.processingStart - fidEntry.startTime });
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      updateMetrics({ cls: clsValue });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
    };
  }, [enableWebVitals, updateMetrics]);

  const measureCustomMetrics = useCallback(() => {
    if (!enableCustomMetrics || typeof window === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as any;
    if (navigation) {
      updateMetrics({
        ttfb: navigation.responseStart - navigation.requestStart,
        navigationStart: navigation.startTime || 0,
        domContentLoaded: navigation.domContentLoadedEventEnd - (navigation.startTime || 0),
        loadComplete: navigation.loadEventEnd - (navigation.startTime || 0),
      });
    }
  }, [enableCustomMetrics, updateMetrics]);

  const measureResourceTiming = useCallback(() => {
    if (!enableResourceTiming || typeof window === 'undefined') return;

    const resources = performance.getEntriesByType('resource');
    const resourceMetrics = {
      totalResources: resources.length,
      totalSize: resources.reduce((sum, resource: any) => sum + (resource.transferSize || 0), 0),
      slowResources: resources.filter((resource: any) => resource.duration > 1000).length,
      failedResources: resources.filter((resource: any) => resource.transferSize === 0).length,
    };

    // You can extend this to track specific resource types
    const jsResources = resources.filter((resource: any) => resource.name.endsWith('.js'));
    const cssResources = resources.filter((resource: any) => resource.name.endsWith('.css'));
    const imageResources = resources.filter((resource: any) => 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(resource.name)
    );

    console.log('Resource Metrics:', {
      ...resourceMetrics,
      jsResources: jsResources.length,
      cssResources: cssResources.length,
      imageResources: imageResources.length,
    });
  }, [enableResourceTiming]);

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    
    // Start Web Vitals monitoring
    const cleanupWebVitals = measureWebVitals();
    
    // Measure initial metrics
    measureCustomMetrics();
    measureResourceTiming();

    // Set up periodic monitoring
    const interval = setInterval(() => {
      measureCustomMetrics();
      measureResourceTiming();
    }, reportInterval);

    return () => {
      if (cleanupWebVitals) cleanupWebVitals();
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, [measureWebVitals, measureCustomMetrics, measureResourceTiming, reportInterval]); // Removed isMonitoring from dependencies to prevent infinite loop

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const getPerformanceScore = useCallback(() => {
    const scores = {
      fcp: metrics.fcp ? (metrics.fcp < 1800 ? 100 : metrics.fcp < 3000 ? 80 : 60) : null,
      lcp: metrics.lcp ? (metrics.lcp < 2500 ? 100 : metrics.lcp < 4000 ? 80 : 60) : null,
      fid: metrics.fid ? (metrics.fid < 100 ? 100 : metrics.fid < 300 ? 80 : 60) : null,
      cls: metrics.cls ? (metrics.cls < 0.1 ? 100 : metrics.cls < 0.25 ? 80 : 60) : null,
    };

    const validScores = Object.values(scores).filter(score => score !== null);
    const averageScore = validScores.length > 0 
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
      : 0;

    return {
      overall: Math.round(averageScore),
      breakdown: scores,
    };
  }, [metrics]);

  const reportMetrics = useCallback(() => {
    const score = getPerformanceScore();
    
    console.group('Performance Metrics');
    console.log('Overall Score:', score.overall);
    console.log('Web Vitals:', {
      FCP: metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : 'N/A',
      LCP: metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : 'N/A',
      FID: metrics.fid ? `${metrics.fid.toFixed(2)}ms` : 'N/A',
      CLS: metrics.cls ? metrics.cls.toFixed(3) : 'N/A',
    });
    console.log('Navigation Timing:', {
      TTFB: metrics.ttfb ? `${metrics.ttfb.toFixed(2)}ms` : 'N/A',
      DOMContentLoaded: metrics.domContentLoaded ? `${metrics.domContentLoaded.toFixed(2)}ms` : 'N/A',
      LoadComplete: metrics.loadComplete ? `${metrics.loadComplete.toFixed(2)}ms` : 'N/A',
    });
    console.groupEnd();

    return { metrics, score };
  }, [metrics, getPerformanceScore]);

  useEffect(() => {
    const cleanup = startMonitoring();
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getPerformanceScore,
    reportMetrics,
  };
};

// Hook for monitoring specific component performance
export const useComponentPerformance = (componentName: string) => {
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const [mountTime, setMountTime] = useState<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();
    setMountTime(startTime);

    return () => {
      const endTime = performance.now();
      setRenderTime(endTime - startTime);
      
      console.log(`Component ${componentName} performance:`, {
        mountTime: startTime,
        renderTime: endTime - startTime,
      });
    };
  }, [componentName]);

  return {
    renderTime,
    mountTime,
  };
};

// Hook for monitoring API call performance
export const useApiPerformance = () => {
  const [apiMetrics, setApiMetrics] = useState<Array<{
    endpoint: string;
    duration: number;
    status: number;
    timestamp: number;
  }>>([]);

  const trackApiCall = useCallback(async <T>(
    endpoint: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setApiMetrics(prev => [...prev, {
        endpoint,
        duration,
        status: 200,
        timestamp: Date.now(),
      }]);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setApiMetrics(prev => [...prev, {
        endpoint,
        duration,
        status: 500,
        timestamp: Date.now(),
      }]);
      
      throw error;
    }
  }, []);

  const getApiPerformanceReport = useCallback(() => {
    const totalCalls = apiMetrics.length;
    const averageDuration = totalCalls > 0 
      ? apiMetrics.reduce((sum, metric) => sum + metric.duration, 0) / totalCalls 
      : 0;
    
    const slowCalls = apiMetrics.filter(metric => metric.duration > 1000);
    const failedCalls = apiMetrics.filter(metric => metric.status >= 400);
    
    return {
      totalCalls,
      averageDuration: Math.round(averageDuration),
      slowCalls: slowCalls.length,
      failedCalls: failedCalls.length,
      successRate: totalCalls > 0 ? ((totalCalls - failedCalls.length) / totalCalls * 100).toFixed(1) : '0',
    };
  }, [apiMetrics]);

  return {
    apiMetrics,
    trackApiCall,
    getApiPerformanceReport,
  };
};
