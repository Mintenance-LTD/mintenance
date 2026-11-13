/**
 * useReducedMotion Hook
 * WCAG 2.1 Level AA Compliance (Guideline 2.3.3)
 *
 * Detects if the user has requested reduced motion via their system preferences
 * and updates dynamically if the preference changes during the session.
 *
 * @returns {boolean} true if user prefers reduced motion, false otherwise
 *
 * @example
 * ```typescript
 * const reducedMotion = useReducedMotion();
 *
 * <motion.div
 *   variants={reducedMotion ? {} : fadeIn}
 *   initial={reducedMotion ? false : "initial"}
 *   animate={reducedMotion ? false : "animate"}
 * >
 *   Content
 * </motion.div>
 * ```
 */

'use client';

import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  // Initialize with false (SSR-safe)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side only)
    if (typeof window === 'undefined') {
      return;
    }

    // Create media query for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value based on current preference
    setPrefersReducedMotion(mediaQuery.matches);

    // Handler for preference changes
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers support addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);

      // Cleanup listener on unmount
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
    // Legacy browsers (Safari < 14) use addListener
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);

      // Cleanup listener on unmount
      return () => {
        mediaQuery.removeListener?.(handleChange);
      };
    }
  }, []);

  return prefersReducedMotion;
}

/**
 * Motion props interface for conditional motion
 */
