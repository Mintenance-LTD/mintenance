import { renderHook, act } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mock externals ONLY. The unit under test (useI18n) is never mocked.
// ---------------------------------------------------------------------------

// logger
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    debug: jest.fn(),
  },
}));

// haptics hook
const mockHapticsSelection = jest.fn();
const mockHapticsError = jest.fn();
jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({
    selection: mockHapticsSelection,
    error: mockHapticsError,
  }),
}));

// ---------------------------------------------------------------------------
// react-i18next mock — a tiny event-emitter-backed i18n + controllable t().
// ---------------------------------------------------------------------------
type Listener = (lang: string) => void;
const i18nListeners: Record<string, Listener[]> = {};

// `mockTImpl` is swappable per-test so we can exercise found / missing / throwing.
// Must be `mock`-prefixed to be referenceable inside jest.mock() factories.
let mockTImpl: (key: string, opts?: unknown) => string;

const mockI18n = {
  language: 'en',
  on: jest.fn((event: string, cb: Listener) => {
    (i18nListeners[event] ||= []).push(cb);
  }),
  off: jest.fn((event: string, cb: Listener) => {
    i18nListeners[event] = (i18nListeners[event] || []).filter((l) => l !== cb);
  }),
  emit: (event: string, lang: string) => {
    (i18nListeners[event] || []).forEach((l) => l(lang));
  },
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) => mockTImpl(key, opts),
    i18n: mockI18n,
  }),
}));

// ---------------------------------------------------------------------------
// ../i18n mock — control language, RTL, change, and formatters per-test.
// ---------------------------------------------------------------------------
const mockChangeLanguage = jest.fn(() => Promise.resolve());
const mockGetCurrentLanguage = jest.fn(() => 'en');
const mockIsRTL = jest.fn((lang?: string) => false);
const mockFormatCurrency = jest.fn(
  (amount: number, currency: string, lang: string) =>
    `${currency}:${lang}:${amount}`
);
const mockFormatDate = jest.fn((date: Date, lang: string) => `date:${lang}`);
const mockFormatRelativeTime = jest.fn(
  (date: Date, lang: string) => `rel:${lang}`
);

jest.mock('../../i18n', () => ({
  changeLanguage: (...a: unknown[]) => mockChangeLanguage(...a),
  getCurrentLanguage: () => mockGetCurrentLanguage(),
  isRTL: (lang?: string) => mockIsRTL(lang),
  formatCurrency: (...a: unknown[]) => (mockFormatCurrency as Function)(...a),
  formatDate: (...a: unknown[]) => (mockFormatDate as Function)(...a),
  formatRelativeTime: (...a: unknown[]) =>
    (mockFormatRelativeTime as Function)(...a),
  availableLanguages: {
    en: { name: 'English', nativeName: 'English', isRTL: false },
    es: { name: 'Spanish', nativeName: 'Español', isRTL: false },
    ar: { name: 'Arabic', nativeName: 'العربية', isRTL: true },
  },
}));

// react-native (I18nManager) — provide a mutable isRTL + spies.
const mockAllowRTL = jest.fn();
const mockForceRTL = jest.fn();
jest.mock('react-native', () => ({
  I18nManager: {
    isRTL: false,
    allowRTL: (...a: unknown[]) => mockAllowRTL(...a),
    forceRTL: (...a: unknown[]) => mockForceRTL(...a),
  },
}));

// Import AFTER mocks are registered.
import { useI18n } from '../useI18n';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { I18nManager } = require('react-native');

// Default t implementation: echoes key, honours defaultValue.
const defaultT = (key: string, opts?: unknown): string => {
  if (
    opts &&
    typeof opts === 'object' &&
    'defaultValue' in (opts as Record<string, unknown>)
  ) {
    const dv = (opts as Record<string, unknown>).defaultValue;
    if (dv !== '' && dv != null) return String(dv);
  }
  return key;
};

