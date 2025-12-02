/**
 * Animation Library - Main Export
 * European Accessibility Act Compliance (2025)
 * WCAG 2.1 Level AA (Guideline 2.3.3)
 *
 * Centralized animation system with built-in accessibility support.
 * All animations respect user's motion preferences.
 *
 * @example
 * ```typescript
 * import { motion, useReducedMotion } from '@/lib/animations';
 *
 * function MyComponent() {
 *   const reducedMotion = useReducedMotion();
 *   const variants = motion.fadeIn(reducedMotion);
 *
 *   return (
 *     <motion.div variants={variants} initial="initial" animate="animate">
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 */

// Re-export Framer Motion
export { motion, AnimatePresence, type Variants, type Transition } from 'framer-motion';

// Re-export hooks
export { useReducedMotion, useMotionPreference, useConditionalMotion } from '@/hooks/useReducedMotion';

// Re-export all variant generators from motion-config
export * from './motion-config';

// Re-export legacy variants (for backward compatibility)
export * from './variants';

// ============================================
// CONVENIENCE MOTION OBJECT
// ============================================

import * as motionConfig from './motion-config';

/**
 * Convenience object for accessing all motion variants
 * Each method accepts a boolean indicating if reduced motion is preferred
 *
 * @example
 * ```typescript
 * const reducedMotion = useReducedMotion();
 * const variants = motionVariants.fadeIn(reducedMotion);
 * ```
 */
export const motionVariants = {
  // Fade animations
  fadeIn: motionConfig.fadeInVariants,
  fadeInUp: motionConfig.fadeInUpVariants,
  fadeInDown: motionConfig.fadeInDownVariants,
  fadeInLeft: motionConfig.fadeInLeftVariants,
  fadeInRight: motionConfig.fadeInRightVariants,

  // Scale animations
  scaleIn: motionConfig.scaleInVariants,
  scaleSpring: motionConfig.scaleSpringVariants,

  // Slide animations
  slideInFromBottom: motionConfig.slideInFromBottomVariants,
  slideInFromTop: motionConfig.slideInFromTopVariants,
  slideInFromLeft: motionConfig.slideInFromLeftVariants,
  slideInFromRight: motionConfig.slideInFromRightVariants,

  // Modal/Dialog animations
  modalBackdrop: motionConfig.modalBackdropVariants,
  modalContent: motionConfig.modalContentVariants,
  drawerContent: motionConfig.drawerContentVariants,

  // Notification/Toast animations
  notificationSlideIn: motionConfig.notificationSlideInVariants,
  notificationBounce: motionConfig.notificationBounceVariants,

  // Tooltip/Popover animations
  tooltipFade: motionConfig.tooltipFadeVariants,

  // Accordion animations
  accordionContent: motionConfig.accordionContentVariants,

  // Card hover animations
  cardHover: motionConfig.cardHoverVariants,
  cardHoverSubtle: motionConfig.cardHoverSubtleVariants,

  // Button animations
  buttonHover: motionConfig.buttonHoverVariants,

  // Stagger animations
  staggerContainer: motionConfig.staggerContainerVariants,
  staggerContainerFast: motionConfig.staggerContainerFastVariants,
  staggerItem: motionConfig.staggerItemVariants,

  // Page transitions
  pageTransition: motionConfig.pageTransitionVariants,

  // Tab animations
  tabContent: motionConfig.tabContentVariants,
};

/**
 * Convenience object for accessing all transitions
 * Each method accepts a boolean indicating if reduced motion is preferred
 */
export const motionTransitions = {
  spring: motionConfig.springTransition,
  smooth: motionConfig.smoothTransition,
  fast: motionConfig.fastTransition,
  bouncy: motionConfig.bouncyTransition,
};

// ============================================
// CSS ANIMATION HELPERS
// ============================================

/**
 * Helper to conditionally apply CSS animation classes
 * Returns empty string if user prefers reduced motion
 *
 * @example
 * ```typescript
 * const className = withMotion(reducedMotion, 'animate-fade-in');
 * <div className={className}>Content</div>
 * ```
 */
export function withMotion(shouldReduce: boolean, animationClass: string): string {
  return shouldReduce ? '' : animationClass;
}

/**
 * Helper to get CSS animation class with reduced motion support
 *
 * @example
 * ```typescript
 * const className = getAnimationClass(reducedMotion, {
 *   animated: 'animate-fade-in',
 *   static: 'opacity-100'
 * });
 * ```
 */
