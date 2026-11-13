/**
 * Currency Utility
 * Supports multiple currencies with fluid conversion
 */

type CurrencyCode = 'GBP' | 'USD' | 'EUR';

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'en-EU',
  },
};

// Default currency
const DEFAULT_CURRENCY: CurrencyCode = 'GBP';

/**
 * Get current currency from user settings or default to GBP
 * Always defaults to GBP for British app (no auto-detection)
 */
function getCurrentCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;

  const stored = localStorage.getItem('preferredCurrency');
  if (stored && stored in CURRENCIES) {
    return stored as CurrencyCode;
  }

  // Always default to GBP for British app (no auto-detection)
  return DEFAULT_CURRENCY;
}

/**
 * Format amount with currency symbol
 */
function formatCurrency(
  amount: number,
  currencyCode?: CurrencyCode,
  options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    decimals?: number;
  }
): string {
  const currency = currencyCode || getCurrentCurrency();
  const config = CURRENCIES[currency];
  const decimals = options?.decimals ?? 2;

  // Format the number with locale
  const formatted = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  // Build output
  const parts: string[] = [];

  if (options?.showSymbol !== false) {
    parts.push(config.symbol);
  }

  parts.push(formatted);

  if (options?.showCode) {
    parts.push(config.code);
  }

  return parts.join('');
}

/**
 * Format currency for display (default behavior)
 * Always defaults to GBP for British app
 */
export function formatMoney(amount: number, currency?: CurrencyCode): string {
  // Always default to GBP if no currency specified (British app)
  const currencyToUse = currency || 'GBP';
  return formatCurrency(amount, currencyToUse, { showSymbol: true });
}
