/**
 * Comprehensive unit tests for apps/mobile/src/i18n/index.ts
 *
 * Strategy: do NOT mock the unit under test. Mock only externals:
 *  - i18next / react-i18next (the i18n engine + the React binding)
 *  - react-native-localize (device locale + currency detection)
 *  - @react-native-async-storage/async-storage (locale persistence)
 *  - ../utils/logger (error capture)
 *  - ../utils/haptics (changeLanguage side-effect, require()'d lazily)
 *
 * Because i18n/index.ts runs `i18n.init(...)` at module-import time and
 * registers a custom `languageDetector`, we mock i18next with a controllable
 * fake that:
 *  - is chainable (`.use().use().init()`),
 *  - captures the registered languageDetector + the init config,
 *  - exposes a mutable `language` property so getCurrentLanguage() is testable,
 *  - records changeLanguage() calls.
 *
 * Device-locale / currency branches are exercised by re-importing the module
 * inside `jest.isolateModules` with a per-case react-native-localize mock.
 */

// ---------------------------------------------------------------------------
// Shared mock state (hoist-safe via jest.mock factories referencing top-level
// `let`s is NOT allowed, so we attach to globalThis instead).
// ---------------------------------------------------------------------------

interface FakeI18n {
  language: string;
  use: jest.Mock;
  init: jest.Mock;
  changeLanguage: jest.Mock;
  __detector?: any;
  __initConfig?: any;
}

declare global {
  // eslint-disable-next-line no-var
  var __fakeI18n: FakeI18n;
}

jest.mock('i18next', () => {
  const fake: any = {
    language: 'en',
    use: jest.fn(function (this: any, plugin: any) {
      // The custom languageDetector is the object with type === 'languageDetector'
      if (plugin && plugin.type === 'languageDetector') {
        fake.__detector = plugin;
      }
      return fake;
    }),
    init: jest.fn(function (this: any, config: any) {
      fake.__initConfig = config;
      return Promise.resolve();
    }),
    changeLanguage: jest.fn(function (this: any, lng: string) {
      fake.language = lng;
      return Promise.resolve();
    }),
  };
  (globalThis as any).__fakeI18n = fake;
  return { __esModule: true, default: fake };
});

jest.mock('react-i18next', () => ({
  __esModule: true,
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockHapticSelection = jest.fn();
jest.mock('../../utils/haptics', () => ({
  __esModule: true,
  default: {
    selection: (...args: unknown[]) => mockHapticSelection(...args),
  },
}));

// Default global RNLocalize mock (jest-setup already provides one, but we
// re-mock here so this suite is self-contained and overridable per-test).
// NOTE: jest hoists jest.mock() above imports, so any variable referenced
// inside a factory must be prefixed with `mock` (jest's escape hatch).
const mockGetLocales = jest.fn(() => [
  { countryCode: 'GB', languageTag: 'en-GB', languageCode: 'en', isRTL: false },
]);
const mockGetCurrencies = jest.fn(() => ['GBP']);
jest.mock('react-native-localize', () => ({
  __esModule: true,
  getLocales: (...args: unknown[]) => mockGetLocales(...args),
  getCurrencies: (...args: unknown[]) => mockGetCurrencies(...args),
}));

// AsyncStorage controllable mock
const mockAsyncStore: Record<string, string> = {};
const mockSetItem = jest.fn((k: string, v: string) => {
  mockAsyncStore[k] = v;
  return Promise.resolve();
});
const mockGetItem = jest.fn((k: string) =>
  Promise.resolve(
    Object.prototype.hasOwnProperty.call(mockAsyncStore, k)
      ? mockAsyncStore[k]
      : null
  )
);
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: (...a: any[]) => mockSetItem(a[0], a[1]),
    getItem: (...a: any[]) => mockGetItem(a[0]),
  },
}));

const STORAGE_KEY = 'user_language_preference';

const getFake = (): FakeI18n => (globalThis as any).__fakeI18n;

// Import once (module init runs here). Helpers read live i18n.language.
import * as i18nModule from '../index';

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockAsyncStore)) delete mockAsyncStore[k];
  getFake().language = 'en';
});

