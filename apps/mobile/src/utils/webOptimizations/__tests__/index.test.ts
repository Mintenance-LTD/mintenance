/**
 * Unit tests for WebOptimizationsManager (web optimizations orchestrator).
 *
 * The unit under test is a thin orchestrator/facade that wires five sub-managers
 * (PWA, SEO, Performance, Image, Accessibility) and delegates every public method
 * to them. Per the test rules, the orchestrator itself is exercised for real and
 * ONLY externals are mocked:
 *   - react-native Platform (flipped between 'web' and non-web)
 *   - the logger
 *   - each of the five sub-manager classes (constructor + instance methods)
 *
 * Mocking the sub-managers lets us assert the orchestration contract
 * (constructed with merged config, initialize()/dispose() fan-out) and exercise
 * every delegation + nullish-fallback branch without touching the DOM.
 *
 * jest.mock() factories may only reference variables whose names begin with
 * `mock` (Jest hoists the factory above the file), so the shared mock instances
 * use that prefix.
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// External mocks (logger + the five sub-managers)
// ---------------------------------------------------------------------------

jest.mock('../../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Shared sub-manager instance stubs (mock-prefixed so jest.mock can hoist them).
const mockPwaInstance = {
  initialize: jest.fn().mockResolvedValue(undefined),
  isPWAInstalled: jest.fn().mockReturnValue(true),
  getServiceWorker: jest.fn().mockReturnValue({ scope: '/' }),
  unregister: jest.fn(),
};
const mockSeoInstance = {
  initialize: jest.fn().mockResolvedValue(undefined),
  updateTitle: jest.fn(),
  updateDescription: jest.fn(),
  updatePageMetadata: jest.fn(),
  setCanonicalUrl: jest.fn(),
};
const mockPerfInstance = {
  initialize: jest.fn().mockResolvedValue(undefined),
  trackEvent: jest.fn(),
  trackTiming: jest.fn(),
  getPerformanceMetrics: jest.fn().mockReturnValue({ lcp: 1234 }),
  getSessionDuration: jest.fn().mockReturnValue(5000),
};
const mockImageInstance = {
  initialize: jest.fn().mockResolvedValue(undefined),
  preloadImage: jest.fn(),
  isWebPSupported: jest.fn().mockReturnValue(true),
  getOptimizedImageUrl: jest.fn().mockReturnValue('optimized.webp'),
  dispose: jest.fn(),
};
const mockA11yInstance = {
  initialize: jest.fn().mockResolvedValue(undefined),
  announce: jest.fn(),
  trapFocus: jest.fn(),
  releaseFocusTrap: jest.fn(),
  setPageTitle: jest.fn(),
  prefersReducedMotion: jest.fn().mockReturnValue(true),
  prefersHighContrast: jest.fn().mockReturnValue(true),
};

jest.mock('../PWAManager', () => ({
  PWAManager: jest.fn().mockImplementation(() => mockPwaInstance),
}));
jest.mock('../SEOManager', () => ({
  SEOManager: jest.fn().mockImplementation(() => mockSeoInstance),
}));
jest.mock('../PerformanceTracker', () => ({
  PerformanceTracker: jest.fn().mockImplementation(() => mockPerfInstance),
}));
jest.mock('../ImageOptimizer', () => ({
  ImageOptimizer: jest.fn().mockImplementation(() => mockImageInstance),
}));
jest.mock('../AccessibilityManager', () => ({
  AccessibilityManager: jest.fn().mockImplementation(() => mockA11yInstance),
}));

import { WebOptimizationsManager } from '../index';
import { logger } from '../../logger';
import { PWAManager } from '../PWAManager';
import { SEOManager } from '../SEOManager';
import { PerformanceTracker } from '../PerformanceTracker';
import { ImageOptimizer } from '../ImageOptimizer';
import { AccessibilityManager } from '../AccessibilityManager';

const PWAManagerMock = PWAManager as unknown as jest.Mock;
const SEOManagerMock = SEOManager as unknown as jest.Mock;
const PerformanceTrackerMock = PerformanceTracker as unknown as jest.Mock;
const ImageOptimizerMock = ImageOptimizer as unknown as jest.Mock;
const AccessibilityManagerMock = AccessibilityManager as unknown as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalOS = Platform.OS;

/**
 * The orchestrator is a singleton with private isInitialized state. Reach in to
 * reset it to a clean pre-init state between tests so each case is independent.
 */
