/**
 * Unit tests for PWAManager (web optimizations).
 *
 * The source is web-only: `initialize()` early-returns unless
 * Platform.OS === 'web', and every other path touches browser globals
 * (navigator.serviceWorker, window event listeners + matchMedia, and the
 * DOM via document.createElement / querySelector). The mobile Jest
 * environment is `node` (no jsdom), so this suite installs minimal but
 * behaviourally-real DOM / window / navigator stubs on `global` and flips
 * the shared react-native Platform mock to 'web'.
 *
 * Only externals are mocked: the logger and the browser globals. The
 * PWAManager class itself is exercised for real.
 */

import { Platform } from 'react-native';
import { PWAManager } from '../PWAManager';
import { PWAConfig } from '../types';

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

class FakeElement {
  tagName: string;
  id = '';
  innerHTML = '';
  style: { cssText: string } = { cssText: '' };
  attributes: Record<string, string> = {};
  listeners: Record<string, ((e: unknown) => void)[]> = {};
  removed = false;

  constructor(tagName: string) {
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

  dispatch(type: string, e?: unknown) {
    (this.listeners[type] || []).forEach((cb) => cb(e));
  }

  remove() {
    this.removed = true;
  }
}

interface DomState {
  documentStub: {
    createElement: (tag: string) => FakeElement;
    getElementById: (id: string) => FakeElement | null;
    querySelector: (sel: string) => FakeElement | null;
    head: { children: FakeElement[]; appendChild: (el: FakeElement) => void };
    body: { children: FakeElement[]; appendChild: (el: FakeElement) => void };
  };
  created: FakeElement[];
  byId: Record<string, FakeElement>;
  byQuery: Record<string, FakeElement>;
  windowListeners: Record<string, ((e: unknown) => void)[]>;
  matchMediaMatches: boolean;
  reloadCalls: number;
}

function buildDom(): DomState {
  const created: FakeElement[] = [];
  const byId: Record<string, FakeElement> = {};
  const byQuery: Record<string, FakeElement> = {};
  const windowListeners: Record<string, ((e: unknown) => void)[]> = {};
  const head = {
    children: [] as FakeElement[],
    appendChild: (el: FakeElement) => head.children.push(el),
  };
  const body = {
    children: [] as FakeElement[],
    appendChild: (el: FakeElement) => body.children.push(el),
  };

  const state: DomState = {
    documentStub: {
      createElement: (tag: string) => {
        const el = new FakeElement(tag);
        created.push(el);
        return el;
      },
      getElementById: (id: string) => byId[id] ?? null,
      querySelector: (sel: string) => byQuery[sel] ?? null,
      head,
      body,
    },
    created,
    byId,
    byQuery,
    windowListeners,
    matchMediaMatches: false,
    reloadCalls: 0,
  };

  const windowStub = {
    addEventListener: (type: string, cb: (e: unknown) => void) => {
      (windowListeners[type] ||= []).push(cb);
    },
    matchMedia: (_query: string) => ({ matches: state.matchMediaMatches }),
    location: {
      reload: () => {
        state.reloadCalls += 1;
      },
    },
  };

  (global as unknown as { document: unknown }).document = state.documentStub;
  (global as unknown as { window: unknown }).window = windowStub;

  return state;
}

// ---------------------------------------------------------------------------
// navigator.serviceWorker stub
// ---------------------------------------------------------------------------

interface SwState {
  registration: FakeRegistration | null;
  registerError: Error | null;
  controller: unknown;
  supported: boolean;
}

class FakeRegistration extends FakeElement {
  scope = '/scope/';
  installing: FakeWorker | null = null;
  unregisterCalls = 0;

  constructor() {
    super('registration');
  }

