/**
 * Editorial-aware chart palette helpers.
 *
 * Tremor (`@tremor/react`) accepts a fixed set of named colour keys
 * (blue / cyan / emerald / green / teal / amber / yellow / red / rose
 * / violet / etc.) and resolves them at runtime to Tailwind palette
 * hexes. Tremor does NOT read CSS variables, so we cannot pass
 * `var(--me-brand)` directly — we have to choose the closest named
 * key per theme.
 *
 * Recharts accepts hex strings directly, so for those charts we
 * return `--me-brand` (`#3f8c7a`) on Mint Editorial and the legacy
 * teal-500 (`#14B8A6`) on the default theme.
 *
 * Usage:
 *   const palette = useChartPalette();
 *   <AreaChart colors={palette.tremor.primary} … />
 *   <Area stroke={palette.recharts.primary} … />
 */

'use client';

import { useEffect, useState } from 'react';

// Tremor-named colour keys, ordered as the brand → comparison →
// tertiary stack. Editorial leans on `emerald` (closest to the mint
// `#3f8c7a` brand) and a quieter neutral row; legacy keeps the
// teal-led stack the codebase already shipped.
// Tremor's `colors` prop requires a mutable `string[]`, so these are
// non-readonly arrays.
function editorialTremorStack(): string[] {
  return ['emerald', 'teal', 'amber', 'rose', 'violet', 'cyan'];
}

function legacyTremorStack(): string[] {
  return ['teal', 'blue', 'amber', 'emerald', 'rose', 'violet'];
}

// Recharts inline hex values. `--me-brand` resolves to `#3f8c7a`.
interface RechartsPalette {
  primary: string;
  primarySoft: string;
  secondary: string;
  accent: string;
  gridStroke: string;
  axisStroke: string;
  tooltipBorder: string;
  tooltipText: string;
}

const EDITORIAL_RECHARTS: RechartsPalette = {
  primary: '#3f8c7a',
  primarySoft: '#dceae5',
  secondary: '#1f5046',
  accent: '#f59e0b', // amber-500 keeps category contrast
  gridStroke: '#e6efe9', // close to --me-line-2
  axisStroke: '#6b6b6b', // close to --me-ink-3
  tooltipBorder: '#dde1de',
  tooltipText: '#0e1e1a', // close to --me-ink
};

const LEGACY_RECHARTS: RechartsPalette = {
  primary: '#14B8A6',
  primarySoft: '#CCFBF1',
  secondary: '#1F2937',
  accent: '#F59E0B',
  gridStroke: '#E5E7EB',
  axisStroke: '#6B7280',
  tooltipBorder: '#E5E7EB',
  tooltipText: '#111827',
};

export interface ChartPalette {
  isMintEditorial: boolean;
  tremor: {
    /** Ordered list — pass as `colors={palette.tremor.stack}`. */
    stack: string[];
    /** First/primary colour — pass as `colors={[palette.tremor.primary]}`. */
    primary: string;
  };
  recharts: RechartsPalette;
}

/**
 * Hydration-safe palette hook. Returns the legacy palette during
 * SSR + initial render; flips to editorial after mount when the
 * `<html data-theme="mint-editorial">` attribute is set by
 * `apps/web/app/layout.tsx`.
 */
export function useChartPalette(): ChartPalette {
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  const tremorStack = isMintEditorial
    ? editorialTremorStack()
    : legacyTremorStack();

  return {
    isMintEditorial,
    tremor: {
      stack: tremorStack,
      primary: tremorStack[0],
    },
    recharts: isMintEditorial ? EDITORIAL_RECHARTS : LEGACY_RECHARTS,
  };
}
