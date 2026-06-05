/**
 * Tests for Performance Tracker Module (web optimizations).
 *
 * Strategy:
 * - Force Platform.OS === 'web' so every web-only branch runs.
 * - Provide minimal-but-capturing stubs for document / window / performance /
 *   PerformanceObserver so we can invoke observer callbacks and DOM event
 *   handlers directly and assert recorded metrics.
 * - Mock only externals (logger, performanceMonitor). The unit under test
 *   (PerformanceTracker) is NEVER mocked.
 * - Date.now is spied for deterministic timing assertions.
 */

// Force the web platform before importing the unit under test.
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../performanceMonitor', () => ({
  performanceMonitor: {
    recordMetric: jest.fn(),
  },
}));

import { PerformanceTracker } from '../PerformanceTracker';
import { AnalyticsConfig } from '../types';
import { logger } from '../../logger';
import { performanceMonitor } from '../../performanceMonitor';

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockRecordMetric = (performanceMonitor as { recordMetric: jest.Mock })
  .recordMetric;

// --- Capturing DOM/web stubs -------------------------------------------------

type ObserverCallback = (entries: unknown[]) => void;

interface CapturedObserver {
  type: string;
  callback: ObserverCallback;
  observe: jest.Mock;
  // emit() pushes entries through the real PerformanceTracker callback wrapper.
  emit: (entries: unknown[]) => void;
}

let capturedObservers: CapturedObserver[];
let observeShouldThrow: boolean;
let windowListeners: Record<string, ((...a: unknown[]) => void)[]>;
let documentListeners: Record<string, ((...a: unknown[]) => void)[]>;
let gtagCalls: unknown[][];
let createElementShouldThrow: boolean;
let appendedScripts: Array<Record<string, unknown>>;
let supportPerformanceObserver: boolean;

const fixedNow = 1_700_000_000_000;

function installWebGlobals(): void {
  capturedObservers = [];
  windowListeners = {};
  documentListeners = {};
  gtagCalls = [];
  appendedScripts = [];

  // PerformanceObserver: capture the user callback, expose emit() to drive it.
  const PerformanceObserverStub = jest
    .fn()
    .mockImplementation(
      (cb: (list: { getEntries: () => unknown[] }) => void) => {
        const observer: CapturedObserver = {
          type: '',
          callback: () => undefined,
          observe: jest.fn((opts: { type: string }) => {
            observer.type = opts.type;
            if (observeShouldThrow) {
              throw new Error('observe boom');
            }
          }),
          emit: (entries: unknown[]) => {
            cb({ getEntries: () => entries });
          },
        };
        capturedObservers.push(observer);
        return { observe: observer.observe };
      }
    );

  (global as unknown as { PerformanceObserver: unknown }).PerformanceObserver =
    PerformanceObserverStub;

  const win: Record<string, unknown> = {
    dataLayer: undefined,
    pageYOffset: 0,
    innerHeight: 800,
    addEventListener: jest.fn(
      (evt: string, handler: (...a: unknown[]) => void) => {
        (windowListeners[evt] ||= []).push(handler);
      }
    ),
    removeEventListener: jest.fn(),
  };
  // The source calls bare requestAnimationFrame (globalThis), not window.raf.
  (
    global as unknown as { requestAnimationFrame: unknown }
  ).requestAnimationFrame = jest.fn((cb: () => void) => {
    cb();
    return 1;
  });
  // PerformanceObserver-in-window support gate.
  if (supportPerformanceObserver) {
    win.PerformanceObserver = PerformanceObserverStub;
  }
  (global as unknown as { window: unknown }).window = win;

  (global as unknown as { document: unknown }).document = {
    createElement: jest.fn(() => {
      if (createElementShouldThrow) {
        throw new Error('createElement boom');
      }
      return { async: false, src: '' };
    }),
    head: {
      appendChild: jest.fn((el: Record<string, unknown>) => {
        appendedScripts.push(el);
      }),
    },
    body: { scrollHeight: 1000 },
    hidden: false,
    addEventListener: jest.fn(
      (evt: string, handler: (...a: unknown[]) => void) => {
        (documentListeners[evt] ||= []).push(handler);
      }
    ),
    removeEventListener: jest.fn(),
  };

  (global as unknown as { performance: unknown }).performance = {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => [{ duration: 1500 }]),
  };

  // gtag is installed by initializeGoogleAnalytics via window.gtag; capture it.
  Object.defineProperty(win, 'gtag', {
    configurable: true,
    get() {
      return (win as { __gtag?: (...a: unknown[]) => void }).__gtag;
    },
    set(fn: (...a: unknown[]) => void) {
      (win as { __gtag?: (...a: unknown[]) => void }).__gtag = (
        ...args: unknown[]
      ) => {
        gtagCalls.push(args);
        return fn(...args);
      };
    },
  });
}

