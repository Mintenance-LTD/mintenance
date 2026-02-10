/**
 * Lightweight i18n Foundation (Issue 52)
 *
 * Provides translation infrastructure without external dependencies.
 * Default locale: en-GB (UK English).
 *
 * To add a new locale:
 * 1. Create a new file in ./locales/ (e.g., fr.ts)
 * 2. Add it to the LOCALES map below
 * 3. Keys follow dot notation: 'common.loading', 'auth.loginButton'
 */

export type Locale = 'en-GB';
export const DEFAULT_LOCALE: Locale = 'en-GB';
export const SUPPORTED_LOCALES: Locale[] = ['en-GB'];

type TranslationDictionary = Record<string, string>;

// Lazy-load locale dictionaries
const LOCALE_LOADERS: Record<Locale, () => Promise<{ default: TranslationDictionary }>> = {
  'en-GB': () => import('./locales/en-GB'),
};

let currentLocale: Locale = DEFAULT_LOCALE;
let currentDictionary: TranslationDictionary | null = null;

/**
 * Load a locale dictionary
 */
export async function loadLocale(locale: Locale): Promise<TranslationDictionary> {
  const loader = LOCALE_LOADERS[locale];
  if (!loader) {
    throw new Error(`Unsupported locale: ${locale}`);
  }
  const module = await loader();
  currentLocale = locale;
  currentDictionary = module.default;
  return module.default;
}

/**
 * Get a translation by key with optional interpolation.
 *
 * @example
 * t('common.welcome', { name: 'John' }) // "Welcome, John"
 * t('errors.notFound') // "Not found"
 */
export function t(key: string, params?: Record<string, string | number>): string {
  if (!currentDictionary) {
    // Return key as fallback if dictionary not loaded
    return key;
  }

  let value = currentDictionary[key];
  if (!value) {
    // Fallback: return the key itself
    return key;
  }

  // Interpolate {{param}} placeholders
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
    }
  }

  return value;
}

/**
 * Get current locale
 */
export function getCurrentLocale(): Locale {
  return currentLocale;
}

/**
 * Format currency for the current locale
 */
export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat(currentLocale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date for the current locale
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(currentLocale, options).format(d);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(currentLocale, { numeric: 'auto' });

  if (diffDay > 0) return rtf.format(-diffDay, 'day');
  if (diffHour > 0) return rtf.format(-diffHour, 'hour');
  if (diffMin > 0) return rtf.format(-diffMin, 'minute');
  return rtf.format(-diffSec, 'second');
}