beforeEach(() => {
  jest.clearAllMocks();
  // reset listener registry
  for (const k of Object.keys(i18nListeners)) delete i18nListeners[k];
  mockTImpl = defaultT;
  mockI18n.language = 'en';
  mockGetCurrentLanguage.mockReturnValue('en');
  mockIsRTL.mockImplementation(() => false);
  I18nManager.isRTL = false;
});

describe('useI18n — initialization', () => {
  it('initializes with current language and LTR layout', () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.currentLanguage).toBe('en');
    expect(result.current.isRTL).toBe(false);
    expect(result.current.i18n).toBe(mockI18n);
  });

  it('registers a languageChanged listener on mount and removes it on unmount', () => {
    const { unmount } = renderHook(() => useI18n());
    expect(mockI18n.on).toHaveBeenCalledWith(
      'languageChanged',
      expect.any(Function)
    );
    expect(i18nListeners['languageChanged']).toHaveLength(1);
    unmount();
    expect(mockI18n.off).toHaveBeenCalledWith(
      'languageChanged',
      expect.any(Function)
    );
    expect(i18nListeners['languageChanged']).toHaveLength(0);
  });

  it('reflects RTL initial state when isRTL() is true', () => {
    mockIsRTL.mockImplementation(() => true);
    const { result } = renderHook(() => useI18n());
    expect(result.current.isRTL).toBe(true);
  });
});

describe('useI18n — translate', () => {
  it('returns translation for a found key', () => {
    mockTImpl = (key) => (key === 'hello' ? 'Hello world' : key);
    const { result } = renderHook(() => useI18n());
    expect(result.current.translate('hello')).toBe('Hello world');
    expect(result.current.t('hello')).toBe('Hello world');
  });

  it('passes a string options arg as defaultValue', () => {
    const tSpy = jest.fn((_key: string, _opts?: unknown) => 'default text');
    mockTImpl = tSpy as typeof mockTImpl;
    const { result } = renderHook(() => useI18n());
    expect(result.current.translate('missing.key', 'Fallback')).toBe(
      'default text'
    );
    expect(tSpy).toHaveBeenCalledWith('missing.key', {
      defaultValue: 'Fallback',
    });
  });

  it('passes an object options arg straight through (interpolation)', () => {
    const tSpy = jest.fn(
      (_key: string, opts?: unknown) =>
        `Hi ${(opts as Record<string, unknown>)?.name}`
    );
    mockTImpl = tSpy as typeof mockTImpl;
    const { result } = renderHook(() => useI18n());
    expect(result.current.translate('greet', { name: 'Sam' })).toBe('Hi Sam');
    expect(tSpy).toHaveBeenCalledWith('greet', { name: 'Sam' });
  });

  it('falls back to the last key segment when t() throws', () => {
    mockTImpl = () => {
      throw new Error('boom');
    };
    const { result } = renderHook(() => useI18n());
    expect(result.current.translate('common.nested.ok')).toBe('ok');
    expect(mockLoggerWarn).toHaveBeenCalled();
  });

  it('falls back to the whole key when a thrown key has no dot', () => {
    mockTImpl = () => {
      throw new Error('boom');
    };
    const { result } = renderHook(() => useI18n());
    expect(result.current.translate('singleword')).toBe('singleword');
  });
});

describe('useI18n — plural & context', () => {
  it('translatePlural forwards count and extra options', () => {
    const tSpy = jest.fn(
      (_key: string, opts?: unknown) =>
        `count=${(opts as Record<string, unknown>)?.count}`
    );
    mockTImpl = tSpy as typeof mockTImpl;
    const { result } = renderHook(() => useI18n());
    expect(result.current.translatePlural('items', 3, { extra: 'x' })).toBe(
      'count=3'
    );
    expect(tSpy).toHaveBeenCalledWith('items', { count: 3, extra: 'x' });
  });

  it('translateWithContext returns the context-specific translation when present', () => {
    mockTImpl = (key) => (key === 'verb_past' ? 'walked' : '');
    const { result } = renderHook(() => useI18n());
    expect(result.current.translateWithContext('verb', 'past')).toBe('walked');
  });

  it('translateWithContext falls back to base key when context translation is empty', () => {
    mockTImpl = (key, opts) => {
      if (key === 'verb_past') return ''; // empty -> falsy -> fallback
      if (key === 'verb') return 'walk';
      return key;
    };
    const { result } = renderHook(() => useI18n());
    expect(result.current.translateWithContext('verb', 'past')).toBe('walk');
  });
});

