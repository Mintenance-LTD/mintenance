/**
 * Performance Tracker Module
 * Handles Core Web Vitals monitoring, analytics tracking,
 * user engagement, and performance metrics
 */

import { Platform } from 'react-native';
import { logger } from '../logger';
import { performanceMonitor } from '../performanceMonitor';
import { AnalyticsConfig, PerformanceMetrics, WebVital } from './types';

export class PerformanceTracker {
  private analyticsInitialized = false;
  private webVitals: Map<string, WebVital> = new Map();
  private scrollDepthTracked = new Set<number>();
  private sessionStartTime = Date.now();

  constructor(private config: AnalyticsConfig) {}

  /**
   * Initialize performance tracking
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'web') return;

    try {
      logger.info('PerformanceTracker', 'Initializing performance tracking');

      // Initialize analytics
      if (this.config.googleAnalyticsId) {
        await this.initializeGoogleAnalytics(this.config.googleAnalyticsId);
      }

      // Setup Core Web Vitals monitoring
      this.setupCoreWebVitals();

      // Setup user timing
      if (this.config.enableUserTiming) {
        this.setupUserTiming();
      }

      // Setup scroll depth tracking
      if (this.config.enableScrollDepthTracking) {
        this.setupScrollDepthTracking();
      }

      // Setup user engagement tracking
      this.setupUserEngagement();

      this.analyticsInitialized = true;

      logger.info('PerformanceTracker', 'Performance tracking initialized successfully');
    } catch (error) {
      logger.error('PerformanceTracker', 'Failed to initialize performance tracking', error);
    }
  }

  /**
   * Initialize Google Analytics 4
   */
  private async initializeGoogleAnalytics(analyticsId: string): Promise<void> {
    try {
      // Load GA4 script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsId}`;
      document.head.appendChild(script);

      // Initialize gtag
      (window as any).dataLayer = (window as any).dataLayer || [];
      const gtag = (...args: any[]) => {
        (window as any).dataLayer.push(args);
      };
      (window as any).gtag = gtag;

      gtag('js', new Date());
      gtag('config', analyticsId, {
        send_page_view: true,
        allow_google_signals: true,
        allow_ad_personalization_signals: false,
      });

      logger.info('PerformanceTracker', 'Google Analytics initialized', { analyticsId });
    } catch (error) {
      logger.error('PerformanceTracker', 'Failed to initialize Google Analytics', error);
    }
  }

