'use client';

import { useState, useEffect, useCallback } from 'react';
import { t, loadLocale, getCurrentLocale, formatCurrency, formatDate, formatRelativeTime } from './index';
import type { Locale } from './index';

/**
 * React hook for translations.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, formatCurrency } = useTranslation();
 *   return <p>{t('common.loading')}</p>;
 * }
 * ```
 */
export function useTranslation() {
  const [ready, setReady] = useState(false);
  const [locale, setLocale] = useState<Locale>(getCurrentLocale());

  useEffect(() => {
    loadLocale(locale).then(() => setReady(true));
  }, [locale]);

  const changeLocale = useCallback(async (newLocale: Locale) => {
    await loadLocale(newLocale);
    setLocale(newLocale);
  }, []);

  return {
    t,
    locale,
    ready,
    changeLocale,
    formatCurrency,
    formatDate,
    formatRelativeTime,
  };
}
