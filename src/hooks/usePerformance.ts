import { useEffect, useRef, useCallback } from 'react';
import { performanceMonitor, PerformanceMetrics } from '../utils/performanceMonitor';
import { logger } from '../utils/logger';

export const usePerformance = () => {
  const navigationStartRef = useRef<number>();
  const apiTimersRef = useRef<Map<string, number>>(new Map());

  // Track navigation performance
  const trackNavigation = useCallback((screenName: string) => {
    performanceMonitor.startNavigationTimer();
    
    // Auto-record navigation time after a brief delay
    setTimeout(() => {
      performanceMonitor.recordNavigationTime(screenName);
    }, 100);
  }, []);

  // Track API call performance
  const trackApiCall = useCallback((requestId: string, endpoint: string) => {
    performanceMonitor.startApiTimer(requestId);
    
    return () => {
      performanceMonitor.recordApiResponseTime(requestId, endpoint);
    };
  }, []);

  // Get current metrics
  const getMetrics = useCallback((): PerformanceMetrics => {
    return performanceMonitor.getMetrics();
  }, []);

  // Get budget status
  const getBudgetStatus = useCallback(() => {
    return performanceMonitor.getBudgetStatus();
  }, []);

  // Generate performance report
  const generateReport = useCallback(() => {
    return performanceMonitor.generateReport();
  }, []);

  return {
    trackNavigation,
    trackApiCall,
    getMetrics,
    getBudgetStatus,
    generateReport,
    recordMemoryUsage: () => performanceMonitor.recordMemoryUsage(),
    recordFPS: (fps: number) => performanceMonitor.recordFPS(fps),
  };
};

// Hook for FPS monitoring
export const useFPSMonitoring = (enabled: boolean = __DEV__) => {
  const frameCount = useRef(0);
  const lastTime = useRef(Date.now());
  const animationFrameId = useRef<number>();

  const measureFPS = useCallback(() => {
    frameCount.current++;
    const currentTime = Date.now();
    
    if (currentTime - lastTime.current >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / (currentTime - lastTime.current));
      performanceMonitor.recordFPS(fps);
      
      frameCount.current = 0;
      lastTime.current = currentTime;
    }

    if (enabled) {
      animationFrameId.current = requestAnimationFrame(measureFPS);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      animationFrameId.current = requestAnimationFrame(measureFPS);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [enabled, measureFPS]);
};

// Hook for memory monitoring
export const useMemoryMonitoring = (intervalMs: number = 60000) => {
  useEffect(() => {
    const interval = setInterval(() => {
      performanceMonitor.recordMemoryUsage();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);
};

// Hook for startup time tracking
export const useStartupTime = () => {
  useEffect(() => {
    // Record startup time once component mounts
    const timer = setTimeout(() => {
      performanceMonitor.recordStartupTime();
    }, 100);

    return () => clearTimeout(timer);
  }, []);
};