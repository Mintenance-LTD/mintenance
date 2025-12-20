/**
 * Data Formatting Utilities
 *
 * Consistent formatters for currency, dates, numbers, and other data types.
 * Ensures trustworthy data presentation across the application.
 */

// ============================================
// CURRENCY FORMATTING
// ============================================

interface CurrencyOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  notation?: 'standard' | 'compact';
  showCurrency?: boolean;
  fallback?: string;
}

/**
 * Format a number as currency with consistent styling
 */
export function formatCurrency(
  value: number | string | null | undefined,
  options: CurrencyOptions = {}
): string {
  const {
    locale = 'en-GB',
    currency = 'GBP',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    notation = 'standard',
    showCurrency = true,
    fallback = '£0',
  } = options;

  // Handle null/undefined values
  if (value === null || value === undefined) {
    return fallback;
  }

  // Convert string to number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Handle invalid numbers
  if (isNaN(numValue)) {
    return fallback;
  }

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: showCurrency ? 'currency' : 'decimal',
      currency: showCurrency ? currency : undefined,
      minimumFractionDigits,
      maximumFractionDigits,
      notation,
    });

    return formatter.format(numValue);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return fallback;
  }
}

/**
 * Format currency in compact notation (e.g., £1.2K, £3.5M)
 */
export function formatCompactCurrency(
  value: number | string | null | undefined,
  options: Omit<CurrencyOptions, 'notation'> = {}
): string {
  return formatCurrency(value, { ...options, notation: 'compact' });
}

/**
 * Format currency range
 */
export function formatCurrencyRange(
  min: number | null | undefined,
  max: number | null | undefined,
  options: CurrencyOptions = {}
): string {
  const formattedMin = formatCurrency(min, options);
  const formattedMax = formatCurrency(max, options);

  if (min === max || !max) {
    return formattedMin;
  }

  return `${formattedMin} - ${formattedMax}`;
}

// ============================================
// NUMBER FORMATTING
// ============================================

interface NumberOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  notation?: 'standard' | 'compact' | 'scientific' | 'engineering';
  fallback?: string;
}

/**
 * Format a number with consistent styling
 */
export function formatNumber(
  value: number | string | null | undefined,
  options: NumberOptions = {}
): string {
  const {
    locale = 'en-GB',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    notation = 'standard',
    fallback = '0',
  } = options;

  if (value === null || value === undefined) {
    return fallback;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return fallback;
  }

  try {
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
      notation,
    });

    return formatter.format(numValue);
  } catch (error) {
    console.error('Number formatting error:', error);
    return fallback;
  }
}

/**
 * Format percentage with consistent styling
 */
export function formatPercentage(
  value: number | null | undefined,
  options: { decimals?: number; fallback?: string } = {}
): string {
  const { decimals = 0, fallback = '0%' } = options;

  if (value === null || value === undefined) {
    return fallback;
  }

  if (isNaN(value)) {
    return fallback;
  }

  return `${value.toFixed(decimals)}%`;
}

/**
 * Format change/trend with + or - prefix
 */
export function formatChange(
  value: number | null | undefined,
  options: { decimals?: number; prefix?: boolean; fallback?: string } = {}
): string {
  const { decimals = 1, prefix = true, fallback = '0' } = options;

  if (value === null || value === undefined) {
    return fallback;
  }

  if (isNaN(value)) {
    return fallback;
  }

  const formatted = value.toFixed(decimals);
  if (!prefix) return formatted;

  return value > 0 ? `+${formatted}` : formatted;
}

// ============================================
// DATE & TIME FORMATTING
// ============================================

interface DateOptions {
  locale?: string;
  format?: 'short' | 'medium' | 'long' | 'full' | 'relative' | 'time' | 'datetime';
  fallback?: string;
}