describe('useI18n — getString', () => {
  it('joins namespace + key and delegates to translate', () => {
    mockTImpl = (key) => (key === 'auth.email' ? 'Email' : key);
    const { result } = renderHook(() => useI18n());
    expect(result.current.getString('auth', 'email')).toBe('Email');
  });

  it('passes interpolation values through getString', () => {
    const tSpy = jest.fn(
      (_key: string, opts?: unknown) =>
        `${(opts as Record<string, unknown>)?.count} jobs`
    );
    mockTImpl = tSpy as typeof mockTImpl;
    const { result } = renderHook(() => useI18n());
    expect(result.current.getString('jobs', 'count', { count: 5 })).toBe(
      '5 jobs'
    );
    expect(tSpy).toHaveBeenCalledWith('jobs.count', { count: 5 });
  });
});

describe('useI18n — predefined helper groups', () => {
  it('common helpers translate their keys', () => {
    mockTImpl = (key) => `T:${key}`;
    const { result } = renderHook(() => useI18n());
    expect(result.current.common.ok()).toBe('T:common.ok');
    expect(result.current.common.cancel()).toBe('T:common.cancel');
    expect(result.current.common.close()).toBe('T:common.close');
    expect(result.current.common.save()).toBe('T:common.save');
    expect(result.current.common.loading()).toBe('T:common.loading');
    expect(result.current.common.error()).toBe('T:common.error');
    expect(result.current.common.success()).toBe('T:common.success');
    expect(result.current.common.retry()).toBe('T:common.retry');
    expect(result.current.common.search()).toBe('T:common.search');
    expect(result.current.common.next()).toBe('T:common.next');
    expect(result.current.common.back()).toBe('T:common.back');
    expect(result.current.common.done()).toBe('T:common.done');
  });

  it('auth helpers translate their keys', () => {
    mockTImpl = (key) => `T:${key}`;
    const { result } = renderHook(() => useI18n());
    expect(result.current.auth.login()).toBe('T:auth.login');
    expect(result.current.auth.register()).toBe('T:auth.register');
    expect(result.current.auth.logout()).toBe('T:auth.logout');
    expect(result.current.auth.email()).toBe('T:auth.email');
    expect(result.current.auth.password()).toBe('T:auth.password');
    expect(result.current.auth.forgotPassword()).toBe('T:auth.forgotPassword');
    expect(result.current.auth.createAccount()).toBe('T:auth.createAccount');
  });

  it('navigation helpers translate their keys', () => {
    mockTImpl = (key) => `T:${key}`;
    const { result } = renderHook(() => useI18n());
    expect(result.current.navigation.home()).toBe('T:navigation.home');
    expect(result.current.navigation.profile()).toBe('T:navigation.profile');
    expect(result.current.navigation.messages()).toBe('T:navigation.messages');
    expect(result.current.navigation.jobs()).toBe('T:navigation.jobs');
    expect(result.current.navigation.feed()).toBe('T:navigation.feed');
    expect(result.current.navigation.inbox()).toBe('T:navigation.inbox');
  });

  it('accessibility helpers translate keys including interpolated action', () => {
    const tSpy = jest.fn((key: string, opts?: unknown) => {
      if (key === 'accessibility.doubleTabTo') {
        return `double tap to ${(opts as Record<string, unknown>)?.action}`;
      }
      return `T:${key}`;
    });
    mockTImpl = tSpy as typeof mockTImpl;
    const { result } = renderHook(() => useI18n());
    expect(result.current.accessibility.button()).toBe(
      'T:accessibility.button'
    );
    expect(result.current.accessibility.selected()).toBe(
      'T:accessibility.selected'
    );
    expect(result.current.accessibility.loading()).toBe(
      'T:accessibility.loading'
    );
    expect(result.current.accessibility.doubleTabTo('save')).toBe(
      'double tap to save'
    );
    expect(tSpy).toHaveBeenCalledWith('accessibility.doubleTabTo', {
      action: 'save',
    });
  });
});