  /**
   * Setup Core Web Vitals monitoring
   */
  private setupCoreWebVitals(): void {
    if (!('PerformanceObserver' in window)) {
      logger.warn('PerformanceTracker', 'PerformanceObserver not supported');
      return;
    }

    // Largest Contentful Paint (LCP)
    this.observePerformance('largest-contentful-paint', (entries) => {
      const lcpEntry = entries[entries.length - 1] as any;
      const lcpValue = lcpEntry.renderTime || lcpEntry.loadTime || lcpEntry.startTime;
      this.trackWebVital('LCP', lcpValue);
    });

    // First Input Delay (FID)
    this.observePerformance('first-input', (entries) => {
      const fidEntry = entries[0] as any;
      const fidValue = fidEntry.processingStart - fidEntry.startTime;
      this.trackWebVital('FID', fidValue);
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    this.observePerformance('layout-shift', (entries) => {
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.trackWebVital('CLS', clsValue);
    });

    // First Contentful Paint (FCP)
    this.observePerformance('paint', (entries) => {
      const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.trackWebVital('FCP', fcpEntry.startTime);
      }
    });

    logger.info('PerformanceTracker', 'Core Web Vitals monitoring configured');
  }

  /**
   * Generic performance observer helper
   */
  private observePerformance(type: string, callback: (entries: PerformanceEntry[]) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ type, buffered: true });
    } catch (error) {
      logger.warn('PerformanceTracker', `Could not observe ${type}`, error);
    }
  }

  /**
   * Track Core Web Vital metric
   */
  private trackWebVital(name: string, value: number): void {
    const roundedValue = Math.round(value);

    // Determine rating based on thresholds
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';

    if (name === 'LCP') {
      if (roundedValue > 4000) rating = 'poor';
      else if (roundedValue > 2500) rating = 'needs-improvement';
    } else if (name === 'FID') {
      if (roundedValue > 300) rating = 'poor';
      else if (roundedValue > 100) rating = 'needs-improvement';
    } else if (name === 'CLS') {
      if (value > 0.25) rating = 'poor';
      else if (value > 0.1) rating = 'needs-improvement';
    } else if (name === 'FCP') {
      if (roundedValue > 3000) rating = 'poor';
      else if (roundedValue > 1800) rating = 'needs-improvement';
    }

    const webVital: WebVital = {
      name,
      value: roundedValue,
      rating,
      timestamp: Date.now(),
    };

    this.webVitals.set(name, webVital);

    // Track to analytics
    this.trackTiming('Web Vitals', name, roundedValue);

    // Track to performance monitor
    performanceMonitor.recordMetric(`web_vital_${name.toLowerCase()}`, roundedValue);

    logger.debug('PerformanceTracker', `Web Vital: ${name}`, { value: roundedValue, rating });
  }

  /**
   * Setup user timing measurements
   */
  private setupUserTiming(): void {
    performance.mark('app-start');

    window.addEventListener('load', () => {
      performance.mark('app-loaded');
      performance.measure('app-load-time', 'app-start', 'app-loaded');

      const loadMeasure = performance.getEntriesByName('app-load-time')[0];
      if (loadMeasure) {
        this.trackTiming('App Performance', 'Load Time', Math.round(loadMeasure.duration));
      }
    });

    logger.info('PerformanceTracker', 'User timing configured');
  }

  /**
   * Setup scroll depth tracking
   */
  private setupScrollDepthTracking(): void {
    const scrollThresholds = [25, 50, 75, 90, 100];

    const trackScrollDepth = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      scrollThresholds.forEach((threshold) => {
        if (scrollPercent >= threshold && !this.scrollDepthTracked.has(threshold)) {
          this.scrollDepthTracked.add(threshold);
          this.trackEvent('scroll_depth', { percent: threshold });
        }
      });
    };

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          trackScrollDepth();
          ticking = false;
        });
        ticking = true;
      }
    });

    logger.info('PerformanceTracker', 'Scroll depth tracking configured');
  }

  /**
   * Setup user engagement tracking
   */
  private setupUserEngagement(): void {
    let startTime = Date.now();
    let isVisible = true;

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (isVisible) {
          const sessionDuration = Date.now() - startTime;
          this.trackTiming('Engagement', 'Session Duration', Math.round(sessionDuration / 1000));
          isVisible = false;
        }
      } else {
        startTime = Date.now();
        isVisible = true;
      }
    });

    // Track user interactions
    const interactionEvents: Array<keyof DocumentEventMap> = ['click', 'keydown', 'touchstart'];
    interactionEvents.forEach((eventName) => {
      const handler = this.throttle(() => {
        this.trackEvent('user_interaction', { type: eventName });
      }, 1000) as EventListener;

      document.addEventListener(eventName, handler, { passive: true });
    });

    logger.info('PerformanceTracker', 'User engagement tracking configured');
  }

  /**
   * Track custom event
   */
  trackEvent(eventName: string, properties: Record<string, any> = {}): void {
    if (!this.analyticsInitialized) return;

    // Track to Google Analytics
    if ((window as any).gtag) {
      (window as any).gtag('event', eventName, properties);
    }

    logger.debug('PerformanceTracker', 'Event tracked', { event: eventName, properties });
  }

  /**
   * Track timing metric
   */
  trackTiming(category: string, variable: string, value: number): void {
    if (!this.analyticsInitialized) return;

    // Track to Google Analytics
    if ((window as any).gtag) {
      (window as any).gtag('event', 'timing_complete', {
        name: variable,
        value: value,
        event_category: category,
      });
    }

    // Track to performance monitor
    const metricName = `timing_${category}_${variable}`.toLowerCase().replace(/\s+/g, '_');
    performanceMonitor.recordMetric(metricName, value);

    logger.debug('PerformanceTracker', 'Timing tracked', { category, variable, value });
  }

  /**
   * Get all tracked Web Vitals
   */
  getWebVitals(): Map<string, WebVital> {
    return new Map(this.webVitals);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};

    this.webVitals.forEach((vital, name) => {
      const key = name.toLowerCase() as keyof PerformanceMetrics;
      metrics[key] = vital.value;
    });

    return metrics;
  }

  /**
   * Get current session duration
   */
  getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }

  /**
   * Throttle function execution
   */
  private throttle(func: (...args: any[]) => void, delay: number): (...args: any[]) => void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let lastExecTime = 0;

    return (...args: any[]) => {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  /**
   * Check if analytics is initialized
   */
  isInitialized(): boolean {
    return this.analyticsInitialized;
  }
}