  async unregister() {
    this.unregisterCalls += 1;
  }
}

class FakeWorker extends FakeElement {
  state = 'installing';
  constructor() {
    super('worker');
  }
}

function installNavigator(sw: SwState) {
  const navStub: Record<string, unknown> = {};
  if (sw.supported) {
    navStub.serviceWorker = {
      register: jest.fn(async (_path: string) => {
        if (sw.registerError) throw sw.registerError;
        return sw.registration;
      }),
      get controller() {
        return sw.controller;
      },
    };
  }
  (global as unknown as { navigator: unknown }).navigator = navStub;
  return navStub;
}

// ---------------------------------------------------------------------------

const baseConfig: PWAConfig = {
  appName: 'Mintenance',
  shortName: 'Mint',
  appDescription: 'Property maintenance',
  themeColor: '#3F8C7A',
  backgroundColor: '#ffffff',
  iconSizes: [192, 512],
};

describe('PWAManager', () => {
  const originalOS = Platform.OS;
  let dom: DomState;

  beforeEach(() => {
    (Platform as { OS: string }).OS = 'web';
    dom = buildDom();
    jest.clearAllMocks();
  });

  afterEach(() => {
    (Platform as { OS: string }).OS = originalOS;
    delete (global as unknown as { document?: unknown }).document;
    delete (global as unknown as { window?: unknown }).window;
    delete (global as unknown as { navigator?: unknown }).navigator;
  });

  // -------------------------------------------------------------------------
  // initialize() — platform gate
  // -------------------------------------------------------------------------

  describe('initialize - platform gate', () => {
    it('does nothing on non-web platforms', async () => {
      (Platform as { OS: string }).OS = 'ios';
      installNavigator({
        registration: new FakeRegistration(),
        registerError: null,
        controller: null,
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      expect(dom.created).toHaveLength(0);
      expect(Object.keys(dom.windowListeners)).toHaveLength(0);
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // initialize() — full happy path on web
  // -------------------------------------------------------------------------

  describe('initialize - web happy path', () => {
    it('wires meta tags, service worker, install prompt, and install status', async () => {
      const reg = new FakeRegistration();
      installNavigator({
        registration: reg,
        registerError: null,
        controller: null,
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      // Meta tags created (none pre-existed, so createElement runs for each)
      const metas = dom.created.filter((e) => e.tagName === 'meta');
      const metaNames = metas.map((m) => m.attributes.name);
      expect(metaNames).toEqual(
        expect.arrayContaining([
          'theme-color',
          'apple-mobile-web-app-capable',
          'apple-mobile-web-app-status-bar-style',
          'apple-mobile-web-app-title',
          'application-name',
          'mobile-web-app-capable',
        ])
      );

      // theme-color content
      const themeMeta = metas.find((m) => m.attributes.name === 'theme-color');
      expect(themeMeta!.attributes.content).toBe('#3F8C7A');

      // shortName used for apple title
      const titleMeta = metas.find(
        (m) => m.attributes.name === 'apple-mobile-web-app-title'
      );
      expect(titleMeta!.attributes.content).toBe('Mint');

      // Service worker registered + stored
      expect(mgr.getServiceWorker()).toBe(reg);

      // Install prompt listeners registered
      expect(dom.windowListeners.beforeinstallprompt).toHaveLength(1);
      expect(dom.windowListeners.appinstalled).toHaveLength(1);

      // updatefound listener wired on registration
      expect(reg.listeners.updatefound).toHaveLength(1);

      expect(logger.info).toHaveBeenCalledWith(
        'PWAManager',
        'PWA initialized successfully'
      );
    });

    it('falls back to appName for apple title when shortName is absent', async () => {
      const reg = new FakeRegistration();
      installNavigator({
        registration: reg,
        registerError: null,
        controller: null,
        supported: true,
      });
      const cfg: PWAConfig = { ...baseConfig, shortName: undefined };
      const mgr = new PWAManager(cfg);
      await mgr.initialize();

      const titleMeta = dom.created.find(
        (m) =>
          m.tagName === 'meta' &&
          m.attributes.name === 'apple-mobile-web-app-title'
      );
      expect(titleMeta!.attributes.content).toBe('Mintenance');
    });

    it('reuses an existing meta tag instead of creating a new one', async () => {
      const existing = new FakeElement('meta');
      existing.setAttribute('name', 'theme-color');
      dom.byQuery['meta[name="theme-color"]'] = existing;

      const reg = new FakeRegistration();
      installNavigator({
        registration: reg,
        registerError: null,
        controller: null,
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      // existing tag updated, no new theme-color meta created
      expect(existing.attributes.content).toBe('#3F8C7A');
      const created = dom.created.filter(
        (m) => m.tagName === 'meta' && m.attributes.name === 'theme-color'
      );
      expect(created).toHaveLength(0);
    });

    it('detects standalone display-mode as installed', async () => {
      dom.matchMediaMatches = true;
      const reg = new FakeRegistration();
      installNavigator({
        registration: reg,
        registerError: null,
        controller: null,
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      expect(mgr.isPWAInstalled()).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'PWAManager',
        'PWA is running in standalone mode'
      );
    });

    it('is not installed when not standalone', async () => {
      dom.matchMediaMatches = false;
      const reg = new FakeRegistration();
      installNavigator({
        registration: reg,
        registerError: null,
        controller: null,
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      expect(mgr.isPWAInstalled()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Service worker registration branches
  // -------------------------------------------------------------------------

  describe('initializeServiceWorker', () => {
    it('warns and returns when service workers are unsupported', async () => {
      installNavigator({
        registration: null,
        registerError: null,
        controller: null,
        supported: false,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      expect(logger.warn).toHaveBeenCalledWith(
        'PWAManager',
        'Service workers not supported'
      );
      expect(mgr.getServiceWorker()).toBeUndefined();
    });

    it('logs an error when registration rejects but initialize still completes', async () => {
      const err = new Error('reg failed');
      installNavigator({
        registration: null,
        registerError: err,
        controller: null,
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      expect(logger.error).toHaveBeenCalledWith(
        'PWAManager',
        'Service worker registration failed',
        err
      );
      expect(mgr.getServiceWorker()).toBeUndefined();
      // initialize wraps SW init, so it still finishes
      expect(logger.info).toHaveBeenCalledWith(
        'PWAManager',
        'PWA initialized successfully'
      );
    });

    it('shows the update banner when a new worker installs while controlled', async () => {
      const reg = new FakeRegistration();
      const worker = new FakeWorker();
      reg.installing = worker;
      installNavigator({
        registration: reg,
        registerError: null,
        controller: {},
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      // fire updatefound -> wires statechange on the installing worker
      reg.dispatch('updatefound');
      expect(worker.listeners.statechange).toHaveLength(1);

      // worker reaches 'installed' with an active controller -> banner shown
      worker.state = 'installed';
      worker.dispatch('statechange');

      const banner = dom.created.find((e) => e.id === 'pwa-update-banner');
      expect(banner).toBeDefined();
      expect(dom.documentStub.body.children).toContain(banner);
    });

    it('does not show the update banner when there is no controller', async () => {
      const reg = new FakeRegistration();
      const worker = new FakeWorker();
      reg.installing = worker;
      installNavigator({
        registration: reg,
        registerError: null,
        controller: null,
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      reg.dispatch('updatefound');
      worker.state = 'installed';
      worker.dispatch('statechange');

      expect(
        dom.created.find((e) => e.id === 'pwa-update-banner')
      ).toBeUndefined();
    });

    it('does not wire statechange when there is no installing worker', async () => {
      const reg = new FakeRegistration();
      reg.installing = null;
      installNavigator({
        registration: reg,
        registerError: null,
        controller: {},
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      // no throw, no banner
      expect(() => reg.dispatch('updatefound')).not.toThrow();
      expect(
        dom.created.find((e) => e.id === 'pwa-update-banner')
      ).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Install prompt / banner flow
  // -------------------------------------------------------------------------

  describe('install prompt flow', () => {
    async function init() {
      const reg = new FakeRegistration();
      installNavigator({
        registration: reg,
        registerError: null,
        controller: null,
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();
      return mgr;
    }

    it('captures beforeinstallprompt, prevents default, and shows install banner', async () => {
      await init();
      const preventDefault = jest.fn();
      const fakeEvent = {
        preventDefault,
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };

      dom.windowListeners.beforeinstallprompt[0](fakeEvent);

      expect(preventDefault).toHaveBeenCalled();
      const banner = dom.created.find((e) => e.id === 'pwa-install-banner');
      expect(banner).toBeDefined();
      expect(dom.documentStub.body.children).toContain(banner);
      expect(banner!.innerHTML).toContain('Install Mintenance');
    });

    it('prompts and hides the banner when the install button is clicked (accepted)', async () => {
      await init();
      const prompt = jest.fn();
      const fakeEvent = {
        preventDefault: jest.fn(),
        prompt,
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };

      // wire the install button into getElementById so the click handler binds
      const button = new FakeElement('button');
      dom.byId['pwa-install-button'] = button;

      dom.windowListeners.beforeinstallprompt[0](fakeEvent);

      // a banner with this id exists for hideInstallBanner to remove
      const banner = dom.created.find((e) => e.id === 'pwa-install-banner')!;
      dom.byId['pwa-install-banner'] = banner;

      // click the install button
      await button.listeners.click[0](undefined);

      expect(prompt).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'PWAManager',
        'Install prompt outcome',
        {
          outcome: 'accepted',
        }
      );
      expect(banner.removed).toBe(true);
    });

    it('handles a dismissed outcome from the install prompt', async () => {
      await init();
      const fakeEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };
      const button = new FakeElement('button');
      dom.byId['pwa-install-button'] = button;

      dom.windowListeners.beforeinstallprompt[0](fakeEvent);
      const banner = dom.created.find((e) => e.id === 'pwa-install-banner')!;
      dom.byId['pwa-install-banner'] = banner;

      await button.listeners.click[0](undefined);

      expect(logger.info).toHaveBeenCalledWith(
        'PWAManager',
        'Install prompt outcome',
        {
          outcome: 'dismissed',
        }
      );
    });

    it('does not throw when the install button cannot be found', async () => {
      await init();
      const fakeEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };
      // no button registered in byId -> getElementById returns null, optional chaining skips
      expect(() =>
        dom.windowListeners.beforeinstallprompt[0](fakeEvent)
      ).not.toThrow();
    });

    it('marks installed and hides the banner on appinstalled', async () => {
      const mgr = await init();
      const banner = new FakeElement('div');
      banner.id = 'pwa-install-banner';
      dom.byId['pwa-install-banner'] = banner;

      dom.windowListeners.appinstalled[0](undefined);

      expect(mgr.isPWAInstalled()).toBe(true);
      expect(banner.removed).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'PWAManager',
        'PWA installed successfully'
      );
    });

    it('appinstalled is a no-op for the banner when none exists', async () => {
      const mgr = await init();
      // no banner in byId
      expect(() =>
        dom.windowListeners.appinstalled[0](undefined)
      ).not.toThrow();
      expect(mgr.isPWAInstalled()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Update banner reload button
  // -------------------------------------------------------------------------

  describe('update banner reload', () => {
    it('reloads the page when the reload button is clicked', async () => {
      const reg = new FakeRegistration();
      const worker = new FakeWorker();
      reg.installing = worker;
      installNavigator({
        registration: reg,
        registerError: null,
        controller: {},
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      const reloadButton = new FakeElement('button');
      dom.byId['pwa-reload-button'] = reloadButton;

      reg.dispatch('updatefound');
      worker.state = 'installed';
      worker.dispatch('statechange');

      reloadButton.listeners.click[0](undefined);
      expect(dom.reloadCalls).toBe(1);
    });

    it('does not throw if reload button is missing', async () => {
      const reg = new FakeRegistration();
      const worker = new FakeWorker();
      reg.installing = worker;
      installNavigator({
        registration: reg,
        registerError: null,
        controller: {},
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      reg.dispatch('updatefound');
      worker.state = 'installed';
      expect(() => worker.dispatch('statechange')).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // initialize() top-level error handling
  // -------------------------------------------------------------------------

  describe('initialize error handling', () => {
    it('catches and logs errors thrown during setup', async () => {
      // make document.createElement throw inside setupPWAMeta -> updateMetaTag
      dom.documentStub.createElement = () => {
        throw new Error('boom');
      };
      installNavigator({
        registration: new FakeRegistration(),
        registerError: null,
        controller: null,
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await expect(mgr.initialize()).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        'PWAManager',
        'Failed to initialize PWA',
        expect.any(Error)
      );
    });
  });

  // -------------------------------------------------------------------------
  // Public getters + unregister
  // -------------------------------------------------------------------------

  describe('getServiceWorker / isPWAInstalled / unregister', () => {
    it('getServiceWorker returns undefined before initialize', () => {
      const mgr = new PWAManager(baseConfig);
      expect(mgr.getServiceWorker()).toBeUndefined();
    });

    it('isPWAInstalled defaults to false', () => {
      const mgr = new PWAManager(baseConfig);
      expect(mgr.isPWAInstalled()).toBe(false);
    });

    it('unregister calls registration.unregister when present', async () => {
      const reg = new FakeRegistration();
      installNavigator({
        registration: reg,
        registerError: null,
        controller: null,
        supported: true,
      });
      const mgr = new PWAManager(baseConfig);
      await mgr.initialize();

      await mgr.unregister();
      expect(reg.unregisterCalls).toBe(1);
      expect(logger.info).toHaveBeenCalledWith(
        'PWAManager',
        'Service worker unregistered'
      );
    });

    it('unregister is a no-op when there is no registration', async () => {
      const mgr = new PWAManager(baseConfig);
      await expect(mgr.unregister()).resolves.toBeUndefined();
      expect(logger.info).not.toHaveBeenCalledWith(
        'PWAManager',
        'Service worker unregistered'
      );
    });
  });
});
