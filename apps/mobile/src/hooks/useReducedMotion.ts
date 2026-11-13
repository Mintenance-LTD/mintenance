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
import { logger } from '@mintenance/shared';

function useReducedMotion(): boolean {
  // Initialize with false (default state)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial reduced motion preference
    const checkReducedMotion = async () => {
      try {
        const isReduceMotionEnabled =
          await AccessibilityInfo.isReduceMotionEnabled();
        setPrefersReducedMotion(isReduceMotionEnabled);
      } catch (error) {
        // Fallback to false if AccessibilityInfo is not available
        logger.warn('AccessibilityInfo.isReduceMotionEnabled not available', {
          service: 'mobile',
          error: String(error),
        });
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


/**
 * Check if screen reader is enabled
 * Useful for adjusting animations when assistive technology is active
 */
function useScreenReaderEnabled(): boolean {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkScreenReader = async () => {
      try {
        const screenReaderEnabled =
          await AccessibilityInfo.isScreenReaderEnabled();
        setIsEnabled(screenReaderEnabled);
      } catch (error) {
        logger.warn('AccessibilityInfo.isScreenReaderEnabled not available', {
          service: 'mobile',
          error: String(error),
        });
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


/**
 * Default export for convenience
 */
export default useReducedMotion;