function getFreshManager(): WebOptimizationsManager {
  const mgr = WebOptimizationsManager.getInstance();
  (mgr as unknown as { isInitialized: boolean }).isInitialized = false;
  (mgr as unknown as { pwaManager?: unknown }).pwaManager = undefined;
  (mgr as unknown as { seoManager?: unknown }).seoManager = undefined;
  (mgr as unknown as { performanceTracker?: unknown }).performanceTracker =
    undefined;
  (mgr as unknown as { imageOptimizer?: unknown }).imageOptimizer = undefined;
  (mgr as unknown as { accessibilityManager?: unknown }).accessibilityManager =
    undefined;
  return mgr;
}

beforeEach(() => {
  jest.clearAllMocks();
  (Platform as { OS: string }).OS = 'web';
});

afterEach(() => {
  (Platform as { OS: string }).OS = originalOS;
});

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

describe('WebOptimizationsManager.getInstance', () => {
  it('returns the same singleton instance on repeated calls', () => {
    const a = WebOptimizationsManager.getInstance();
    const b = WebOptimizationsManager.getInstance();
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// initialize()
// ---------------------------------------------------------------------------

describe('initialize', () => {
  it('constructs every sub-manager and fans out initialize() on web', async () => {
    const mgr = getFreshManager();

    await mgr.initialize();

    expect(PWAManagerMock).toHaveBeenCalledTimes(1);
    expect(SEOManagerMock).toHaveBeenCalledTimes(1);
    expect(PerformanceTrackerMock).toHaveBeenCalledTimes(1);
    expect(ImageOptimizerMock).toHaveBeenCalledTimes(1);
    expect(AccessibilityManagerMock).toHaveBeenCalledTimes(1);

    expect(mockPwaInstance.initialize).toHaveBeenCalledTimes(1);
    expect(mockSeoInstance.initialize).toHaveBeenCalledTimes(1);
    expect(mockPerfInstance.initialize).toHaveBeenCalledTimes(1);
    expect(mockImageInstance.initialize).toHaveBeenCalledTimes(1);
    expect(mockA11yInstance.initialize).toHaveBeenCalledTimes(1);

    expect(mgr.initialized).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      'WebOptimizationsManager',
      'Initializing web optimizations'
    );
    expect(logger.info).toHaveBeenCalledWith(
      'WebOptimizationsManager',
      'All web optimizations initialized successfully'
    );
  });

  it('merges the default config with caller overrides per module', async () => {
    const mgr = getFreshManager();

    await mgr.initialize({
      pwa: { appName: 'Custom' },
      seo: { siteName: 'CustomSite' },
      analytics: { enableUserTiming: false },
      image: { compressionQuality: 50 },
      accessibility: { enableAriaLabels: false },
    });

    expect(PWAManagerMock).toHaveBeenCalledWith(
      expect.objectContaining({ appName: 'Custom', shortName: 'Mintenance' })
    );
    expect(SEOManagerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        siteName: 'CustomSite',
        enableStructuredData: true,
      })
    );
    expect(PerformanceTrackerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enableUserTiming: false,
        enableScrollDepthTracking: true,
      })
    );
    expect(ImageOptimizerMock).toHaveBeenCalledWith(
      expect.objectContaining({ compressionQuality: 50, enableWebP: true })
    );
    expect(AccessibilityManagerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enableAriaLabels: false,
        enableKeyboardNavigation: true,
      })
    );
  });

  it('uses pure defaults when called with no config', async () => {
    const mgr = getFreshManager();

    await mgr.initialize();

    expect(PWAManagerMock).toHaveBeenCalledWith(
      expect.objectContaining({ appName: 'Mintenance' })
    );
  });

  it('early-returns on non-web platforms without constructing sub-managers', async () => {
    const mgr = getFreshManager();
    (Platform as { OS: string }).OS = 'ios';

    await mgr.initialize();

    expect(PWAManagerMock).not.toHaveBeenCalled();
    expect(mgr.initialized).toBe(false);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('early-returns (idempotent) when already initialized', async () => {
    const mgr = getFreshManager();

    await mgr.initialize();
    jest.clearAllMocks();

    await mgr.initialize();

    expect(PWAManagerMock).not.toHaveBeenCalled();
    expect(mockPwaInstance.initialize).not.toHaveBeenCalled();
  });

  it('logs, rethrows, and stays uninitialized when a sub-manager fails to initialize', async () => {
    const mgr = getFreshManager();
    const boom = new Error('init failed');
    mockPerfInstance.initialize.mockRejectedValueOnce(boom);

    await expect(mgr.initialize()).rejects.toThrow('init failed');

    expect(mgr.initialized).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'WebOptimizationsManager',
      'Failed to initialize web optimizations',
      boom
    );
  });
});

