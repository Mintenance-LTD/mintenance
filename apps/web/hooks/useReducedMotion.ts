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
 * Hook variant that returns motion state object for more control
 *
 * @returns Object with motion state and helper functions
 *
 * @example
 * ```typescript
 * const { shouldAnimate, getTransition } = useMotionPreference();
 *
 * <motion.div
 *   animate={shouldAnimate ? { x: 100 } : {}}
 *   transition={getTransition({ duration: 0.3 })}
 * >
 *   Content
 * </motion.div>
 * ```
 */
export function useMotionPreference() {
  const prefersReducedMotion = useReducedMotion();

  return {
    /** Whether animations should be applied */
    shouldAnimate: !prefersReducedMotion,

    /** Whether reduced motion is preferred */
    prefersReducedMotion,

    /**
     * Get transition config with reduced motion support
     * Returns instant transition if reduced motion is preferred
     */
    getTransition: <T extends Record<string, unknown>>(transition?: T): T | { duration: number } => {
      if (prefersReducedMotion) {
        return { duration: 0 };
      }
      return transition ?? {} as T;
    },

    /**
     * Get variants with reduced motion support
     * Returns empty variants if reduced motion is preferred
     */
    getVariants: <T extends Record<string, unknown>>(variants?: T): T | Record<string, never> => {
      if (prefersReducedMotion) {
        return {};
      }
      return variants ?? {} as T;
    },
  };
}

/**
 * Motion props interface for conditional motion
 */
interface MotionProps {
  variants?: Record<string, unknown>;
  initial?: string | boolean;
  animate?: string | boolean;
  exit?: string | boolean;
  transition?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Helper to conditionally apply motion props
 * Returns static props if reduced motion is preferred
 *
 * @example
 * ```typescript
 * const motionProps = useConditionalMotion({
 *   variants: fadeIn,
 *   initial: "initial",
 *   animate: "animate"
 * });
 *
 * <motion.div {...motionProps}>
 *   Content
 * </motion.div>
 * ```
 */
export function useConditionalMotion(motionProps: MotionProps): MotionProps | Record<string, never> {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    // Return empty object - component renders as static div
    return {};
  }

  return motionProps;
}
