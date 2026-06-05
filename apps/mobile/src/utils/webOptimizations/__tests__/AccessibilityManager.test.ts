/**
 * Unit tests for AccessibilityManager (web optimizations).
 *
 * The source is web-only: nearly every public method early-returns unless
 * Platform.OS === 'web', and the private setup methods touch the DOM directly.
 * The mobile Jest environment is `node` (no jsdom), so this suite installs a
 * minimal but behaviourally-real DOM/window stub on `global` and flips the
 * shared react-native Platform mock to 'web' to exercise the web branches.
 *
 * Only externals are mocked: the logger and the global DOM/window APIs. The
 * AccessibilityManager class itself is exercised for real.
 */

import { Platform } from 'react-native';
import { AccessibilityManager } from '../AccessibilityManager';
import { AccessibilityConfig } from '../types';

jest.mock('../../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

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
  id = '';
  href = '';
  textContent: string | null = '';
  className = '';
  title = '';
  style: { cssText: string } = { cssText: '' };
  classList = new FakeClassList();
  attributes: Record<string, string> = {};
  children: FakeElement[] = [];
  firstChild: FakeElement | null = null;
  listeners: Record<string, ((e: unknown) => void)[]> = {};
  _querySelectorAllResult: FakeElement[] = [];
  _querySelectorResult: FakeElement | null = null;

  focusCalled = 0;
  clickCalled = 0;
  scrollIntoViewArg: unknown = undefined;

  constructor(tagName = 'div') {
    this.tagName = tagName;
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }
  addEventListener(type: string, cb: (e: unknown) => void) {
    (this.listeners[type] ||= []).push(cb);
  }
  dispatch(type: string, event: unknown) {
    (this.listeners[type] || []).forEach((cb) => cb(event));
  }
  appendChild(child: FakeElement) {
    this.children.push(child);
    if (!this.firstChild) this.firstChild = child;
    return child;
  }
  insertBefore(child: FakeElement, _ref: FakeElement | null) {
    this.children.unshift(child);
    this.firstChild = child;
    return child;
  }
  querySelectorAll(_sel: string) {
    return this._querySelectorAllResult as unknown as FakeElement[];
  }
  querySelector(_sel: string) {
    return this._querySelectorResult;
  }
  focus() {
    this.focusCalled += 1;
  }
  click() {
    this.clickCalled += 1;
  }
  scrollIntoView(arg: unknown) {
    this.scrollIntoViewArg = arg;
  }
}

interface FakeMatchMedia {
  matches: boolean;
  media: string;
  listeners: ((e: { matches: boolean }) => void)[];
  addEventListener: (t: string, cb: (e: { matches: boolean }) => void) => void;
  trigger: (matches: boolean) => void;
}

// ---------------------------------------------------------------------------
// DOM harness
// ---------------------------------------------------------------------------

function buildDom() {
  const created: FakeElement[] = [];
  const elementsById: Record<string, FakeElement> = {};
  const head = new FakeElement('head');
  const body = new FakeElement('body');
  const mediaQueries: Record<string, FakeMatchMedia> = {};

  const makeMedia = (query: string, initial = false): FakeMatchMedia => {
    const mq: FakeMatchMedia = {
      matches: initial,
      media: query,
      listeners: [],
      addEventListener(_t, cb) {
        mq.listeners.push(cb);
      },
      trigger(matches: boolean) {
        mq.matches = matches;
        mq.listeners.forEach((cb) => cb({ matches }));
      },
    };
    mediaQueries[query] = mq;
    return mq;
  };

  const documentStub = {
    head,
    body,
    title: '',
    activeElement: null as FakeElement | null,
    listeners: {} as Record<string, ((e: unknown) => void)[]>,
    addEventListener(type: string, cb: (e: unknown) => void) {
      (documentStub.listeners[type] ||= []).push(cb);
    },
    dispatch(type: string, event: unknown) {
      (documentStub.listeners[type] || []).forEach((cb) => cb(event));
    },
    createElement(tag: string) {
      const el = new FakeElement(tag);
      created.push(el);
      return el;
    },
    getElementById(id: string) {
      return elementsById[id] ?? null;
    },
    querySelectorAll: (_sel: string): FakeElement[] => [],
    querySelector: jest.fn(() => null as FakeElement | null),
  };

  const windowStub = {
    matchMedia: jest.fn((query: string) => {
      return mediaQueries[query] || makeMedia(query, false);
    }),
  };

  return {
    documentStub,
    windowStub,
    created,
    elementsById,
    head,
    body,
    mediaQueries,
    makeMedia,
  };
}

