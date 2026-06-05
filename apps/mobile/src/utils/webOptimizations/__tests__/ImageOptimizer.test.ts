/**
 * Unit tests for ImageOptimizer (web optimizations).
 *
 * The source is web-only: every public method early-returns unless
 * Platform.OS === 'web', and the private setup methods touch the DOM
 * (document/window/IntersectionObserver/MutationObserver) directly. The mobile
 * Jest environment is `node` (no jsdom), so this suite installs minimal but
 * behaviourally-real DOM/window/observer stubs on `global` and flips the shared
 * react-native Platform mock to 'web' to exercise the web branches.
 *
 * Only externals are mocked: the logger and the global DOM/window/observer
 * APIs. The ImageOptimizer class itself is exercised for real.
 */

import { Platform } from 'react-native';
import { ImageOptimizer } from '../ImageOptimizer';
import { ImageOptimizationConfig } from '../types';

jest.mock('../../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { logger } = require('../../logger');

// ---------------------------------------------------------------------------
// Minimal DOM element stub
// ---------------------------------------------------------------------------

class FakeClassList {
  private set = new Set<string>();
  add(c: string) {
    this.set.add(c);
  }
  remove(c: string) {
    this.set.delete(c);
  }
  contains(c: string) {
    return this.set.has(c);
  }
}

class FakeElement {
  tagName: string;
  rel = '';
  href = '';
  as = '';
  type = '';
  crossOrigin = '';
  width = 0;
  height = 0;
  className = '';
  src = '';
  srcset = '';
  classList = new FakeClassList();
  attributes: Record<string, string> = {};
  dataset: Record<string, string> = {};
  listeners: Record<string, ((e: unknown) => void)[]> = {};
  _querySelectorAllResult: FakeElement[] = [];

  // canvas
  toDataURLReturn = 'data:image/webp;base64,AAAA';

  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }
  hasAttribute(name: string) {
    return name in this.attributes;
  }
  addEventListener(type: string, cb: (e: unknown) => void) {
    (this.listeners[type] ||= []).push(cb);
  }
  dispatch(type: string, event: unknown) {
    (this.listeners[type] || []).forEach((cb) => cb(event));
  }
  querySelectorAll(_sel: string): FakeElement[] {
    return this._querySelectorAllResult;
  }
  toDataURL(_mime: string) {
    return this.toDataURLReturn;
  }
}

// ---------------------------------------------------------------------------
// Observer stubs
// ---------------------------------------------------------------------------

interface ObserverState {
  observed: FakeElement[];
  unobserved: FakeElement[];
  disconnectCount: number;
  callback: (entries: unknown[], observer: unknown) => void;
  options: unknown;
  trigger: (
    entries: { isIntersecting: boolean; target: FakeElement }[]
  ) => void;
}

interface MutationObserverState {
  observeCalls: { target: unknown; options: unknown }[];
  callback: (mutations: unknown[]) => void;
  trigger: (mutations: unknown[]) => void;
}

// ---------------------------------------------------------------------------
// DOM harness
// ---------------------------------------------------------------------------

function buildDom() {
  const created: FakeElement[] = [];
  const head = new FakeElement('head');
  const body = new FakeElement('body');
  const documentElement = new FakeElement('html');

  const documentStub = {
    head: {
      appended: [] as FakeElement[],
      appendChild(el: FakeElement) {
        this.appended.push(el);
        return el;
      },
    },
    body,
    documentElement,
    _querySelectorAllResult: [] as FakeElement[],
    createElement(tag: string) {
      const el = new FakeElement(tag);
      created.push(el);
      return el;
    },
    querySelectorAll(_sel: string): FakeElement[] {
      return documentStub._querySelectorAllResult;
    },
  };

  const intersectionObservers: ObserverState[] = [];
  const mutationObservers: MutationObserverState[] = [];

  class FakeIntersectionObserver {
    state: ObserverState;
    constructor(
      cb: (entries: unknown[], observer: unknown) => void,
      options: unknown
    ) {
      this.state = {
        observed: [],
        unobserved: [],
        disconnectCount: 0,
        callback: cb,
        options,
        trigger: (entries) => cb(entries, this),
      };
      intersectionObservers.push(this.state);
    }
    observe(el: FakeElement) {
      this.state.observed.push(el);
    }
    unobserve(el: FakeElement) {
      this.state.unobserved.push(el);
    }
    disconnect() {
      this.state.disconnectCount += 1;
    }
  }

  class FakeMutationObserver {
    state: MutationObserverState;
    constructor(cb: (mutations: unknown[]) => void) {
      this.state = {
        observeCalls: [],
        callback: cb,
        trigger: (mutations) => cb(mutations),
      };
      mutationObservers.push(this.state);
    }
    observe(target: unknown, options: unknown) {
      this.state.observeCalls.push({ target, options });
    }
    disconnect() {
      /* no-op */
    }
  }

  // window with IntersectionObserver present by default
  const windowStub: Record<string, unknown> = {
    IntersectionObserver: FakeIntersectionObserver,
  };

  return {
    documentStub,
    windowStub,
    created,
    head,
    body,
    documentElement,
    intersectionObservers,
    mutationObservers,
    FakeIntersectionObserver,
    FakeMutationObserver,
  };
}

