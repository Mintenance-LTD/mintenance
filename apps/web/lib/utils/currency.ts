/**
 * Currency Utility
 * Supports multiple currencies with fluid conversion
 */

export type CurrencyCode = 'GBP' | 'USD' | 'EUR';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
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
 * Detect currency based on user's location/locale
 */
function detectCurrencyFromLocation(): CurrencyCode {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;

  // Try to detect from browser locale
  const locale = navigator.language || navigator.languages?.[0] || 'en-GB';
  
  // Check locale for currency hints
  if (locale.includes('GB') || locale.includes('UK')) {
    return 'GBP';
  }
  if (locale.includes('US') || locale.includes('en-US')) {
    return 'USD';
  }
  if (locale.includes('EU') || locale.includes('FR') || locale.includes('DE') || locale.includes('IT') || locale.includes('ES')) {
    return 'EUR';
  }

  // Try to detect from timezone
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // UK timezones
    if (timezone.includes('London') || timezone.includes('Europe/London')) {
      return 'GBP';
    }
    
    // US timezones
    if (timezone.includes('America/') || timezone.includes('US/')) {
      return 'USD';
    }
    
    // European timezones
    if (timezone.includes('Europe/')) {
      // Most European countries use EUR, but UK uses GBP
      if (timezone.includes('London')) {
        return 'GBP';
      }
      return 'EUR';
    }
  } catch (e) {
    // Fallback to default
  }

  // Default to GBP (British app)
  return DEFAULT_CURRENCY;
}

/**
 * Get current currency from user settings or detect from location
 */
export function getCurrentCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;
  
  const stored = localStorage.getItem('preferredCurrency');
  if (stored && stored in CURRENCIES) {
    return stored as CurrencyCode;
  }
  
  // Auto-detect from location if no preference set
  return detectCurrencyFromLocation();
}

/**
 * Set user's preferred currency
 */
export function setPreferredCurrency(currency: CurrencyCode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('preferredCurrency', currency);
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(
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

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[£$€,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format currency without trailing zeros
 */
export function formatCurrencyCompact(amount: number, currency?: CurrencyCode): string {
  const formatted = formatCurrency(amount, currency);
  return formatted.replace(/\.00$/, '');
}

/**
 * Get currency symbol only
 */
export function getCurrencySymbol(currency?: CurrencyCode): string {
  const code = currency || getCurrentCurrency();
  return CURRENCIES[code].symbol;
}

