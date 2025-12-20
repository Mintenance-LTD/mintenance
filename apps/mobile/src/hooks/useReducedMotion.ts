/**
 * useReducedMotion Hook - React Native
 * WCAG 2.1 Level AA Compliance (Guideline 2.3.3)
 * European Accessibility Act Compliance (2025)
 *
 * Detects if the user has requested reduced motion via their system preferences
 * on iOS and Android devices.
 *
 * @returns {boolean} true if user prefers reduced motion, false otherwise
 *
 * @example
 * ```typescript
 * import { useReducedMotion } from '@/hooks/useReducedMotion';
 *
 * function MyComponent() {
 *   const reducedMotion = useReducedMotion();
 *
 *   return (
 *     <Animated.View
 *       style={{
 *         opacity: reducedMotion ? 1 : fadeAnim
 *       }}
 *     >
 *       Content
 *     </Animated.View>
 *   );
 * }
 * ```
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  // Initialize with false (default state)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial reduced motion preference
    const checkReducedMotion = async () => {
      try {
        const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        setPrefersReducedMotion(isReduceMotionEnabled);
      } catch (error) {
        // Fallback to false if AccessibilityInfo is not available
        console.warn('AccessibilityInfo.isReduceMotionEnabled not available:', error);
        setPrefersReducedMotion(false);
      }
    };

    checkReducedMotion();

    // Listen for changes to reduced motion preference
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isReduceMotionEnabled: boolean) => {
        setPrefersReducedMotion(isReduceMotionEnabled);
      }
    );

    // Cleanup listener on unmount
    return () => {
      subscription?.remove();
    };
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
 * const { shouldAnimate, getDuration } = useMotionPreference();
 *
 * <Animated.View
 *   style={{
 *     opacity: shouldAnimate ? fadeAnim : 1
 *   }}
 * />
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
     * Get animation duration with reduced motion support
     * Returns 0 if reduced motion is preferred
     */
    getDuration: (duration: number): number => {
      if (prefersReducedMotion) {
        return 0;
      }
      return duration;
    },

    /**
     * Get animation config with reduced motion support
     * Returns instant animation if reduced motion is preferred
     */
    getAnimationConfig: <T extends Record<string, unknown>>(
      config?: T
    ): T | { duration: number; useNativeDriver: boolean } => {
      if (prefersReducedMotion) {
        return { duration: 0, useNativeDriver: true };
      }
      return config ?? ({} as T);
    },

    /**
     * Conditionally execute animation
     * Returns a no-op function if reduced motion is preferred
     */
    withAnimation: <T extends (...args: unknown[]) => unknown>(
      animationFn: T
    ): T | (() => void) => {
      if (prefersReducedMotion) {
        return () => {
          // No-op
        };
      }
      return animationFn;
    },
  };
}

/**
 * Helper to get animation value with reduced motion support
 * Returns final value immediately if reduced motion is preferred
 *
 * @example
 * ```typescript
 * const animatedValue = useAnimatedValue(reducedMotion, {
 *   initial: 0,
 *   final: 1
 * });
 * ```
 */
export function useAnimatedValue(
  shouldReduce: boolean,
  config: {
    initial: number;
    final: number;
  }
): number {
  return shouldReduce ? config.final : config.initial;
}

/**
 * Helper to conditionally apply animation properties
 *
 * @example
 * ```typescript
 * const style = useConditionalAnimation(reducedMotion, {
 *   animated: { opacity: fadeAnim },
 *   static: { opacity: 1 }
 * });
 * ```
 */
export function useConditionalAnimation<T>(
  shouldReduce: boolean,
  config: {
    animated: T;
    static: T;
  }
): T {
  return shouldReduce ? config.static : config.animated;
}

/**
 * Check if screen reader is enabled
 * Useful for adjusting animations when assistive technology is active
 */
export function useScreenReaderEnabled(): boolean {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkScreenReader = async () => {
      try {
        const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        setIsEnabled(screenReaderEnabled);
      } catch (error) {
        console.warn('AccessibilityInfo.isScreenReaderEnabled not available:', error);
        setIsEnabled(false);
      }
    };

    checkScreenReader();

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isScreenReaderEnabled: boolean) => {
        setIsEnabled(isScreenReaderEnabled);
      }
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  return isEnabled;
}

/**
 * Combined accessibility hook
 * Returns all accessibility states in one object
 *
 * @example
 * ```typescript
 * const { reducedMotion, screenReader, shouldSimplifyUI } = useAccessibilityState();
 * ```
 */
export function useAccessibilityState() {
  const reducedMotion = useReducedMotion();
  const screenReader = useScreenReaderEnabled();

  return {
    /** Whether user prefers reduced motion */
    reducedMotion,

    /** Whether screen reader is active */
    screenReader,

    /** Whether UI should be simplified (either condition true) */
    shouldSimplifyUI: reducedMotion || screenReader,

    /** Whether animations should be disabled */
    shouldDisableAnimations: reducedMotion,

    /** Whether to use alternative feedback (vibration, sound) */
    shouldUseAlternativeFeedback: screenReader,
  };
}

/**
 * Default export for convenience
 */
export default useReducedMotion;