// ---------------------------------------------------------------------------
// Delegating methods AFTER initialize (managers present)
// ---------------------------------------------------------------------------

describe('delegation when initialized', () => {
  let mgr: WebOptimizationsManager;

  beforeEach(async () => {
    mgr = getFreshManager();
    await mgr.initialize();
  });

  it('PWA: isPWAInstalled / getServiceWorker', () => {
    expect(mgr.isPWAInstalled()).toBe(true);
    expect(mockPwaInstance.isPWAInstalled).toHaveBeenCalled();
    expect(mgr.getServiceWorker()).toEqual({ scope: '/' });
    expect(mockPwaInstance.getServiceWorker).toHaveBeenCalled();
  });

  it('SEO: updatePageTitle / updatePageDescription / updatePageMetadata / setCanonicalUrl', () => {
    mgr.updatePageTitle('T');
    expect(mockSeoInstance.updateTitle).toHaveBeenCalledWith('T');

    mgr.updatePageDescription('D');
    expect(mockSeoInstance.updateDescription).toHaveBeenCalledWith('D');

    const meta = { title: 'X', keywords: ['a'] };
    mgr.updatePageMetadata(meta);
    expect(mockSeoInstance.updatePageMetadata).toHaveBeenCalledWith(meta);

    mgr.setCanonicalUrl('https://x');
    expect(mockSeoInstance.setCanonicalUrl).toHaveBeenCalledWith('https://x');
  });

  it('Performance: trackEvent / trackTiming / getWebVitals / getSessionDuration', () => {
    mgr.trackEvent('click', { id: 1 });
    expect(mockPerfInstance.trackEvent).toHaveBeenCalledWith('click', {
      id: 1,
    });

    mgr.trackEvent('noprops');
    expect(mockPerfInstance.trackEvent).toHaveBeenCalledWith('noprops', {});

    mgr.trackTiming('cat', 'var', 42);
    expect(mockPerfInstance.trackTiming).toHaveBeenCalledWith('cat', 'var', 42);

    expect(mgr.getWebVitals()).toEqual({ lcp: 1234 });
    expect(mgr.getSessionDuration()).toBe(5000);
  });

  it('Image: preloadImage / isWebPSupported / getOptimizedImageUrl', () => {
    mgr.preloadImage('a.png', 'image/png');
    expect(mockImageInstance.preloadImage).toHaveBeenCalledWith(
      'a.png',
      'image/png'
    );

    mgr.preloadImage('b.png');
    expect(mockImageInstance.preloadImage).toHaveBeenCalledWith(
      'b.png',
      undefined
    );

    expect(mgr.isWebPSupported()).toBe(true);
    expect(mgr.getOptimizedImageUrl('raw.png')).toBe('optimized.webp');
  });

  it('Accessibility: announce / trapFocus / releaseFocusTrap / setPageTitle / prefers*', () => {
    mgr.announce('hi', 'assertive');
    expect(mockA11yInstance.announce).toHaveBeenCalledWith('hi', 'assertive');

    mgr.announce('default-priority');
    expect(mockA11yInstance.announce).toHaveBeenCalledWith(
      'default-priority',
      'polite'
    );

    const el = {} as HTMLElement;
    mgr.trapFocus(el);
    expect(mockA11yInstance.trapFocus).toHaveBeenCalledWith(el);

    mgr.releaseFocusTrap();
    expect(mockA11yInstance.releaseFocusTrap).toHaveBeenCalled();

    mgr.setPageTitle('PT');
    expect(mockA11yInstance.setPageTitle).toHaveBeenCalledWith('PT');

    expect(mgr.prefersReducedMotion()).toBe(true);
    expect(mgr.prefersHighContrast()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Delegating methods BEFORE initialize (managers absent → nullish fallbacks)
// ---------------------------------------------------------------------------

describe('nullish fallbacks when not initialized', () => {
  let mgr: WebOptimizationsManager;

  beforeEach(() => {
    mgr = getFreshManager();
  });

  it('boolean/number getters return their fallback defaults', () => {
    expect(mgr.isPWAInstalled()).toBe(false);
    expect(mgr.getServiceWorker()).toBeUndefined();
    expect(mgr.getWebVitals()).toEqual({});
    expect(mgr.getSessionDuration()).toBe(0);
    expect(mgr.isWebPSupported()).toBe(false);
    expect(mgr.prefersReducedMotion()).toBe(false);
    expect(mgr.prefersHighContrast()).toBe(false);
  });

  it('getOptimizedImageUrl returns the input url unchanged', () => {
    expect(mgr.getOptimizedImageUrl('passthrough.png')).toBe('passthrough.png');
  });

  it('void delegators are safe no-ops when managers are absent', () => {
    expect(() => {
      mgr.updatePageTitle('T');
      mgr.updatePageDescription('D');
      mgr.updatePageMetadata({ title: 'X' });
      mgr.setCanonicalUrl('u');
      mgr.trackEvent('e');
      mgr.trackTiming('c', 'v', 1);
      mgr.preloadImage('p.png');
      mgr.announce('m');
      mgr.trapFocus({} as HTMLElement);
      mgr.releaseFocusTrap();
      mgr.setPageTitle('P');
    }).not.toThrow();

    expect(mockSeoInstance.updateTitle).not.toHaveBeenCalled();
    expect(mockPerfInstance.trackEvent).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// dispose()
// ---------------------------------------------------------------------------

describe('dispose', () => {
  it('unregisters PWA, disposes the image optimizer, clears state, and logs', async () => {
    const mgr = getFreshManager();
    await mgr.initialize();
    jest.clearAllMocks();

    mgr.dispose();

    expect(mockPwaInstance.unregister).toHaveBeenCalledTimes(1);
    expect(mockImageInstance.dispose).toHaveBeenCalledTimes(1);
    expect(mgr.initialized).toBe(false);
    expect(logger.info).toHaveBeenCalledWith(
      'WebOptimizationsManager',
      'Web optimizations disposed'
    );
    expect(
      (mgr as unknown as { pwaManager?: unknown }).pwaManager
    ).toBeUndefined();
  });

  it('early-returns when not initialized (no unregister, no log)', () => {
    const mgr = getFreshManager();

    mgr.dispose();

    expect(mockPwaInstance.unregister).not.toHaveBeenCalled();
    expect(mockImageInstance.dispose).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('catches and logs errors thrown during disposal', async () => {
    const mgr = getFreshManager();
    await mgr.initialize();
    jest.clearAllMocks();
    const boom = new Error('dispose boom');
    mockPwaInstance.unregister.mockImplementationOnce(() => {
      throw boom;
    });

    expect(() => mgr.dispose()).not.toThrow();
    expect(logger.error).toHaveBeenCalledWith(
      'WebOptimizationsManager',
      'Error disposing web optimizations',
      boom
    );
  });
});