describe('useI18n — formatters', () => {
  it('currency formatter defaults to GBP and uses current language', () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.formatters.currency(120)).toBe('GBP:en:120');
    expect(mockFormatCurrency).toHaveBeenCalledWith(120, 'GBP', 'en');
  });

  it('currency formatter respects an explicit currency', () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.formatters.currency(50, 'EUR')).toBe('EUR:en:50');
    expect(mockFormatCurrency).toHaveBeenCalledWith(50, 'EUR', 'en');
  });

  it('date and relativeTime formatters delegate to i18n helpers', () => {
    const { result } = renderHook(() => useI18n());
    const d = new Date('2026-01-01T00:00:00Z');
    expect(result.current.formatters.date(d)).toBe('date:en');
    expect(result.current.formatters.relativeTime(d)).toBe('rel:en');
    expect(mockFormatDate).toHaveBeenCalledWith(d, 'en');
    expect(mockFormatRelativeTime).toHaveBeenCalledWith(d, 'en');
  });

  it('number formatter uses en-US locale for English', () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.formatters.number(1234567)).toBe('1,234,567');
  });

  it('number formatter falls back to toString when Intl throws', () => {
    const spy = jest.spyOn(Intl, 'NumberFormat').mockImplementation(() => {
      throw new Error('Intl broken');
    });
    const { result } = renderHook(() => useI18n());
    expect(result.current.formatters.number(42)).toBe('42');
    spy.mockRestore();
  });
});

describe('useI18n — error & success message helpers', () => {
  it('getErrorMessage returns the translation when present', () => {
    mockTImpl = (key) => (key === 'errors.network' ? 'Network error' : key);
    const { result } = renderHook(() => useI18n());
    expect(result.current.getErrorMessage('network')).toBe('Network error');
  });

  it('getErrorMessage returns the supplied fallback when translation missing', () => {
    mockTImpl = (key) => key; // echoes key -> translation === key -> missing
    const { result } = renderHook(() => useI18n());
    expect(result.current.getErrorMessage('weird', 'Custom fallback')).toBe(
      'Custom fallback'
    );
  });

  it('getErrorMessage returns the generic message when missing with no fallback', () => {
    mockTImpl = (key) =>
      key === 'errors.somethingWentWrong' ? 'Something went wrong' : key;
    const { result } = renderHook(() => useI18n());
    expect(result.current.getErrorMessage('weird')).toBe(
      'Something went wrong'
    );
  });

  it('getSuccessMessage returns the translation when present', () => {
    mockTImpl = (key) => (key === 'success.saved' ? 'Saved!' : key);
    const { result } = renderHook(() => useI18n());
    expect(result.current.getSuccessMessage('saved')).toBe('Saved!');
  });

  it('getSuccessMessage returns the supplied fallback when translation missing', () => {
    mockTImpl = (key) => key;
    const { result } = renderHook(() => useI18n());
    expect(result.current.getSuccessMessage('weird', 'Done custom')).toBe(
      'Done custom'
    );
  });

  it('getSuccessMessage returns the generic message when missing with no fallback', () => {
    mockTImpl = (key) =>
      key === 'success.actionCompleted' ? 'Action completed' : key;
    const { result } = renderHook(() => useI18n());
    expect(result.current.getSuccessMessage('weird')).toBe('Action completed');
  });
});