type Dom = ReturnType<typeof buildDom>;

const baseConfig: AccessibilityConfig = {
  enableKeyboardNavigation: true,
  enableAriaLabels: true,
  enableFocusIndicators: true,
  enableScreenReaderOptimizations: true,
};

describe('AccessibilityManager', () => {
  let dom: Dom;
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.useFakeTimers();
    (Platform as { OS: string }).OS = 'web';
    dom = buildDom();
    (global as unknown as { document: unknown }).document = dom.documentStub;
    (global as unknown as { window: unknown }).window = dom.windowStub;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    (Platform as { OS: string }).OS = originalOS;
    delete (global as unknown as { document?: unknown }).document;
    delete (global as unknown as { window?: unknown }).window;
  });

  // -------------------------------------------------------------------------
  // initialize()
  // -------------------------------------------------------------------------

  describe('initialize', () => {
    it('does nothing on non-web platforms', () => {
      (Platform as { OS: string }).OS = 'ios';
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();
      expect(Object.keys(dom.documentStub.listeners)).toHaveLength(0);
      expect(dom.created).toHaveLength(0);
    });

    it('wires up all features when every config flag is enabled', () => {
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();

      expect(dom.documentStub.listeners.keydown).toHaveLength(1);
      expect(dom.documentStub.listeners.mousedown).toHaveLength(1);
      expect(dom.documentStub.listeners.focusin).toHaveLength(1);

      const styleEls = dom.created.filter((e) => e.tagName === 'style');
      expect(styleEls).toHaveLength(1);
      expect(dom.head.children).toContain(styleEls[0]);
      expect(styleEls[0].textContent).toContain('skip-link');

      const anchor = dom.created.find((e) => e.tagName === 'a');
      expect(anchor).toBeDefined();
      expect(anchor!.href).toBe('#main-content');
      expect(anchor!.className).toBe('skip-link');
      expect(anchor!.getAttribute('aria-label')).toBe('Skip to main content');
      expect(dom.body.children[0]).toBe(anchor);

      const politeRegion = dom.created.find((e) => e.id === 'aria-live-polite');
      const assertiveRegion = dom.created.find(
        (e) => e.id === 'aria-live-assertive'
      );
      expect(politeRegion).toBeDefined();
      expect(assertiveRegion).toBeDefined();
      expect(politeRegion!.getAttribute('aria-live')).toBe('polite');
      expect(assertiveRegion!.getAttribute('aria-live')).toBe('assertive');
      expect(politeRegion!.getAttribute('aria-atomic')).toBe('true');
      expect(dom.body.children).toContain(politeRegion);
      expect(dom.body.children).toContain(assertiveRegion);
    });

    it('skips disabled feature branches', () => {
      const mgr = new AccessibilityManager({
        enableKeyboardNavigation: false,
        enableAriaLabels: false,
        enableFocusIndicators: false,
        enableScreenReaderOptimizations: false,
      });
      mgr.initialize();

      expect(dom.documentStub.listeners.keydown).toBeUndefined();
      expect(dom.created.filter((e) => e.tagName === 'style')).toHaveLength(0);
      expect(
        dom.created.find((e) => e.id === 'aria-live-polite')
      ).toBeUndefined();
      expect(dom.created.find((e) => e.tagName === 'a')).toBeDefined();
    });

    it('catches and logs Error instances during initialization', () => {
      const { logger } = require('../../logger');
      dom.documentStub.createElement = jest.fn(() => {
        throw new Error('boom');
      });
      const mgr = new AccessibilityManager(baseConfig);
      expect(() => mgr.initialize()).not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        'AccessibilityManager',
        'Failed to initialize accessibility',
        { error: 'boom' }
      );
    });

    it('handles non-Error throwables in the catch via String()', () => {
      const { logger } = require('../../logger');
      dom.documentStub.createElement = jest.fn(() => {
        throw 'string failure';
      });
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();
      expect(logger.error).toHaveBeenCalledWith(
        'AccessibilityManager',
        'Failed to initialize accessibility',
        { error: 'string failure' }
      );
    });

    it('returns early from setupUserPreferences when matchMedia is absent', () => {
      (dom.windowStub as { matchMedia?: unknown }).matchMedia = undefined;
      const mgr = new AccessibilityManager(baseConfig);
      expect(() => mgr.initialize()).not.toThrow();
      expect(dom.body.classList.contains('high-contrast')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard navigation behaviour
  // -------------------------------------------------------------------------

  describe('keyboard navigation', () => {
    it('Tab key clears mouse-navigation flag and class', () => {
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();
      dom.documentStub.dispatch('mousedown', {});
      expect(dom.body.classList.contains('mouse-navigation')).toBe(true);
      dom.documentStub.dispatch('keydown', { key: 'Tab' });
      expect(dom.body.classList.contains('mouse-navigation')).toBe(false);
    });

    it('focusin removes mouse-navigation class when not using mouse', () => {
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();
      dom.body.classList.add('mouse-navigation');
      dom.documentStub.dispatch('keydown', { key: 'Tab' });
      dom.documentStub.dispatch('focusin', {});
      expect(dom.body.classList.contains('mouse-navigation')).toBe(false);
    });

    it('focusin keeps mouse-navigation class when using mouse', () => {
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();
      dom.documentStub.dispatch('mousedown', {});
      dom.documentStub.dispatch('focusin', {});
      expect(dom.body.classList.contains('mouse-navigation')).toBe(true);
    });

    it('Escape with an open modal clicks its close button', () => {
      const { logger } = require('../../logger');
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();

      const closeBtn = new FakeElement('button');
      const modal = new FakeElement('div');
      modal._querySelectorResult = closeBtn;
      dom.documentStub.querySelectorAll = () => [modal];

      dom.documentStub.dispatch('keydown', { key: 'Escape' });
      expect(closeBtn.clickCalled).toBe(1);
      expect(logger.debug).toHaveBeenCalledWith(
        'AccessibilityManager',
        'Modal closed via Escape key'
      );
    });

    it('Escape with a modal but no close button does nothing', () => {
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();
      const modal = new FakeElement('div');
      modal._querySelectorResult = null;
      dom.documentStub.querySelectorAll = () => [modal];
      expect(() =>
        dom.documentStub.dispatch('keydown', { key: 'Escape' })
      ).not.toThrow();
    });

    it('Escape with no modals present is a no-op', () => {
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();
      dom.documentStub.querySelectorAll = () => [];
      expect(() =>
        dom.documentStub.dispatch('keydown', { key: 'Escape' })
      ).not.toThrow();
    });

    it('ignores unrelated keys', () => {
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();
      dom.documentStub.dispatch('mousedown', {});
      dom.documentStub.dispatch('keydown', { key: 'a' });
      expect(dom.body.classList.contains('mouse-navigation')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Skip link click handler
  // -------------------------------------------------------------------------

  describe('skip link', () => {
    it('focuses and scrolls to #main-content on click', () => {
      const main = new FakeElement('main');
      dom.elementsById['main-content'] = main;
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();

      const anchor = dom.created.find((e) => e.tagName === 'a')!;
      const preventDefault = jest.fn();
      anchor.dispatch('click', { preventDefault });

      expect(preventDefault).toHaveBeenCalled();
      expect(main.getAttribute('tabindex')).toBe('-1');
      expect(main.focusCalled).toBe(1);
      expect(main.scrollIntoViewArg).toEqual({ behavior: 'smooth' });
    });

    it('falls back to querySelector(main) when getElementById misses', () => {
      const main = new FakeElement('main');
      dom.documentStub.querySelector = jest.fn(() => main);
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();
      const anchor = dom.created.find((e) => e.tagName === 'a')!;
      anchor.dispatch('click', { preventDefault: jest.fn() });
      expect(main.focusCalled).toBe(1);
    });

    it('does nothing when no main content exists', () => {
      dom.documentStub.querySelector = jest.fn(() => null);
      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();
      const anchor = dom.created.find((e) => e.tagName === 'a')!;
      expect(() =>
        anchor.dispatch('click', { preventDefault: jest.fn() })
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // User preference detection
  // -------------------------------------------------------------------------

  describe('user preferences', () => {
    it('applies initial matched preferences and reacts to changes', () => {
      const hc = dom.makeMedia('(prefers-contrast: high)', true);
      const rm = dom.makeMedia('(prefers-reduced-motion: reduce)', false);
      const dk = dom.makeMedia('(prefers-color-scheme: dark)', true);

      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();

      expect(dom.body.classList.contains('high-contrast')).toBe(true);
      expect(dom.body.classList.contains('reduced-motion')).toBe(false);
      expect(dom.body.classList.contains('dark-mode')).toBe(true);

      hc.trigger(false);
      expect(dom.body.classList.contains('high-contrast')).toBe(false);
      rm.trigger(true);
      expect(dom.body.classList.contains('reduced-motion')).toBe(true);
      dk.trigger(false);
      expect(dom.body.classList.contains('dark-mode')).toBe(false);
    });

    it('removes classes when initial preferences are not matched', () => {
      dom.makeMedia('(prefers-contrast: high)', false);
      dom.makeMedia('(prefers-reduced-motion: reduce)', false);
      dom.makeMedia('(prefers-color-scheme: dark)', false);
      dom.body.classList.add('high-contrast');
      dom.body.classList.add('reduced-motion');
      dom.body.classList.add('dark-mode');

      const mgr = new AccessibilityManager(baseConfig);
      mgr.initialize();

      expect(dom.body.classList.contains('high-contrast')).toBe(false);
      expect(dom.body.classList.contains('reduced-motion')).toBe(false);
      expect(dom.body.classList.contains('dark-mode')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // announce()
  // -------------------------------------------------------------------------

  describe('announce', () => {
    it('does nothing on non-web', () => {
      (Platform as { OS: string }).OS = 'android';
      const mgr = new AccessibilityManager(baseConfig);
      mgr.announce('hi');
      expect(dom.created).toHaveLength(0);
    });

    it('writes to the polite region by default and clears after 3s', () => {
      const polite = new FakeElement('div');
      dom.elementsById['aria-live-polite'] = polite;
      const mgr = new AccessibilityManager(baseConfig);
      mgr.announce('hello world');
      expect(polite.textContent).toBe('hello world');
      jest.advanceTimersByTime(3000);
      expect(polite.textContent).toBe('');
    });

    it('writes to the assertive region when priority is assertive', () => {
      const assertive = new FakeElement('div');
      dom.elementsById['aria-live-assertive'] = assertive;
      const mgr = new AccessibilityManager(baseConfig);
      mgr.announce('urgent', 'assertive');
      expect(assertive.textContent).toBe('urgent');
    });

    it('is a no-op when the live region is missing', () => {
      const mgr = new AccessibilityManager(baseConfig);
      expect(() => mgr.announce('nobody listening')).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Focus trap
  // -------------------------------------------------------------------------

  describe('trapFocus / releaseFocusTrap', () => {
    function buildTrapElement(focusables: FakeElement[]) {
      const el = new FakeElement('div');
      el.id = 'modal-1';
      el._querySelectorAllResult = focusables;
      return el;
    }

    it('returns early when there are no focusable elements', () => {
      const el = buildTrapElement([]);
      const mgr = new AccessibilityManager(baseConfig);
      mgr.trapFocus(el as unknown as HTMLElement);
      expect(el.listeners.keydown).toBeUndefined();
    });

    it('focuses the first element and registers a keydown trap', () => {
      const first = new FakeElement('button');
      const last = new FakeElement('button');
      const el = buildTrapElement([first, last]);
      const mgr = new AccessibilityManager(baseConfig);
      mgr.trapFocus(el as unknown as HTMLElement);
      expect(first.focusCalled).toBe(1);
      expect(el.listeners.keydown).toHaveLength(1);
    });

    it('ignores non-Tab keys inside the trap', () => {
      const first = new FakeElement('button');
      const last = new FakeElement('button');
      const el = buildTrapElement([first, last]);
      const mgr = new AccessibilityManager(baseConfig);
      mgr.trapFocus(el as unknown as HTMLElement);
      const preventDefault = jest.fn();
      el.dispatch('keydown', { key: 'Enter', preventDefault });
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('Tab on the last element wraps to the first', () => {
      const first = new FakeElement('button');
      const last = new FakeElement('button');
      const el = buildTrapElement([first, last]);
      const mgr = new AccessibilityManager(baseConfig);
      mgr.trapFocus(el as unknown as HTMLElement);
      dom.documentStub.activeElement = last;
      const preventDefault = jest.fn();
      el.dispatch('keydown', { key: 'Tab', shiftKey: false, preventDefault });
      expect(first.focusCalled).toBe(2);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('Tab when not on the last element does not wrap', () => {
      const first = new FakeElement('button');
      const last = new FakeElement('button');
      const el = buildTrapElement([first, last]);
      const mgr = new AccessibilityManager(baseConfig);
      mgr.trapFocus(el as unknown as HTMLElement);
      dom.documentStub.activeElement = first;
      const preventDefault = jest.fn();
      el.dispatch('keydown', { key: 'Tab', shiftKey: false, preventDefault });
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('Shift+Tab on the first element wraps to the last', () => {
      const first = new FakeElement('button');
      const last = new FakeElement('button');
      const el = buildTrapElement([first, last]);
      const mgr = new AccessibilityManager(baseConfig);
      mgr.trapFocus(el as unknown as HTMLElement);
      dom.documentStub.activeElement = first;
      const preventDefault = jest.fn();
      el.dispatch('keydown', { key: 'Tab', shiftKey: true, preventDefault });
      expect(last.focusCalled).toBe(1);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('Shift+Tab when not on the first element does not wrap', () => {
      const first = new FakeElement('button');
      const last = new FakeElement('button');
      const el = buildTrapElement([first, last]);
      const mgr = new AccessibilityManager(baseConfig);
      mgr.trapFocus(el as unknown as HTMLElement);
      dom.documentStub.activeElement = last;
      const preventDefault = jest.fn();
      el.dispatch('keydown', { key: 'Tab', shiftKey: true, preventDefault });
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('releaseFocusTrap pops the stack and logs', () => {
      const { logger } = require('../../logger');
      const first = new FakeElement('button');
      const el = buildTrapElement([first]);
      const mgr = new AccessibilityManager(baseConfig);
      mgr.trapFocus(el as unknown as HTMLElement);
      mgr.releaseFocusTrap();
      expect(logger.debug).toHaveBeenCalledWith(
        'AccessibilityManager',
        'Focus trap released',
        { element: 'modal-1' }
      );
    });

    it('releaseFocusTrap on an empty stack is a no-op', () => {
      const mgr = new AccessibilityManager(baseConfig);
      expect(() => mgr.releaseFocusTrap()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // setPageTitle
  // -------------------------------------------------------------------------

  describe('setPageTitle', () => {
    it('does nothing on non-web', () => {
      (Platform as { OS: string }).OS = 'ios';
      const mgr = new AccessibilityManager(baseConfig);
      mgr.setPageTitle('Home');
      expect(dom.documentStub.title).toBe('');
    });

    it('sets document.title and announces the navigation on web', () => {
      const polite = new FakeElement('div');
      dom.elementsById['aria-live-polite'] = polite;
      const mgr = new AccessibilityManager(baseConfig);
      mgr.setPageTitle('Dashboard');
      expect(dom.documentStub.title).toBe('Dashboard');
      expect(polite.textContent).toBe('Navigated to Dashboard');
    });
  });

  // -------------------------------------------------------------------------
  // prefersReducedMotion / prefersHighContrast
  // -------------------------------------------------------------------------

  describe('preference getters', () => {
    it('prefersReducedMotion returns false on non-web', () => {
      (Platform as { OS: string }).OS = 'ios';
      const mgr = new AccessibilityManager(baseConfig);
      expect(mgr.prefersReducedMotion()).toBe(false);
    });

    it('prefersReducedMotion reflects matchMedia on web', () => {
      dom.makeMedia('(prefers-reduced-motion: reduce)', true);
      const mgr = new AccessibilityManager(baseConfig);
      expect(mgr.prefersReducedMotion()).toBe(true);
    });

    it('prefersHighContrast returns false on non-web', () => {
      (Platform as { OS: string }).OS = 'android';
      const mgr = new AccessibilityManager(baseConfig);
      expect(mgr.prefersHighContrast()).toBe(false);
    });

    it('prefersHighContrast reflects matchMedia on web', () => {
      dom.makeMedia('(prefers-contrast: high)', true);
      const mgr = new AccessibilityManager(baseConfig);
      expect(mgr.prefersHighContrast()).toBe(true);
    });
  });
});