type Dom = ReturnType<typeof buildDom>;

const fullConfig: ImageOptimizationConfig = {
  enableWebP: true,
  enableLazyLoading: true,
  enableProgressiveJPEG: true,
  compressionQuality: 80,
  enableCriticalResourceHints: true,
};

describe('ImageOptimizer', () => {
  let dom: Dom;
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'web';
    dom = buildDom();
    (global as unknown as { document: unknown }).document = dom.documentStub;
    (global as unknown as { window: unknown }).window = dom.windowStub;
    (
      global as unknown as { IntersectionObserver: unknown }
    ).IntersectionObserver = dom.FakeIntersectionObserver;
    (global as unknown as { MutationObserver: unknown }).MutationObserver =
      dom.FakeMutationObserver;
  });

  afterEach(() => {
    (Platform as { OS: string }).OS = originalOS;
    delete (global as unknown as { document?: unknown }).document;
    delete (global as unknown as { window?: unknown }).window;
    delete (global as unknown as { IntersectionObserver?: unknown })
      .IntersectionObserver;
    delete (global as unknown as { MutationObserver?: unknown })
      .MutationObserver;
  });

  // -------------------------------------------------------------------------
  // initialize()
  // -------------------------------------------------------------------------

  describe('initialize', () => {
    it('does nothing on non-web platforms', () => {
      (Platform as { OS: string }).OS = 'ios';
      const opt = new ImageOptimizer(fullConfig);
      opt.initialize();

      expect(dom.created).toHaveLength(0);
      expect(dom.intersectionObservers).toHaveLength(0);
      expect(logger.info).not.toHaveBeenCalledWith(
        'ImageOptimizer',
        'Initializing image optimizations'
      );
    });

    it('runs all three features when every flag is enabled', () => {
      const opt = new ImageOptimizer(fullConfig);
      opt.initialize();

      // WebP support check created a canvas
      const canvas = dom.created.find((e) => e.tagName === 'CANVAS');
      expect(canvas).toBeDefined();
      expect(canvas!.width).toBe(1);
      expect(canvas!.height).toBe(1);

      // Lazy loading wired an IntersectionObserver + MutationObserver
      expect(dom.intersectionObservers).toHaveLength(1);
      expect(dom.mutationObservers).toHaveLength(1);

      // Critical resource hints appended 3 preload links to head
      expect(dom.documentStub.head.appended.length).toBe(3);

      expect(logger.info).toHaveBeenCalledWith(
        'ImageOptimizer',
        'Image optimizations initialized successfully'
      );
    });

    it('skips each feature when its flag is disabled', () => {
      const opt = new ImageOptimizer({
        enableWebP: false,
        enableLazyLoading: false,
        enableProgressiveJPEG: false,
        compressionQuality: 50,
        enableCriticalResourceHints: false,
      });
      opt.initialize();

      expect(dom.created.find((e) => e.tagName === 'CANVAS')).toBeUndefined();
      expect(dom.intersectionObservers).toHaveLength(0);
      expect(dom.documentStub.head.appended.length).toBe(0);
      expect(logger.info).toHaveBeenCalledWith(
        'ImageOptimizer',
        'Image optimizations initialized successfully'
      );
    });

    it('captures and logs errors thrown during initialization', () => {
      // Force checkWebPSupport to throw by removing createElement
      (
        dom.documentStub as unknown as { createElement: unknown }
      ).createElement = () => {
        throw new Error('boom');
      };
      const opt = new ImageOptimizer(fullConfig);
      opt.initialize();

      expect(logger.error).toHaveBeenCalledWith(
        'ImageOptimizer',
        'Failed to initialize image optimizations',
        expect.any(Error)
      );
    });
  });

  // -------------------------------------------------------------------------
  // checkWebPSupport (via initialize)
  // -------------------------------------------------------------------------

  describe('WebP support detection', () => {
    it('marks support and adds "webp" class when toDataURL returns a webp data URL', () => {
      const opt = new ImageOptimizer({
        ...fullConfig,
        enableLazyLoading: false,
        enableCriticalResourceHints: false,
      });
      opt.initialize();

      expect(opt.isWebPSupported()).toBe(true);
      expect(dom.documentElement.classList.contains('webp')).toBe(true);
      expect(dom.documentElement.classList.contains('no-webp')).toBe(false);
    });

    it('marks no-support and adds "no-webp" class when toDataURL does not return webp', () => {
      // Override createElement so the canvas returns a non-webp data URL
      const realCreate = dom.documentStub.createElement.bind(dom.documentStub);
      (
        dom.documentStub as unknown as {
          createElement: (t: string) => FakeElement;
        }
      ).createElement = (tag: string) => {
        const el = realCreate(tag);
        if (el.tagName === 'CANVAS') {
          el.toDataURLReturn = 'data:image/png;base64,AAAA';
        }
        return el;
      };

      const opt = new ImageOptimizer({
        ...fullConfig,
        enableLazyLoading: false,
        enableCriticalResourceHints: false,
      });
      opt.initialize();

      expect(opt.isWebPSupported()).toBe(false);
      expect(dom.documentElement.classList.contains('no-webp')).toBe(true);
      expect(dom.documentElement.classList.contains('webp')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // setupLazyLoading / observeLazyImages / watchForNewImages
  // -------------------------------------------------------------------------

  describe('lazy loading', () => {
    it('falls back to immediate loading when IntersectionObserver is unsupported', () => {
      delete (dom.windowStub as { IntersectionObserver?: unknown })
        .IntersectionObserver;

      const lazyImg = new FakeElement('img');
      lazyImg.dataset.src = '/img/a.png';
      dom.documentStub._querySelectorAllResult = [lazyImg];

      const opt = new ImageOptimizer({
        ...fullConfig,
        enableWebP: false,
        enableCriticalResourceHints: false,
      });
      opt.initialize();

      // No observer created
      expect(dom.intersectionObservers).toHaveLength(0);
      // Fallback loaded the image directly
      expect(lazyImg.src).toBe('/img/a.png');
      expect(logger.warn).toHaveBeenCalledWith(
        'ImageOptimizer',
        'IntersectionObserver not supported, falling back to immediate loading'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'ImageOptimizer',
        'Fallback loading applied',
        { count: 1 }
      );
    });

    it('observes existing lazy images and wires a MutationObserver', () => {
      const img1 = new FakeElement('img');
      const img2 = new FakeElement('img');
      dom.documentStub._querySelectorAllResult = [img1, img2];

      const opt = new ImageOptimizer({
        ...fullConfig,
        enableWebP: false,
        enableCriticalResourceHints: false,
      });
      opt.initialize();

      const io = dom.intersectionObservers[0];
      expect(io.observed).toEqual([img1, img2]);
      expect(io.options).toEqual({ rootMargin: '50px 0px', threshold: 0.01 });

      const mo = dom.mutationObservers[0];
      expect(mo.observeCalls).toHaveLength(1);
      expect(mo.observeCalls[0].target).toBe(dom.body);
      expect(mo.observeCalls[0].options).toEqual({
        childList: true,
        subtree: true,
      });
    });

    it('loads + unobserves an image only once it intersects', () => {
      const img = new FakeElement('img');
      img.dataset.src = '/img/lazy.png';
      img.dataset.srcset = '/img/lazy-2x.png 2x';
      dom.documentStub._querySelectorAllResult = [img];

      const opt = new ImageOptimizer({
        ...fullConfig,
        enableWebP: false,
        enableCriticalResourceHints: false,
      });
      opt.initialize();

      const io = dom.intersectionObservers[0];

      // Not intersecting: nothing happens
      io.trigger([{ isIntersecting: false, target: img }]);
      expect(img.src).toBe('');
      expect(io.unobserved).toHaveLength(0);

      // Intersecting: loads + unobserves
      io.trigger([{ isIntersecting: true, target: img }]);
      expect(img.src).toBe('/img/lazy.png');
      expect(img.srcset).toBe('/img/lazy-2x.png 2x');
      expect(io.unobserved).toEqual([img]);
    });
  });

  // -------------------------------------------------------------------------
  // watchForNewImages MutationObserver callback
  // -------------------------------------------------------------------------

  describe('MutationObserver callback', () => {
    function setupWithObserver() {
      const opt = new ImageOptimizer({
        ...fullConfig,
        enableWebP: false,
        enableCriticalResourceHints: false,
      });
      opt.initialize();
      return dom.mutationObservers[0];
    }

    it('observes an added IMG node that has the lazy class', () => {
      const mo = setupWithObserver();
      const io = dom.intersectionObservers[0];

      const newImg = new FakeElement('img');
      newImg.classList.add('lazy');

      mo.trigger([{ addedNodes: [nodeWrap(newImg)] }]);
      expect(io.observed).toContain(newImg);
    });

    it('observes an added IMG node that has a data-src attribute', () => {
      const mo = setupWithObserver();
      const io = dom.intersectionObservers[0];

      const newImg = new FakeElement('img');
      newImg.setAttribute('data-src', '/x.png');

      mo.trigger([{ addedNodes: [nodeWrap(newImg)] }]);
      expect(io.observed).toContain(newImg);
    });

    it('observes lazy images nested within an added node', () => {
      const mo = setupWithObserver();
      const io = dom.intersectionObservers[0];

      const nested = new FakeElement('img');
      const container = new FakeElement('div');
      container._querySelectorAllResult = [nested];

      mo.trigger([{ addedNodes: [nodeWrap(container)] }]);
      expect(io.observed).toContain(nested);
    });

    it('ignores non-element nodes (nodeType !== 1)', () => {
      const mo = setupWithObserver();
      const io = dom.intersectionObservers[0];
      const before = io.observed.length;

      mo.trigger([{ addedNodes: [{ nodeType: 3 }] }]);
      expect(io.observed.length).toBe(before);
    });

    it('does not observe a plain element with no lazy children', () => {
      const mo = setupWithObserver();
      const io = dom.intersectionObservers[0];
      const before = io.observed.length;

      const plain = new FakeElement('div');
      plain._querySelectorAllResult = [];

      mo.trigger([{ addedNodes: [nodeWrap(plain)] }]);
      expect(io.observed.length).toBe(before);
    });
  });

  // -------------------------------------------------------------------------
  // loadImage (exercised via intersection + fallback)
  // -------------------------------------------------------------------------

  describe('loadImage edge cases', () => {
    function loadViaIntersection(img: FakeElement) {
      dom.documentStub._querySelectorAllResult = [img];
      const opt = new ImageOptimizer({
        ...fullConfig,
        enableWebP: false,
        enableCriticalResourceHints: false,
      });
      opt.initialize();
      dom.intersectionObservers[0].trigger([
        { isIntersecting: true, target: img },
      ]);
    }

    it('returns early when neither src nor srcset present', () => {
      const img = new FakeElement('img');
      loadViaIntersection(img);

      expect(img.getAttribute('loading')).toBeNull();
      expect(img.src).toBe('');
      expect(img.srcset).toBe('');
    });

    it('sets only src when no srcset present and cleans up dataset/class', () => {
      const img = new FakeElement('img');
      img.classList.add('lazy');
      img.dataset.src = '/only-src.jpg';
      loadViaIntersection(img);

      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.src).toBe('/only-src.jpg');
      expect(img.srcset).toBe('');
      expect(img.classList.contains('lazy')).toBe(false);
      expect(img.dataset.src).toBeUndefined();
    });

    it('sets only srcset when no src present', () => {
      const img = new FakeElement('img');
      img.dataset.srcset = '/a.png 1x, /b.png 2x';
      loadViaIntersection(img);

      expect(img.srcset).toBe('/a.png 1x, /b.png 2x');
      expect(img.src).toBe('');
      expect(img.dataset.srcset).toBeUndefined();
    });

    it('adds the "loaded" class once the image fires its load event', () => {
      const img = new FakeElement('img');
      img.dataset.src = '/x.png';
      loadViaIntersection(img);

      expect(img.classList.contains('loaded')).toBe(false);
      img.dispatch('load', {});
      expect(img.classList.contains('loaded')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // addCriticalResourceHints (via initialize)
  // -------------------------------------------------------------------------

  describe('critical resource hints', () => {
    it('appends preload links including a crossOrigin font hint', () => {
      const opt = new ImageOptimizer({
        ...fullConfig,
        enableWebP: false,
        enableLazyLoading: false,
      });
      opt.initialize();

      const links = dom.documentStub.head.appended;
      expect(links).toHaveLength(3);

      const iconLink = links.find((l) => l.href === '/assets/icon.png');
      expect(iconLink).toBeDefined();
      expect(iconLink!.rel).toBe('preload');
      expect(iconLink!.as).toBe('image');
      expect(iconLink!.type).toBe('image/png');
      expect(iconLink!.crossOrigin).toBe('');

      const fontLink = links.find((l) => l.as === 'font');
      expect(fontLink).toBeDefined();
      expect(fontLink!.href).toBe('/assets/fonts/main.woff2');
      expect(fontLink!.type).toBe('font/woff2');
      expect(fontLink!.crossOrigin).toBe('anonymous');

      expect(logger.info).toHaveBeenCalledWith(
        'ImageOptimizer',
        'Critical resource hints added',
        { count: 3 }
      );
    });
  });

  // -------------------------------------------------------------------------
  // preloadImage
  // -------------------------------------------------------------------------

  describe('preloadImage', () => {
    it('no-ops on non-web platforms', () => {
      (Platform as { OS: string }).OS = 'android';
      const opt = new ImageOptimizer(fullConfig);
      opt.preloadImage('/foo.png');
      expect(dom.documentStub.head.appended).toHaveLength(0);
    });

    it('appends a preload link with the default png type', () => {
      const opt = new ImageOptimizer(fullConfig);
      opt.preloadImage('/foo.png');

      const link = dom.documentStub.head.appended[0];
      expect(link.rel).toBe('preload');
      expect(link.href).toBe('/foo.png');
      expect(link.as).toBe('image');
      expect(link.type).toBe('image/png');
    });

    it('honours an explicit type argument', () => {
      const opt = new ImageOptimizer(fullConfig);
      opt.preloadImage('/foo.webp', 'image/webp');

      const link = dom.documentStub.head.appended[0];
      expect(link.type).toBe('image/webp');
    });
  });

  // -------------------------------------------------------------------------
  // getOptimizedImageUrl
  // -------------------------------------------------------------------------

  describe('getOptimizedImageUrl', () => {
    function optimizerWithWebP(supported: boolean) {
      const opt = new ImageOptimizer({
        ...fullConfig,
        enableLazyLoading: false,
        enableCriticalResourceHints: false,
      });
      if (!supported) {
        // make canvas return a non-webp data URL
        const realCreate = dom.documentStub.createElement.bind(
          dom.documentStub
        );
        (
          dom.documentStub as unknown as {
            createElement: (t: string) => FakeElement;
          }
        ).createElement = (tag: string) => {
          const el = realCreate(tag);
          if (el.tagName === 'CANVAS')
            el.toDataURLReturn = 'data:image/png;base64,Z';
          return el;
        };
      }
      opt.initialize();
      return opt;
    }

    it('returns the original url unchanged when WebP is not supported', () => {
      const opt = optimizerWithWebP(false);
      expect(opt.getOptimizedImageUrl('/pic.jpg')).toBe('/pic.jpg');
    });

    it('returns url as-is when it already ends with .webp', () => {
      const opt = optimizerWithWebP(true);
      expect(opt.getOptimizedImageUrl('/pic.webp')).toBe('/pic.webp');
    });

    it('rewrites .jpg/.jpeg/.png extensions to .webp when supported', () => {
      const opt = optimizerWithWebP(true);
      expect(opt.getOptimizedImageUrl('/pic.jpg')).toBe('/pic.webp');
      expect(opt.getOptimizedImageUrl('/pic.JPEG')).toBe('/pic.webp');
      expect(opt.getOptimizedImageUrl('/pic.PNG')).toBe('/pic.webp');
    });

    it('leaves unsupported extensions untouched even when WebP is supported', () => {
      const opt = optimizerWithWebP(true);
      expect(opt.getOptimizedImageUrl('/pic.gif')).toBe('/pic.gif');
    });
  });

  // -------------------------------------------------------------------------
  // dispose
  // -------------------------------------------------------------------------

  describe('dispose', () => {
    it('disconnects an active IntersectionObserver and clears it', () => {
      const opt = new ImageOptimizer({
        ...fullConfig,
        enableWebP: false,
        enableCriticalResourceHints: false,
      });
      opt.initialize();
      const io = dom.intersectionObservers[0];

      opt.dispose();
      expect(io.disconnectCount).toBe(1);

      // Disposing again is a no-op (observer already undefined)
      opt.dispose();
      expect(io.disconnectCount).toBe(1);
      expect(logger.info).toHaveBeenCalledWith(
        'ImageOptimizer',
        'Image optimizer disposed'
      );
    });

    it('is safe to call when no observer was ever created', () => {
      const opt = new ImageOptimizer({
        ...fullConfig,
        enableLazyLoading: false,
      });
      opt.initialize();
      expect(() => opt.dispose()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // isWebPSupported default
  // -------------------------------------------------------------------------

  it('isWebPSupported defaults to false before initialize', () => {
    const opt = new ImageOptimizer(fullConfig);
    expect(opt.isWebPSupported()).toBe(false);
  });
});

// Helper: build an added-node object the source treats as nodeType === 1.
function nodeWrap(el: FakeElement) {
  return Object.assign(el, { nodeType: 1 });
}
