/**
 * Editorial-aware token shim for components that use inline
 * `theme.colors.*` references from `@/lib/theme`.
 *
 * Pre-Phase-4 the theme module exposed a static colours object
 * (`theme.colors.primary`, `theme.colors.textPrimary`, etc.) which
 * works fine for legacy markup but doesn't know about the Mint
 * Editorial CSS-variable palette (`--me-brand`, `--me-ink`, etc.).
 *
 * Components that can't migrate fully to canonical primitives (large
 * cards with dense inline-styled JS — NearbyJobCard, DiscoverJobCard
 * fragments) call `useEditorialTokens()` and use the returned object
 * instead of `theme.colors.*`. The hook returns CSS-variable strings
 * (`var(--me-brand)` etc.) on editorial mode and the legacy theme
 * hexes on default mode.
 */

'use client';

import { useEffect, useState } from 'react';
import { theme } from '@/lib/theme';

export interface EditorialTokens {
  isMintEditorial: boolean;
  primary: string;
  primarySoft: string;
  white: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  border: string;
  borderSoft: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

const EDITORIAL_TOKENS: Omit<EditorialTokens, 'isMintEditorial'> = {
  primary: 'var(--me-brand)',
  primarySoft: 'var(--me-brand-soft)',
  white: 'var(--me-on-brand)',
  textPrimary: 'var(--me-ink)',
  textSecondary: 'var(--me-ink-2)',
  textTertiary: 'var(--me-ink-3)',
  background: 'var(--me-bg)',
  backgroundSecondary: 'var(--me-bg-2)',
  backgroundTertiary: 'var(--me-bg-3)',
  border: 'var(--me-line)',
  borderSoft: 'var(--me-line-2)',
  // Status colours stay semantic — green for success, amber for
  // warning, etc. Editorial uses warmer hues than legacy but they're
  // still recognisable as status markers.
  success: 'var(--me-ok)',
  warning: 'var(--me-warm)',
  danger: 'var(--me-err)',
  info: 'var(--me-brand)',
};

export function useEditorialTokens(): EditorialTokens {
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (isMintEditorial) {
    return { isMintEditorial: true, ...EDITORIAL_TOKENS };
  }

  // Legacy: read straight from the `theme.colors` static object.
  // The colour token bag is widely typed (tokens.colors + extended
  // teal/navy/etc.) — cast to Record so optional fields (primarySoft,
  // borderSoft, danger) don't fail when missing.
  const legacy = theme.colors as unknown as Record<string, string>;
  return {
    isMintEditorial: false,
    primary: legacy.primary,
    primarySoft: legacy.primarySoft ?? legacy.primary,
    white: legacy.white,
    textPrimary: legacy.textPrimary,
    textSecondary: legacy.textSecondary,
    textTertiary: legacy.textTertiary,
    background: legacy.background,
    backgroundSecondary: legacy.backgroundSecondary,
    backgroundTertiary: legacy.backgroundTertiary,
    border: legacy.border,
    borderSoft: legacy.borderSoft ?? legacy.border,
    success: legacy.success,
    warning: legacy.warning,
    danger: legacy.danger ?? legacy.error,
    info: legacy.info,
  };
}