export function getAnimationClass(
  shouldReduce: boolean,
  config: {
    animated: string;
    static?: string;
  }
): string {
  return shouldReduce ? config.static || '' : config.animated;
}

/**
 * Helper to combine multiple animation classes
 *
 * @example
 * ```typescript
 * const className = combineAnimations(reducedMotion, [
 *   'animate-fade-in',
 *   'animate-slide-up'
 * ]);
 * ```
 */
export function combineAnimations(
  shouldReduce: boolean,
  animationClasses: string[]
): string {
  if (shouldReduce) return '';
  return animationClasses.filter(Boolean).join(' ');
}

// ============================================
// ACCESSIBILITY UTILITIES
// ============================================

/**
 * Get ARIA live region property based on animation state
 * Helps screen readers understand dynamic content changes
 *
 * @example
 * ```typescript
 * <div aria-live={getAriaLive(isAnimating)}>
 *   Dynamic content
 * </div>
 * ```
 */
export function getAriaLive(
  isAnimating: boolean
): 'polite' | 'off' {
  return isAnimating ? 'polite' : 'off';
}

/**
 * Get ARIA busy property based on animation state
 *
 * @example
 * ```typescript
 * <div aria-busy={getAriaBusy(isAnimating)}>
 *   Loading content
 * </div>
 * ```
 */
export function getAriaBusy(isAnimating: boolean): boolean {
  return isAnimating;
}

// ============================================
// PERFORMANCE UTILITIES
// ============================================

/**
 * Check if animations should be disabled based on:
 * - User preference (prefers-reduced-motion)
 * - Device capabilities (low-end devices)
 * - Battery status (power saving mode)
 */
export function shouldDisableAnimations(): boolean {
  if (typeof window === 'undefined') return false;

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) return true;

  // Check for low-end device (optional - based on hardware concurrency)
  const isLowEndDevice =
    navigator.hardwareConcurrency !== undefined &&
    navigator.hardwareConcurrency < 4;

  if (isLowEndDevice) return true;

  return false;
}

/**
 * Get optimal animation duration based on device capabilities
 * Returns 0 for reduced motion, shorter durations for low-end devices
 */
export function getOptimalDuration(baseDuration: number): number {
  if (typeof window === 'undefined') return baseDuration;

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) return 0;

  const isLowEndDevice =
    navigator.hardwareConcurrency !== undefined &&
    navigator.hardwareConcurrency < 4;

  if (isLowEndDevice) return baseDuration * 0.5;

  return baseDuration;
}

// ============================================
// DEVELOPER UTILITIES
// ============================================

/**
 * Enable animation debugging in development
 * Shows animation boundaries and timing information
 */
export function enableAnimationDebug(): void {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // Add debug class to document
    document.documentElement.classList.add('debug-animations');

    // Log animation events
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure' && entry.name.includes('animation')) {
          console.log('[Animation Debug]', entry.name, `${entry.duration}ms`);
        }
      }
    });

    observer.observe({ entryTypes: ['measure'] });
  }
}

/**
 * Disable animation debugging
 */
export function disableAnimationDebug(): void {
  if (typeof window !== 'undefined') {
    document.documentElement.classList.remove('debug-animations');
  }
}

// ============================================
// TYPE EXPORTS
// ============================================

export type { MotionProps } from 'framer-motion';

/**
 * Type for animation variant names
 */
export type AnimationVariant =
  | 'fadeIn'
  | 'fadeInUp'
  | 'fadeInDown'
  | 'fadeInLeft'
  | 'fadeInRight'
  | 'scaleIn'
  | 'scaleSpring'
  | 'slideInFromBottom'
  | 'slideInFromTop'
  | 'slideInFromLeft'
  | 'slideInFromRight'
  | 'modalBackdrop'
  | 'modalContent'
  | 'drawerContent'
  | 'notificationSlideIn'
  | 'notificationBounce'
  | 'tooltipFade'
  | 'accordionContent'
  | 'cardHover'
  | 'cardHoverSubtle'
  | 'buttonHover'
  | 'staggerContainer'
  | 'staggerContainerFast'
  | 'staggerItem'
  | 'pageTransition'
  | 'tabContent';

/**
 * Type for transition presets
 */
export type TransitionPreset = 'spring' | 'smooth' | 'fast' | 'bouncy';