/**
 * Format a date with consistent styling
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  options: DateOptions = {}
): string {
  const { locale = 'en-GB', format = 'medium', fallback = '' } = options;

  if (!date) return fallback;

  try {
    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
      return fallback;
    }

    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString(locale, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

      case 'medium':
        return dateObj.toLocaleDateString(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

      case 'long':
        return dateObj.toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

      case 'full':
        return dateObj.toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

      case 'time':
        return dateObj.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        });

      case 'datetime':
        return dateObj.toLocaleString(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

      case 'relative':
        return formatRelativeTime(dateObj);

      default:
        return dateObj.toLocaleDateString(locale);
    }
  } catch (error) {
    console.error('Date formatting error:', error);
    return fallback;
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  date: Date | string | number,
  baseDate: Date = new Date()
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const diffMs = dateObj.getTime() - baseDate.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffSecs) < 60) {
    return 'just now';
  } else if (Math.abs(diffMins) < 60) {
    return rtf.format(diffMins, 'minute');
  } else if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  } else if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, 'day');
  } else if (Math.abs(diffWeeks) < 4) {
    return rtf.format(diffWeeks, 'week');
  } else if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, 'month');
  } else {
    return rtf.format(diffYears, 'year');
  }
}

// ============================================
// STRING FORMATTING
// ============================================

/**
 * Pluralize a word based on count
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(
  text: string | null | undefined,
  maxLength: number,
  ellipsis: string = '...'
): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${pluralize(seconds, 'second')}`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} ${pluralize(minutes, 'minute')}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    if (remainingMinutes === 0) {
      return `${hours} ${pluralize(hours, 'hour')}`;
    }
    return `${hours} ${pluralize(hours, 'hour')} ${remainingMinutes} ${pluralize(remainingMinutes, 'minute')}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return `${days} ${pluralize(days, 'day')}`;
  }
  return `${days} ${pluralize(days, 'day')} ${remainingHours} ${pluralize(remainingHours, 'hour')}`;
}

// ============================================
// STATUS & LABEL FORMATTING
// ============================================

/**
 * Format status for display
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'in-progress': 'In Progress',
    'in_progress': 'In Progress',
    'pending': 'Pending',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'posted': 'Posted',
    'assigned': 'Assigned',
    'draft': 'Draft',
    'active': 'Active',
    'inactive': 'Inactive',
    'archived': 'Archived',
  };

  return statusMap[status.toLowerCase()] || status;
}

/**
 * Format phone number
 */
export function formatPhoneNumber(
  phone: string | null | undefined,
  format: 'international' | 'national' = 'national'
): string {
  if (!phone) return '';

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // UK phone number formatting
  if (cleaned.startsWith('44')) {
    const number = cleaned.substring(2);
    if (format === 'international') {
      return `+44 ${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
    }
    return `0${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }

  // Default UK format (assuming UK number without country code)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }

  // Return original if no formatting rules apply
  return phone;
}

// ============================================
// CHART DATA FORMATTING
// ============================================

/**
 * Ensure chart data has meaningful ranges and values
 */
export function normalizeChartData(
  data: any[],
  options: {
    minValue?: number;
    maxValue?: number;
    fillEmpty?: boolean;
    emptyValue?: number;
  } = {}
): any[] {
  const { minValue = 0, maxValue, fillEmpty = true, emptyValue = 0 } = options;

  if (!data || data.length === 0) {
    // Return placeholder data if empty
    if (fillEmpty) {
      return [
        { label: 'No Data', value: emptyValue },
      ];
    }
    return [];
  }

  // Normalize values to ensure they're within range
  return data.map(item => ({
    ...item,
    value: Math.max(
      minValue,
      Math.min(item.value || emptyValue, maxValue || item.value || emptyValue)
    ),
  }));
}

// ============================================
// EXPORT ALL FORMATTERS
// ============================================

export const formatters = {
  currency: formatCurrency,
  compactCurrency: formatCompactCurrency,
  currencyRange: formatCurrencyRange,
  number: formatNumber,
  percentage: formatPercentage,
  change: formatChange,
  date: formatDate,
  relativeTime: formatRelativeTime,
  pluralize,
  truncate,
  fileSize: formatFileSize,
  duration: formatDuration,
  status: formatStatus,
  phoneNumber: formatPhoneNumber,
  normalizeChartData,
} as const;

export default formatters;