// ---------------------------------------------------------------------------
// Module init + exports
// ---------------------------------------------------------------------------
describe('module initialization', () => {
  it('registers the languageDetector and runs init() with a captured config', () => {
    // jest config sets clearMocks:true, so use/init call history is wiped in
    // beforeEach (module init ran once at import). Assert on the durable
    // artifacts the fake captured during init instead of call counts.
    const fake = getFake();
    expect(fake.__detector).toBeDefined();
    expect(fake.__detector.type).toBe('languageDetector');
    expect(fake.__initConfig).toBeDefined();
  });

  it('configures fallbackLng=en, supportedLngs, and en/es/fr resources', () => {
    const cfg = getFake().__initConfig;
    expect(cfg.fallbackLng).toBe('en');
    expect(cfg.supportedLngs).toEqual(
      expect.arrayContaining(['en', 'es', 'fr'])
    );
    expect(Object.keys(cfg.resources)).toEqual(
      expect.arrayContaining(['en', 'es', 'fr'])
    );
    expect(cfg.resources.en.translation).toBeDefined();
    expect(cfg.interpolation.escapeValue).toBe(false);
    expect(cfg.react.useSuspense).toBe(false);
    expect(cfg.cache.enabled).toBe(true);
  });

  it('default export is the i18n instance', () => {
    expect(i18nModule.default).toBe(getFake());
  });
});

// ---------------------------------------------------------------------------
// availableLanguages
// ---------------------------------------------------------------------------
describe('availableLanguages', () => {
  it('exposes en/es/fr with names + isRTL=false', () => {
    expect(i18nModule.availableLanguages.en).toEqual({
      name: 'English',
      nativeName: 'English',
      isRTL: false,
    });
    expect(i18nModule.availableLanguages.es.nativeName).toBe('Español');
    expect(i18nModule.availableLanguages.fr.nativeName).toBe('Français');
    expect(Object.keys(i18nModule.availableLanguages)).toEqual([
      'en',
      'es',
      'fr',
    ]);
  });
});

// ---------------------------------------------------------------------------
// getCurrentLanguage
// ---------------------------------------------------------------------------
describe('getCurrentLanguage', () => {
  it('returns i18n.language when set', () => {
    getFake().language = 'fr';
    expect(i18nModule.getCurrentLanguage()).toBe('fr');
  });

  it('falls back to "en" when i18n.language is empty', () => {
    getFake().language = '' as any;
    expect(i18nModule.getCurrentLanguage()).toBe('en');
  });
});