describe('useI18n — languageInfo', () => {
  it('exposes name/nativeName for a known language', () => {
    mockGetCurrentLanguage.mockReturnValue('es');
    const { result } = renderHook(() => useI18n());
    expect(result.current.languageInfo.current).toBe('es');
    expect(result.current.languageInfo.name).toBe('Spanish');
    expect(result.current.languageInfo.nativeName).toBe('Español');
    expect(result.current.languageInfo.isRTL).toBe(false);
  });

  it('lists all available languages with codes', () => {
    const { result } = renderHook(() => useI18n());
    const codes = result.current.languageInfo.available.map((l) => l.code);
    expect(codes).toEqual(expect.arrayContaining(['en', 'es', 'ar']));
    const ar = result.current.languageInfo.available.find(
      (l) => l.code === 'ar'
    );
    expect(ar?.isRTL).toBe(true);
    expect(ar?.nativeName).toBe('العربية');
  });

  it('falls back to English name when current language is unknown', () => {
    mockGetCurrentLanguage.mockReturnValue('zz' as never);
    const { result } = renderHook(() => useI18n());
    expect(result.current.languageInfo.name).toBe('English');
    expect(result.current.languageInfo.nativeName).toBe('English');
  });
});

describe('useI18n — switchLanguage', () => {
  it('changes language, fires selection haptic, and updates state on success', async () => {
    mockIsRTL.mockImplementation((lang?: string) => lang === 'ar');
    const { result } = renderHook(() => useI18n());

    await act(async () => {
      await result.current.switchLanguage('ar');
    });

    expect(mockChangeLanguage).toHaveBeenCalledWith('ar');
    expect(mockHapticsSelection).toHaveBeenCalledTimes(1);
    expect(result.current.currentLanguage).toBe('ar');
    expect(result.current.isRTL).toBe(true);
  });

  it('logs error and fires error haptic when changeLanguage rejects', async () => {
    mockChangeLanguage.mockRejectedValueOnce(new Error('switch failed'));
    const { result } = renderHook(() => useI18n());

    await act(async () => {
      await result.current.switchLanguage('es');
    });

    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to change language:',
      expect.any(Error)
    );
    expect(mockHapticsError).toHaveBeenCalledTimes(1);
    // state unchanged from initial
    expect(result.current.currentLanguage).toBe('en');
  });
});

describe('useI18n — languageChanged listener (RTL handling)', () => {
  it('updates state when language changes without an RTL flip', () => {
    mockIsRTL.mockImplementation((lang?: string) => false);
    const { result } = renderHook(() => useI18n());

    act(() => {
      mockI18n.emit('languageChanged', 'es');
    });

    expect(result.current.currentLanguage).toBe('es');
    expect(result.current.isRTL).toBe(false);
    // No RTL flip: I18nManager not touched.
    expect(mockAllowRTL).not.toHaveBeenCalled();
    expect(mockForceRTL).not.toHaveBeenCalled();
  });

  it('flips I18nManager and warns when new language requires RTL change', () => {
    I18nManager.isRTL = false; // currently LTR
    mockIsRTL.mockImplementation((lang?: string) => lang === 'ar');
    const { result } = renderHook(() => useI18n());

    act(() => {
      mockI18n.emit('languageChanged', 'ar');
    });

    expect(result.current.currentLanguage).toBe('ar');
    expect(result.current.isRTL).toBe(true);
    expect(mockAllowRTL).toHaveBeenCalledWith(true);
    expect(mockForceRTL).toHaveBeenCalledWith(true);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'RTL layout change detected. App restart may be required.'
    );
  });

  it('does not flip I18nManager when RTL state already matches', () => {
    I18nManager.isRTL = true; // already RTL
    mockIsRTL.mockImplementation((lang?: string) => lang === 'ar');
    const { result } = renderHook(() => useI18n());

    act(() => {
      mockI18n.emit('languageChanged', 'ar'); // ar is RTL, matches isRTL=true
    });

    expect(result.current.currentLanguage).toBe('ar');
    expect(mockAllowRTL).not.toHaveBeenCalled();
    expect(mockForceRTL).not.toHaveBeenCalled();
  });
});