function teardownWebGlobals(): void {
  delete (global as unknown as { PerformanceObserver?: unknown })
    .PerformanceObserver;
  delete (global as unknown as { window?: unknown }).window;
  delete (global as unknown as { document?: unknown }).document;
  delete (global as unknown as { performance?: unknown }).performance;
  delete (global as unknown as { requestAnimationFrame?: unknown })
    .requestAnimationFrame;
}

function findObserver(type: string): CapturedObserver {
  const obs = capturedObservers.find((o) => o.type === type);
  if (!obs) {
    throw new Error(`No observer captured for type "${type}"`);
  }
  return obs;
}

const baseConfig: AnalyticsConfig = {
  googleAnalyticsId: 'G-TEST123',
  enableUserTiming: true,
  enableScrollDepthTracking: true,
  enableCustomEvents: true,
  enableConversionTracking: true,
};

describe('PerformanceTracker', () => {
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    observeShouldThrow = false;
    createElementShouldThrow = false;
    supportPerformanceObserver = true;
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNow);
    installWebGlobals();
  });

  afterEach(() => {
    nowSpy.mockRestore();
    teardownWebGlobals();
  });

  describe('constructor + getters before init', () => {
    it('starts uninitialized with empty vitals/metrics', () => {
      const tracker = new PerformanceTracker(baseConfig);
      expect(tracker).toBeInstanceOf(PerformanceTracker);
      expect(tracker.isInitialized()).toBe(false);
      expect(tracker.getWebVitals().size).toBe(0);
      expect(tracker.getPerformanceMetrics()).toEqual({});
    });

    it('getSessionDuration is 0 when Date.now is fixed at creation', () => {
      const tracker = new PerformanceTracker(baseConfig);
      expect(tracker.getSessionDuration()).toBe(0);
    });

    it('getSessionDuration reflects elapsed time', () => {
      const tracker = new PerformanceTracker(baseConfig);
      nowSpy.mockReturnValue(fixedNow + 5000);
      expect(tracker.getSessionDuration()).toBe(5000);
    });
  });

  describe('initialize', () => {
    it('skips entirely on non-web platforms', async () => {
      jest.resetModules();
      jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
      const { PerformanceTracker: NativeTracker } =
        await import('../PerformanceTracker');
      const tracker = new NativeTracker(baseConfig);
      await tracker.initialize();
      expect(tracker.isInitialized()).toBe(false);
      jest.dontMock('react-native');
      jest.resetModules();
    });

    it('initializes fully on web and marks initialized', async () => {
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();

      expect(tracker.isInitialized()).toBe(true);
      // GA script appended.
      expect(appendedScripts.length).toBe(1);
      expect(appendedScripts[0].src).toContain('G-TEST123');
      // Core web vitals: 4 observers registered.
      expect(capturedObservers.map((o) => o.type).sort()).toEqual([
        'first-input',
        'largest-contentful-paint',
        'layout-shift',
        'paint',
      ]);
      // User timing mark.
      expect(global.performance.mark as jest.Mock).toHaveBeenCalledWith(
        'app-start'
      );
      // Scroll + load + visibility + interaction listeners attached.
      expect(windowListeners.scroll).toHaveLength(1);
      expect(windowListeners.load).toHaveLength(1);
      expect(documentListeners.visibilitychange).toHaveLength(1);
      expect(documentListeners.click).toHaveLength(1);
      expect(documentListeners.keydown).toHaveLength(1);
      expect(documentListeners.touchstart).toHaveLength(1);
    });

    it('skips GA when no analyticsId, still initializes', async () => {
      const tracker = new PerformanceTracker({
        ...baseConfig,
        googleAnalyticsId: undefined,
      });
      await tracker.initialize();
      expect(tracker.isInitialized()).toBe(true);
      expect(appendedScripts.length).toBe(0);
    });

    it('skips user timing when enableUserTiming is false', async () => {
      const tracker = new PerformanceTracker({
        ...baseConfig,
        enableUserTiming: false,
      });
      await tracker.initialize();
      expect(global.performance.mark as jest.Mock).not.toHaveBeenCalled();
      expect(windowListeners.load).toBeUndefined();
    });

    it('skips scroll depth tracking when disabled', async () => {
      const tracker = new PerformanceTracker({
        ...baseConfig,
        enableScrollDepthTracking: false,
      });
      await tracker.initialize();
      expect(windowListeners.scroll).toBeUndefined();
      // Engagement listeners still present.
      expect(documentListeners.visibilitychange).toHaveLength(1);
    });

    it('warns and returns when PerformanceObserver unsupported, still initializes', async () => {
      supportPerformanceObserver = false;
      installWebGlobals(); // rebuild window without PerformanceObserver
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PerformanceTracker',
        'PerformanceObserver not supported'
      );
      expect(capturedObservers.length).toBe(0);
      expect(tracker.isInitialized()).toBe(true);
    });

    it('logs error and stays uninitialized if setup throws', async () => {
      // Make setupCoreWebVitals blow up by removing window mid-flight via a
      // throwing createElement is for GA only; instead force performance.mark
      // to throw so setupUserTiming throws inside the try block.
      (global.performance.mark as jest.Mock).mockImplementation(() => {
        throw new Error('mark boom');
      });
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PerformanceTracker',
        'Failed to initialize performance tracking',
        expect.objectContaining({ error: 'mark boom' })
      );
      expect(tracker.isInitialized()).toBe(false);
    });

    it('coerces a non-Error throw to String in the error log', async () => {
      // Throw a non-Error value to exercise the String(error) branch.
      (global.performance.mark as jest.Mock).mockImplementation(() => {
        throw 'string failure'; // eslint-disable-line no-throw-literal
      });
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PerformanceTracker',
        'Failed to initialize performance tracking',
        { error: 'string failure' }
      );
    });
  });

  describe('initializeGoogleAnalytics', () => {
    it('configures gtag/dataLayer and logs success', async () => {
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      const win = global.window as unknown as {
        dataLayer: unknown[][];
      };
      expect(Array.isArray(win.dataLayer)).toBe(true);
      // The local gtag() closure pushes its args arrays onto dataLayer:
      // gtag('js', Date) and gtag('config', id, {...}).
      const dlArgs = win.dataLayer.map((entry) => entry[0]);
      expect(dlArgs).toContain('js');
      expect(dlArgs).toContain('config');
      const configEntry = win.dataLayer.find((entry) => entry[0] === 'config');
      expect(configEntry?.[1]).toBe('G-TEST123');
      expect(configEntry?.[2]).toMatchObject({ send_page_view: true });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PerformanceTracker',
        'Google Analytics initialized',
        { analyticsId: 'G-TEST123' }
      );
    });

    it('catches GA errors (createElement throws) and continues init', async () => {
      createElementShouldThrow = true;
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PerformanceTracker',
        'Failed to initialize Google Analytics',
        expect.objectContaining({ error: 'createElement boom' })
      );
      // GA failure is isolated; tracker still finishes.
      expect(tracker.isInitialized()).toBe(true);
    });

    it('coerces a non-Error GA throw to String', async () => {
      (global.document.createElement as jest.Mock).mockImplementation(() => {
        throw 42; // eslint-disable-line no-throw-literal
      });
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PerformanceTracker',
        'Failed to initialize Google Analytics',
        { error: '42' }
      );
    });
  });

  describe('Core Web Vitals tracking + ratings', () => {
    let tracker: PerformanceTracker;

    beforeEach(async () => {
      tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
    });

    it('LCP uses renderTime and rates "good" for low values', () => {
      findObserver('largest-contentful-paint').emit([
        { renderTime: 1000, startTime: 50 },
      ]);
      const vital = tracker.getWebVitals().get('LCP');
      expect(vital).toMatchObject({ name: 'LCP', value: 1000, rating: 'good' });
      expect(mockRecordMetric).toHaveBeenCalledWith('web_vital_lcp', 1000);
    });

    it('LCP falls back to loadTime then startTime', () => {
      findObserver('largest-contentful-paint').emit([
        { renderTime: 0, loadTime: 2600, startTime: 9999 },
      ]);
      expect(tracker.getWebVitals().get('LCP')?.value).toBe(2600);
      // 2600 -> needs-improvement
      expect(tracker.getWebVitals().get('LCP')?.rating).toBe(
        'needs-improvement'
      );

      findObserver('largest-contentful-paint').emit([
        { renderTime: 0, loadTime: 0, startTime: 4500 },
      ]);
      const lcp = tracker.getWebVitals().get('LCP');
      expect(lcp?.value).toBe(4500);
      expect(lcp?.rating).toBe('poor');
    });

    it('FID computes processingStart - startTime and rates tiers', () => {
      const obs = findObserver('first-input');
      obs.emit([{ processingStart: 150, startTime: 100 }]); // 50 -> good
      expect(tracker.getWebVitals().get('FID')).toMatchObject({
        value: 50,
        rating: 'good',
      });
      obs.emit([{ processingStart: 350, startTime: 100 }]); // 250 -> needs-improvement
      expect(tracker.getWebVitals().get('FID')?.rating).toBe(
        'needs-improvement'
      );
      obs.emit([{ processingStart: 500, startTime: 100 }]); // 400 -> poor
      expect(tracker.getWebVitals().get('FID')?.rating).toBe('poor');
    });

    it('CLS accumulates, ignores entries with recent input, rates tiers', () => {
      const obs = findObserver('layout-shift');
      obs.emit([
        { value: 0.05, hadRecentInput: false },
        { value: 0.5, hadRecentInput: true }, // ignored
      ]);
      let cls = tracker.getWebVitals().get('CLS');
      expect(cls?.value).toBe(0); // Math.round(0.05) === 0
      expect(cls?.rating).toBe('good');

      // Push accumulator over 0.1 -> needs-improvement
      obs.emit([{ value: 0.1, hadRecentInput: false }]); // total 0.15
      cls = tracker.getWebVitals().get('CLS');
      expect(cls?.rating).toBe('needs-improvement');

      // Push over 0.25 -> poor (total 0.45)
      obs.emit([{ value: 0.3, hadRecentInput: false }]);
      expect(tracker.getWebVitals().get('CLS')?.rating).toBe('poor');
    });

    it('CLS handles missing value (?? 0)', () => {
      findObserver('layout-shift').emit([{ hadRecentInput: false }]);
      expect(tracker.getWebVitals().get('CLS')?.value).toBe(0);
    });

    it('FCP records only the first-contentful-paint paint entry, rated', () => {
      const obs = findObserver('paint');
      obs.emit([
        { name: 'first-paint', startTime: 500 },
        { name: 'first-contentful-paint', startTime: 1900 },
      ]);
      const fcp = tracker.getWebVitals().get('FCP');
      expect(fcp?.value).toBe(1900);
      expect(fcp?.rating).toBe('needs-improvement');

      obs.emit([{ name: 'first-contentful-paint', startTime: 3500 }]);
      expect(tracker.getWebVitals().get('FCP')?.rating).toBe('poor');

      // Good FCP (<= 1800) -> default 'good' rating (neither threshold branch).
      obs.emit([{ name: 'first-contentful-paint', startTime: 800 }]);
      expect(tracker.getWebVitals().get('FCP')?.rating).toBe('good');
    });

    it('low LCP keeps the default "good" rating', () => {
      findObserver('largest-contentful-paint').emit([
        { renderTime: 100, startTime: 0 },
      ]);
      expect(tracker.getWebVitals().get('LCP')?.rating).toBe('good');
    });

    it('FCP does nothing when no first-contentful-paint entry present', () => {
      findObserver('paint').emit([{ name: 'first-paint', startTime: 500 }]);
      expect(tracker.getWebVitals().get('FCP')).toBeUndefined();
    });

    it('records a web vital timestamp from Date.now', () => {
      findObserver('first-input').emit([
        { processingStart: 110, startTime: 100 },
      ]);
      expect(tracker.getWebVitals().get('FID')?.timestamp).toBe(fixedNow);
    });
  });

  describe('observePerformance error path', () => {
    it('warns when observer.observe throws', async () => {
      observeShouldThrow = true;
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PerformanceTracker',
        expect.stringContaining('Could not observe'),
        expect.any(Error)
      );
    });
  });

  describe('setupUserTiming load handler', () => {
    it('measures app-load-time on window load and tracks timing', async () => {
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      mockRecordMetric.mockClear();

      // Fire the captured 'load' handler.
      windowListeners.load[0]();

      expect(global.performance.measure as jest.Mock).toHaveBeenCalledWith(
        'app-load-time',
        'app-start',
        'app-loaded'
      );
      // trackTiming -> recordMetric with sanitized name.
      expect(mockRecordMetric).toHaveBeenCalledWith(
        'timing_app_performance_load_time',
        1500
      );
    });

    it('does not track when getEntriesByName returns empty', async () => {
      (global.performance.getEntriesByName as jest.Mock).mockReturnValue([]);
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      mockRecordMetric.mockClear();
      windowListeners.load[0]();
      expect(mockRecordMetric).not.toHaveBeenCalled();
    });
  });

  describe('setupScrollDepthTracking handler', () => {
    it('fires scroll_depth events as thresholds are crossed once', async () => {
      // Deferred rAF so the source's `ticking = true` runs BEFORE the callback
      // sets it back to false (matching real browser ordering). We flush the
      // queued callback manually after each scroll fire.
      const rafQueue: Array<() => void> = [];
      (
        global as unknown as {
          requestAnimationFrame: (cb: () => void) => number;
        }
      ).requestAnimationFrame = jest.fn((cb: () => void) => {
        rafQueue.push(cb);
        return rafQueue.length;
      });
      const flushRaf = () => {
        while (rafQueue.length) {
          rafQueue.shift()!();
        }
      };

      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      const gtagBefore = gtagCalls.length;

      // docHeight = scrollHeight(1000) - innerHeight(800) = 200.
      // scrollTop 120 -> 60% -> crosses 25 and 50.
      (global.window as unknown as { pageYOffset: number }).pageYOffset = 120;
      windowListeners.scroll[0]();
      flushRaf();

      const scrollEvents = gtagCalls
        .slice(gtagBefore)
        .filter((c) => c[0] === 'event' && c[1] === 'scroll_depth');
      expect(
        scrollEvents.map((c) => (c[2] as { percent: number }).percent)
      ).toEqual([25, 50]);

      // Re-firing at same depth does not re-emit already-tracked thresholds.
      const countAfterFirst = gtagCalls.filter(
        (c) => c[1] === 'scroll_depth'
      ).length;
      windowListeners.scroll[0]();
      flushRaf();
      const countAfterSecond = gtagCalls.filter(
        (c) => c[1] === 'scroll_depth'
      ).length;
      expect(countAfterSecond).toBe(countAfterFirst);

      // Scroll to bottom -> remaining thresholds (75, 90, 100).
      (global.window as unknown as { pageYOffset: number }).pageYOffset = 200;
      windowListeners.scroll[0]();
      flushRaf();
      const allPercents = gtagCalls
        .filter((c) => c[1] === 'scroll_depth')
        .map((c) => (c[2] as { percent: number }).percent);
      expect(allPercents).toEqual([25, 50, 75, 90, 100]);
    });

    it('rAF ticking guard prevents concurrent scheduling', async () => {
      // requestAnimationFrame that does NOT invoke immediately, so ticking
      // stays true across rapid scrolls. Source uses bare (global) raf.
      const raf = jest.fn(() => 1);
      (
        global as unknown as {
          requestAnimationFrame: (cb: () => void) => number;
        }
      ).requestAnimationFrame = raf;
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      windowListeners.scroll[0]();
      windowListeners.scroll[0]();
      expect(raf).toHaveBeenCalledTimes(1);
    });
  });

  describe('setupUserEngagement handlers', () => {
    it('tracks session duration when page becomes hidden then ignores repeat hides', async () => {
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      mockRecordMetric.mockClear();

      const doc = global.document as unknown as { hidden: boolean };
      const visHandler = documentListeners.visibilitychange[0];

      // 30s pass, then hide.
      nowSpy.mockReturnValue(fixedNow + 30_000);
      doc.hidden = true;
      visHandler();
      expect(mockRecordMetric).toHaveBeenCalledWith(
        'timing_engagement_session_duration',
        30 // ms/1000
      );

      // Hiding again while already hidden does nothing.
      mockRecordMetric.mockClear();
      visHandler();
      expect(mockRecordMetric).not.toHaveBeenCalled();

      // Becoming visible resets state (no metric).
      doc.hidden = false;
      visHandler();
      expect(mockRecordMetric).not.toHaveBeenCalled();

      // Now hide again -> tracks once more.
      nowSpy.mockReturnValue(fixedNow + 90_000);
      doc.hidden = true;
      visHandler();
      expect(mockRecordMetric).toHaveBeenCalledWith(
        'timing_engagement_session_duration',
        expect.any(Number)
      );
    });

    it('throttled interaction handlers fire a user_interaction event', async () => {
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      const before = gtagCalls.length;

      // First call executes immediately (throttle leading edge).
      documentListeners.click[0]();
      const interactionEvents = gtagCalls
        .slice(before)
        .filter((c) => c[1] === 'user_interaction');
      expect(interactionEvents).toHaveLength(1);
      expect((interactionEvents[0][2] as { type: string }).type).toBe('click');
    });

    it('throttle suppresses a rapid second call (no immediate second event)', async () => {
      jest.useFakeTimers();
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      const handler = documentListeners.keydown[0];

      // Date.now is mocked to a fixed value -> currentTime - lastExecTime
      // stays 0 after first exec, so the second call is throttled (scheduled).
      handler(); // executes
      const afterFirst = gtagCalls.filter(
        (c) => c[1] === 'user_interaction'
      ).length;
      handler(); // throttled -> scheduled via setTimeout (timeoutId set)
      const afterSecond = gtagCalls.filter(
        (c) => c[1] === 'user_interaction'
      ).length;
      expect(afterSecond).toBe(afterFirst); // no immediate second event

      // A third rapid call clears the pending timeout (the `if (timeoutId)`
      // branch) and reschedules.
      handler();
      const afterThird = gtagCalls.filter(
        (c) => c[1] === 'user_interaction'
      ).length;
      expect(afterThird).toBe(afterFirst);

      // Advance the real timer wall-clock so the scheduled call records lastExec.
      nowSpy.mockReturnValue(fixedNow + 1000);
      jest.runOnlyPendingTimers();
      const afterTimer = gtagCalls.filter(
        (c) => c[1] === 'user_interaction'
      ).length;
      expect(afterTimer).toBe(afterFirst + 1);
      jest.useRealTimers();
    });
  });

  describe('trackEvent', () => {
    it('no-ops before initialization', () => {
      const tracker = new PerformanceTracker(baseConfig);
      tracker.trackEvent('x', { a: 1 });
      expect(gtagCalls.filter((c) => c[1] === 'x')).toHaveLength(0);
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        'PerformanceTracker',
        'Event tracked',
        expect.anything()
      );
    });

    it('sends to gtag with properties after init', async () => {
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      tracker.trackEvent('custom_event', { foo: 'bar' });
      const call = gtagCalls.find((c) => c[1] === 'custom_event');
      expect(call).toEqual(['event', 'custom_event', { foo: 'bar' }]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'PerformanceTracker',
        'Event tracked',
        { event: 'custom_event', properties: { foo: 'bar' } }
      );
    });

    it('defaults properties to {} and tolerates missing gtag', async () => {
      const tracker = new PerformanceTracker({
        ...baseConfig,
        googleAnalyticsId: undefined, // gtag never installed
      });
      await tracker.initialize();
      expect(() => tracker.trackEvent('no_gtag')).not.toThrow();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'PerformanceTracker',
        'Event tracked',
        { event: 'no_gtag', properties: {} }
      );
    });
  });

  describe('trackTiming', () => {
    it('no-ops before initialization', () => {
      const tracker = new PerformanceTracker(baseConfig);
      tracker.trackTiming('Cat', 'Var', 100);
      expect(mockRecordMetric).not.toHaveBeenCalled();
    });

    it('sends timing_complete to gtag and records sanitized metric', async () => {
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      mockRecordMetric.mockClear();
      tracker.trackTiming('App Performance', 'Load Time', 1234);
      const gaCall = gtagCalls.find((c) => c[1] === 'timing_complete');
      expect(gaCall?.[2]).toEqual({
        name: 'Load Time',
        value: 1234,
        event_category: 'App Performance',
      });
      expect(mockRecordMetric).toHaveBeenCalledWith(
        'timing_app_performance_load_time',
        1234
      );
    });

    it('records metric even when gtag is unavailable', async () => {
      const tracker = new PerformanceTracker({
        ...baseConfig,
        googleAnalyticsId: undefined,
      });
      await tracker.initialize();
      mockRecordMetric.mockClear();
      tracker.trackTiming('Engagement', 'Session Duration', 42);
      expect(mockRecordMetric).toHaveBeenCalledWith(
        'timing_engagement_session_duration',
        42
      );
    });
  });

  describe('getWebVitals / getPerformanceMetrics', () => {
    it('returns a defensive copy of the vitals map', async () => {
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      findObserver('first-input').emit([
        { processingStart: 110, startTime: 100 },
      ]);
      const a = tracker.getWebVitals();
      const b = tracker.getWebVitals();
      expect(a).not.toBe(b);
      expect(a.get('FID')?.value).toBe(10);
      a.delete('FID');
      // Mutating the returned copy must not affect internal state.
      expect(tracker.getWebVitals().get('FID')).toBeDefined();
    });

    it('maps tracked vitals into lowercase PerformanceMetrics keys', async () => {
      const tracker = new PerformanceTracker(baseConfig);
      await tracker.initialize();
      findObserver('largest-contentful-paint').emit([
        { renderTime: 1200, startTime: 0 },
      ]);
      findObserver('first-input').emit([
        { processingStart: 260, startTime: 100 },
      ]);
      const metrics = tracker.getPerformanceMetrics();
      expect(metrics).toEqual({ lcp: 1200, fid: 160 });
    });
  });
});
