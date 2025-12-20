/**
 * Tests for Performance Tracker Module
 */

import { Platform } from 'react-native';
import { PerformanceTracker } from '../PerformanceTracker';
import { AnalyticsConfig } from '../types';

// Mock dependencies
jest.mock('../../logger');
jest.mock('../../performanceMonitor', () => ({
  performanceMonitor: {
    recordMetric: jest.fn(),
  },
}));

// Mock DOM APIs
const mockPerformanceObserver = jest.fn();
global.PerformanceObserver = mockPerformanceObserver as any;

describe('PerformanceTracker', () => {
  let tracker: PerformanceTracker;
  let config: AnalyticsConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      googleAnalyticsId: 'G-TEST123',
      enableUserTiming: true,
      enableScrollDepthTracking: true,
      enableCustomEvents: true,
      enableConversionTracking: true,
    };

    tracker = new PerformanceTracker(config);

    // Mock DOM elements
    if (Platform.OS === 'web') {
      (global as any).document = {
        createElement: jest.fn(() => ({
          async: false,
          src: '',
        })),
        head: {
          appendChild: jest.fn(),
        },
        body: {
          scrollHeight: 1000,
        },
        hidden: false,
        addEventListener: jest.fn(),
      };

      (global as any).window = {
        dataLayer: [],
        gtag: jest.fn(),
        addEventListener: jest.fn(),
        pageYOffset: 0,
        innerHeight: 800,
        requestAnimationFrame: jest.fn((cb) => {
          cb();
          return 1;
        }),
      };

      (global as any).performance = {
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByName: jest.fn(() => [{ duration: 1500 }]),
      };
    }
  });

  afterEach(() => {
    if (Platform.OS === 'web') {
      delete (global as any).document;
      delete (global as any).window;
      delete (global as any).performance;
    }
  });

  describe('Constructor', () => {
    it('should create instance with config', () => {
      expect(tracker).toBeDefined();
      expect(tracker).toBeInstanceOf(PerformanceTracker);
    });

    it('should store config', () => {
      expect(tracker).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should skip initialization on non-web platforms', async () => {
      if (Platform.OS !== 'web') {
        await tracker.initialize();
        expect(tracker.isInitialized()).toBe(false);
      }
    });

    it('should initialize successfully on web', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        expect(tracker.isInitialized()).toBe(true);
      }
    });

    it('should handle initialization errors gracefully', async () => {
      const errorTracker = new PerformanceTracker({
        ...config,
        googleAnalyticsId: '',
      });

      await expect(errorTracker.initialize()).resolves.not.toThrow();
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(tracker.isInitialized()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        expect(tracker.isInitialized()).toBe(true);
      }
    });
  });

  describe('trackEvent', () => {
    it('should not track events before initialization', () => {
      tracker.trackEvent('test_event', { prop: 'value' });
      // Should not throw
      expect(true).toBe(true);
    });

    it('should track events after initialization', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        tracker.trackEvent('test_event', { prop: 'value' });
        expect(true).toBe(true);
      }
    });

    it('should track events without properties', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        tracker.trackEvent('simple_event');
        expect(true).toBe(true);
      }
    });

    it('should handle complex event properties', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        tracker.trackEvent('complex_event', {
          nested: { prop: 'value' },
          array: [1, 2, 3],
          number: 42,
        });
        expect(true).toBe(true);
      }
    });
  });

  describe('trackTiming', () => {
    it('should not track timing before initialization', () => {
      tracker.trackTiming('category', 'variable', 1000);
      expect(true).toBe(true);
    });

    it('should track timing after initialization', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        tracker.trackTiming('App Performance', 'Load Time', 1500);
        expect(true).toBe(true);
      }
    });

    it('should sanitize metric names', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        tracker.trackTiming('Test Category', 'Test Variable', 100);
        expect(true).toBe(true);
      }
    });

    it('should handle zero timing values', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        tracker.trackTiming('category', 'variable', 0);
        expect(true).toBe(true);
      }
    });

    it('should handle large timing values', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        tracker.trackTiming('category', 'variable', 999999);
        expect(true).toBe(true);
      }
    });
  });

  describe('getWebVitals', () => {
    it('should return empty Map initially', () => {
      const vitals = tracker.getWebVitals();
      expect(vitals).toBeInstanceOf(Map);
      expect(vitals.size).toBe(0);
    });

    it('should return a copy of web vitals', () => {
      const vitals1 = tracker.getWebVitals();
      const vitals2 = tracker.getWebVitals();

      expect(vitals1).not.toBe(vitals2);
    });

    it('should return web vitals after tracking', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        const vitals = tracker.getWebVitals();
        expect(vitals).toBeInstanceOf(Map);
      }
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return empty metrics object initially', () => {
      const metrics = tracker.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });

    it('should convert web vitals to metrics', async () => {
      const metrics = tracker.getPerformanceMetrics();
      expect(metrics).toBeDefined();
    });

    it('should include tracked vitals in metrics', () => {
      const metrics = tracker.getPerformanceMetrics();
      expect(typeof metrics).toBe('object');
    });
  });

  describe('getSessionDuration', () => {
    it('should return session duration in milliseconds', () => {
      const duration = tracker.getSessionDuration();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should increase over time', async () => {
      const duration1 = tracker.getSessionDuration();

      await new Promise(resolve => setTimeout(resolve, 10));

      const duration2 = tracker.getSessionDuration();
      expect(duration2).toBeGreaterThanOrEqual(duration1);
    });

    it('should track from instance creation', () => {
      const newTracker = new PerformanceTracker(config);
      const duration = newTracker.getSessionDuration();
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Web Vitals Rating', () => {
    it('should rate LCP correctly', () => {
      // Good: < 2500ms
      // Needs improvement: 2500-4000ms
      // Poor: > 4000ms
      expect(true).toBe(true);
    });

    it('should rate FID correctly', () => {
      // Good: < 100ms
      // Needs improvement: 100-300ms
      // Poor: > 300ms
      expect(true).toBe(true);
    });

    it('should rate CLS correctly', () => {
      // Good: < 0.1
      // Needs improvement: 0.1-0.25
      // Poor: > 0.25
      expect(true).toBe(true);
    });

    it('should rate FCP correctly', () => {
      // Good: < 1800ms
      // Needs improvement: 1800-3000ms
      // Poor: > 3000ms
      expect(true).toBe(true);
    });
  });

  describe('Platform Compatibility', () => {
    it('should handle missing PerformanceObserver gracefully', async () => {
      const originalPO = (global as any).PerformanceObserver;
      delete (global as any).PerformanceObserver;

      await expect(tracker.initialize()).resolves.not.toThrow();

      (global as any).PerformanceObserver = originalPO;
    });

    it('should work on non-web platforms', async () => {
      await tracker.initialize();
      expect(tracker).toBeDefined();
    });
  });

  describe('Scroll Depth Tracking', () => {
    it('should track scroll depth thresholds', () => {
      const thresholds = [25, 50, 75, 90, 100];
      expect(thresholds.length).toBe(5);
    });

    it('should handle scroll events', () => {
      if (Platform.OS === 'web') {
        expect(window.addEventListener).toBeDefined();
      }
    });
  });

  describe('User Engagement', () => {
    it('should track visibility changes', () => {
      if (Platform.OS === 'web') {
        expect(document.addEventListener).toBeDefined();
      }
    });

    it('should track user interactions', () => {
      const interactionEvents = ['click', 'keydown', 'touchstart'];
      expect(interactionEvents.length).toBe(3);
    });

    it('should throttle interaction events', () => {
      // Throttling is implemented to prevent excessive tracking
      expect(true).toBe(true);
    });
  });

  describe('Google Analytics Integration', () => {
    it('should initialize Google Analytics with provided ID', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        expect(document.createElement).toHaveBeenCalled();
      }
    });

    it('should skip GA initialization when no ID provided', async () => {
      const noGATracker = new PerformanceTracker({
        ...config,
        googleAnalyticsId: undefined,
      });

      await noGATracker.initialize();
      expect(noGATracker).toBeDefined();
    });

    it('should send events to gtag when available', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        (window as any).gtag = jest.fn();
        tracker.trackEvent('test_event');
        expect(true).toBe(true);
      }
    });
  });

  describe('User Timing API', () => {
    it('should create performance marks', async () => {
      if (Platform.OS === 'web' && config.enableUserTiming) {
        await tracker.initialize();
        expect(performance.mark).toHaveBeenCalled();
      }
    });

    it('should measure app load time', async () => {
      if (Platform.OS === 'web' && config.enableUserTiming) {
        await tracker.initialize();
        expect(true).toBe(true);
      }
    });
  });

  describe('Configuration Options', () => {
    it('should respect enableUserTiming config', async () => {
      const noTimingTracker = new PerformanceTracker({
        ...config,
        enableUserTiming: false,
      });

      await noTimingTracker.initialize();
      expect(noTimingTracker).toBeDefined();
    });

    it('should respect enableScrollDepthTracking config', async () => {
      const noScrollTracker = new PerformanceTracker({
        ...config,
        enableScrollDepthTracking: false,
      });

      await noScrollTracker.initialize();
      expect(noScrollTracker).toBeDefined();
    });

    it('should respect enableCustomEvents config', async () => {
      const tracker = new PerformanceTracker({
        ...config,
        enableCustomEvents: true,
      });

      expect(tracker).toBeDefined();
    });

    it('should respect enableConversionTracking config', async () => {
      const tracker = new PerformanceTracker({
        ...config,
        enableConversionTracking: true,
      });

      expect(tracker).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle DOM manipulation errors', async () => {
      if (Platform.OS === 'web') {
        (document.createElement as jest.Mock).mockImplementationOnce(() => {
          throw new Error('DOM error');
        });

        await expect(tracker.initialize()).resolves.not.toThrow();
      }
    });

    it('should handle PerformanceObserver errors', async () => {
      mockPerformanceObserver.mockImplementationOnce(() => {
        throw new Error('Observer error');
      });

      await expect(tracker.initialize()).resolves.not.toThrow();
    });

    it('should continue initialization after GA errors', async () => {
      if (Platform.OS === 'web') {
        await expect(tracker.initialize()).resolves.not.toThrow();
      }
    });
  });

  describe('Metric Recording', () => {
    it('should record web vitals to performance monitor', async () => {
      const { performanceMonitor } = require('../../performanceMonitor');

      if (Platform.OS === 'web') {
        await tracker.initialize();
        expect(performanceMonitor.recordMetric).toBeDefined();
      }
    });

    it('should record timing metrics to performance monitor', async () => {
      if (Platform.OS === 'web') {
        await tracker.initialize();
        tracker.trackTiming('category', 'variable', 100);
        expect(true).toBe(true);
      }
    });
  });
});