// ---------------------------------------------------------------------------
// isRTL
// ---------------------------------------------------------------------------
describe('isRTL', () => {
  it('returns false for a known LTR language passed explicitly', () => {
    expect(i18nModule.isRTL('en')).toBe(false);
    expect(i18nModule.isRTL('fr')).toBe(false);
  });

  it('uses current language when no arg is given', () => {
    getFake().language = 'es';
    expect(i18nModule.isRTL()).toBe(false);
  });

  it('returns false for an unknown language (optional-chaining default)', () => {
    expect(i18nModule.isRTL('xx' as any)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// changeLanguage
// ---------------------------------------------------------------------------
describe('changeLanguage', () => {
  it('calls i18n.changeLanguage, persists, and triggers haptic selection', async () => {
    await i18nModule.changeLanguage('fr');
    expect(getFake().changeLanguage).toHaveBeenCalledWith('fr');
    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, 'fr');
    expect(mockAsyncStore[STORAGE_KEY]).toBe('fr');
    expect(mockHapticSelection).toHaveBeenCalledTimes(1);
    expect(getFake().language).toBe('fr');
  });

  it('logs error (but does not throw) when persistence fails', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('disk full'));
    await expect(i18nModule.changeLanguage('es')).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to save language preference:',
      expect.any(Error)
    );
    // haptic still fires after the persist (error swallowed internally)
    expect(mockHapticSelection).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe('formatCurrency', () => {
  it('formats GBP with the £ symbol for en (uses en-GB)', () => {
    const out = i18nModule.formatCurrency(120, 'GBP', 'en');
    expect(out).toContain('£');
    expect(out).toContain('120');
  });

  it('uses an explicit currency over the device currency', () => {
    const out = i18nModule.formatCurrency(50, 'EUR', 'fr');
    expect(out).toContain('€');
  });

  it('falls back to device currency (getCurrencies) when no currency arg', () => {
    mockGetCurrencies.mockReturnValueOnce(['GBP']);
    const out = i18nModule.formatCurrency(99, undefined, 'en');
    expect(out).toContain('£');
  });

  it('uses current language when no language arg given', () => {
    getFake().language = 'en';
    const out = i18nModule.formatCurrency(10, 'GBP');
    expect(out).toContain('£');
  });

  it('falls back to GBP when no currency arg and device returns none', () => {
    mockGetCurrencies.mockReturnValueOnce([] as any);
    const out = i18nModule.formatCurrency(5, undefined, 'en');
    expect(out).toContain('£');
  });

  it('hits the catch branch with the symbol map on invalid currency code', () => {
    // An invalid ISO currency makes Intl.NumberFormat throw -> fallback path.
    const out = i18nModule.formatCurrency(120, 'NOTACODE', 'en');
    // resolvedCurrency='NOTACODE' is not in CURRENCY_SYMBOLS -> "NOTACODE "
    expect(out).toBe('NOTACODE 120.00');
  });

  it('catch branch resolves the £ symbol for GBP when Intl throws', () => {
    const spy = jest.spyOn(Intl, 'NumberFormat').mockImplementationOnce(() => {
      throw new Error('Intl broken');
    });
    const out = i18nModule.formatCurrency(8, 'GBP', 'en');
    expect(out).toBe('£8.00');
    spy.mockRestore();
  });

  it('catch branch resolves $ for USD and € for EUR via the symbol map', () => {
    const spy = jest.spyOn(Intl, 'NumberFormat').mockImplementation(() => {
      throw new Error('Intl broken');
    });
    expect(i18nModule.formatCurrency(8, 'USD', 'en')).toBe('$8.00');
    expect(i18nModule.formatCurrency(8, 'EUR', 'en')).toBe('€8.00');
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  const date = new Date('2026-03-15T12:00:00Z');

  it('formats a date for en (en-US) into a non-empty string', () => {
    const out = i18nModule.formatDate(date, 'en');
    expect(out).toContain('2026');
    expect(out).toContain('Mar');
  });

  it('formats with current language when no arg given', () => {
    getFake().language = 'fr';
    const out = i18nModule.formatDate(date);
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  it('falls back to ISO date when Intl.DateTimeFormat throws', () => {
    const spy = jest
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementationOnce(() => {
        throw new Error('Intl broken');
      });
    const out = i18nModule.formatDate(date, 'en');
    expect(out).toBe('2026-03-15');
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------
describe('formatRelativeTime', () => {
  it('formats seconds-ago (< 60s)', () => {
    const d = new Date(Date.now() - 5 * 1000);
    const out = i18nModule.formatRelativeTime(d, 'en');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  it('formats minutes-ago (< 60m)', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000);
    const out = i18nModule.formatRelativeTime(d, 'en');
    expect(out).toMatch(/minute|min/i);
  });

  it('formats hours-ago (< 24h)', () => {
    const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const out = i18nModule.formatRelativeTime(d, 'en');
    expect(out).toMatch(/hour|hr/i);
  });

  it('formats days-ago (>= 24h)', () => {
    const d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const out = i18nModule.formatRelativeTime(d, 'en');
    expect(out).toMatch(/day/i);
  });

  it('uses current language when no language arg given', () => {
    getFake().language = 'es';
    const d = new Date(Date.now() - 10 * 1000);
    expect(typeof i18nModule.formatRelativeTime(d)).toBe('string');
  });

  describe('fallback branch (Intl.RelativeTimeFormat throws)', () => {
    let spy: jest.SpyInstance;
    beforeEach(() => {
      spy = jest.spyOn(Intl, 'RelativeTimeFormat').mockImplementation(() => {
        throw new Error('Intl broken');
      });
    });
    afterEach(() => spy.mockRestore());

    it('returns "just now" for < 60s', () => {
      const d = new Date(Date.now() - 3 * 1000);
      expect(i18nModule.formatRelativeTime(d, 'en')).toBe('just now');
    });

    it('returns "Xm ago" for < 60m', () => {
      const d = new Date(Date.now() - 5 * 60 * 1000);
      expect(i18nModule.formatRelativeTime(d, 'en')).toMatch(/^\d+m ago$/);
    });

    it('returns "Xh ago" for < 24h', () => {
      const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
      expect(i18nModule.formatRelativeTime(d, 'en')).toMatch(/^\d+h ago$/);
    });

    it('returns "Xd ago" for >= 24h', () => {
      const d = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      expect(i18nModule.formatRelativeTime(d, 'en')).toMatch(/^\d+d ago$/);
    });
  });
});

// ---------------------------------------------------------------------------
// languageDetector (captured at init) — exercises getDeviceLanguage,
// getLanguagePreference, detect, cacheUserLanguage + saveLanguagePreference.
// ---------------------------------------------------------------------------
describe('languageDetector', () => {
  const detector = () => getFake().__detector;

  it('is registered with async=true and an init no-op', () => {
    expect(detector()).toBeDefined();
    expect(detector().async).toBe(true);
    expect(detector().type).toBe('languageDetector');
    expect(() => detector().init()).not.toThrow();
  });

  it('detect() returns the saved preference when one exists', async () => {
    mockAsyncStore[STORAGE_KEY] = 'fr';
    const cb = jest.fn();
    await detector().detect(cb);
    expect(cb).toHaveBeenCalledWith('fr');
    // device detection should NOT be consulted
    expect(mockGetLocales).not.toHaveBeenCalled();
  });

  it('detect() falls back to device language when no saved preference', async () => {
    mockGetLocales.mockReturnValueOnce([
      {
        languageCode: 'es',
        languageTag: 'es-ES',
        countryCode: 'ES',
        isRTL: false,
      },
    ]);
    const cb = jest.fn();
    await detector().detect(cb);
    expect(cb).toHaveBeenCalledWith('es');
  });

  it('detect() device fallback routes unsupported locale to "en"', async () => {
    mockGetLocales.mockReturnValueOnce([
      {
        languageCode: 'de',
        languageTag: 'de-DE',
        countryCode: 'DE',
        isRTL: false,
      },
      {
        languageCode: 'zz',
        languageTag: 'zz-ZZ',
        countryCode: 'ZZ',
        isRTL: false,
      },
    ]);
    const cb = jest.fn();
    await detector().detect(cb);
    expect(cb).toHaveBeenCalledWith('en');
  });

  it('detect() picks the first supported locale among several', async () => {
    mockGetLocales.mockReturnValueOnce([
      {
        languageCode: 'de',
        languageTag: 'de-DE',
        countryCode: 'DE',
        isRTL: false,
      },
      {
        languageCode: 'fr',
        languageTag: 'fr-FR',
        countryCode: 'FR',
        isRTL: false,
      },
    ]);
    const cb = jest.fn();
    await detector().detect(cb);
    expect(cb).toHaveBeenCalledWith('fr');
  });

  it('detect() logs + falls back to "en" when getItem rejects', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('boom'));
    const cb = jest.fn();
    await detector().detect(cb);
    // getLanguagePreference swallows the error and returns null, so detect
    // proceeds to device language ('en' from default mock) without hitting
    // detect()'s own catch. Assert callback still fired with a valid lang.
    expect(cb).toHaveBeenCalledWith('en');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to get language preference:',
      expect.any(Error)
    );
  });

  it('detect() top-level catch fires when getDeviceLanguage throws', async () => {
    // getItem resolves null (no pref) -> getDeviceLanguage() called ->
    // make getLocales throw to hit detect()'s own catch -> callback('en').
    mockGetLocales.mockImplementationOnce(() => {
      throw new Error('localize exploded');
    });
    const cb = jest.fn();
    await detector().detect(cb);
    expect(cb).toHaveBeenCalledWith('en');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Language detection error:',
      expect.any(Error)
    );
  });

  it('cacheUserLanguage() persists the language', async () => {
    await detector().cacheUserLanguage('es');
    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, 'es');
    expect(mockAsyncStore[STORAGE_KEY]).toBe('es');
  });

  it('cacheUserLanguage() swallows + logs persistence errors', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('nope'));
    await expect(detector().cacheUserLanguage('fr')).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to save language preference:',
      expect.any(Error)
    );
  });
});
