/**
 * Mobile UI helpers for the canonical 4-tier severity scale.
 *
 * `SeverityTier` and `normalizeSeverity` are re-exported from
 * `@mintenance/ai-core/types` so there is a single source of truth shared
 * by web and mobile. This file adds React Native-specific display metadata
 * (colors, badges) on top of the canonical types.
 */

import {
  type SeverityTier,
  normalizeSeverity,
} from '@mintenance/ai-core/types';

export { type SeverityTier, normalizeSeverity };

export interface SeverityDisplay {
  label: string;
  color: string;
  bg: string;
  badgeVariant: 'success' | 'warning' | 'error';
}

/**
 * Display metadata for each canonical severity tier.
 * Matches the web admin dashboard colors for consistency.
 */
export const SEVERITY_DISPLAY: Record<SeverityTier, SeverityDisplay> = {
  early: {
    label: 'Early',
    color: '#16A34A',
    bg: '#DCFCE7',
    badgeVariant: 'success',
  },
  developing: {
    label: 'Developing',
    color: '#A16207',
    bg: '#FEF9C3',
    badgeVariant: 'warning',
  },
  significant: {
    label: 'Significant',
    color: '#EA580C',
    bg: '#FFF7ED',
    badgeVariant: 'warning',
  },
  dangerous: {
    label: 'Dangerous',
    color: '#DC2626',
    bg: '#FEE2E2',
    badgeVariant: 'error',
  },
};

/**
 * Convenience helper: get display metadata for a raw severity value.
 * Delegates to `normalizeSeverity` from ai-core to handle legacy inputs.
 */
export function getSeverityDisplay(severity: unknown): SeverityDisplay {
  return SEVERITY_DISPLAY[normalizeSeverity(severity)];
}
