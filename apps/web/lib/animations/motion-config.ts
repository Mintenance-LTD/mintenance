/**
 * Motion Configuration with Reduced Motion Support
 * European Accessibility Act Compliance (2025)
 * WCAG 2.1 Level AA (Guideline 2.3.3)
 *
 * Provides animation variants that respect user's motion preferences.
 * All animations are disabled when user prefers reduced motion.
 *
 * @example
 * ```typescript
 * const reducedMotion = useReducedMotion();
 * const variants = fadeInVariants(reducedMotion);
 *
 * <motion.div
 *   variants={variants}
 *   initial="initial"
 *   animate="animate"
 *   exit="exit"
 * >
 *   Content
 * </motion.div>
 * ```
 */

import { Variants, Transition } from 'framer-motion';

// ============================================
// HELPER TYPES
// ============================================

type MotionVariantConfig = {
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
  exit?: Record<string, unknown>;
};

// ============================================
// CORE FACTORY FUNCTION
// ============================================

/**
 * Creates a motion variant that respects reduced motion preference
 * Returns static variant (no animation) if shouldReduce is true
 */
function createMotionVariant(
  config: MotionVariantConfig,
  shouldReduce: boolean
): Variants {
  if (shouldReduce) {
    // Return final state only - no animation
    return {
      initial: config.animate,
      animate: config.animate,
      exit: config.animate,
    };
  }

  return {
    initial: config.initial,
    animate: config.animate,
    exit: config.exit || config.initial,
  };
}

/**
 * Creates a transition that respects reduced motion preference
 */
export function createTransition(
  transition: Transition,
  shouldReduce: boolean
): Transition {
  if (shouldReduce) {
    return { duration: 0 };
  }
  return transition;
}

// ============================================
// FADE ANIMATIONS
// ============================================

/**
 * Simple fade in animation
 * Opacity: 0 -> 1
 */
export const fadeInVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    shouldReduce
  );

/**
 * Fade in with upward movement
 * Opacity: 0 -> 1, Y: 20px -> 0
 */
export const fadeInUpVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    shouldReduce
  );

/**
 * Fade in with downward movement
 * Opacity: 0 -> 1, Y: -20px -> 0
 */
export const fadeInDownVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
    shouldReduce
  );

/**
 * Fade in from left
 * Opacity: 0 -> 1, X: -30px -> 0
 */
export const fadeInLeftVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0, x: -30 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -30 },
    },
    shouldReduce
  );

/**
 * Fade in from right
 * Opacity: 0 -> 1, X: 30px -> 0
 */
export const fadeInRightVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0, x: 30 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 30 },
    },
    shouldReduce
  );

// ============================================
// SCALE ANIMATIONS
// ============================================

/**
 * Scale in animation
 * Opacity: 0 -> 1, Scale: 0.8 -> 1
 */
export const scaleInVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.8 },
    },
    shouldReduce
  );

/**
 * Scale in with spring animation
 * Opacity: 0 -> 1, Scale: 0.9 -> 1
 */
export const scaleSpringVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
    },
    shouldReduce
  );

// ============================================
// SLIDE ANIMATIONS
// ============================================

/**
 * Slide in from bottom
 * Y: 100% -> 0, Opacity: 0 -> 1
 */
export const slideInFromBottomVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { y: '100%', opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: '100%', opacity: 0 },
    },
    shouldReduce
  );

/**
 * Slide in from top
 * Y: -100% -> 0, Opacity: 0 -> 1
 */
export const slideInFromTopVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { y: '-100%', opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: '-100%', opacity: 0 },
    },
    shouldReduce
  );

/**
 * Slide in from left
 * X: -100% -> 0, Opacity: 0 -> 1
 */
export const slideInFromLeftVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { x: '-100%', opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: '-100%', opacity: 0 },
    },
    shouldReduce
  );

/**
 * Slide in from right
 * X: 100% -> 0, Opacity: 0 -> 1
 */
export const slideInFromRightVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { x: '100%', opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: '100%', opacity: 0 },
    },
    shouldReduce
  );

// ============================================
// MODAL / DIALOG ANIMATIONS
// ============================================

/**
 * Modal backdrop fade
 * Opacity: 0 -> 1
 */
export const modalBackdropVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    shouldReduce
  );

/**
 * Modal content animation
 * Opacity: 0 -> 1, Scale: 0.9 -> 1, Y: 20px -> 0
 */
export const modalContentVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0, scale: 0.9, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.9, y: 20 },
    },
    shouldReduce
  );

/**
 * Drawer content animation (slides from right)
 * X: 100% -> 0
 */
export const drawerContentVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
    },
    shouldReduce
  );

// ============================================
// NOTIFICATION / TOAST ANIMATIONS
// ============================================

/**
 * Notification slide in from right
 * X: 400px -> 0, Opacity: 0 -> 1
 */
export const notificationSlideInVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { x: 400, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: 400, opacity: 0 },
    },
    shouldReduce
  );

/**
 * Notification bounce from top
 * Y: -100px -> 0, Opacity: 0 -> 1
 */
export const notificationBounceVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { y: -100, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: -100, opacity: 0 },
    },
    shouldReduce
  );

// ============================================
// TOOLTIP / POPOVER ANIMATIONS
// ============================================

/**
 * Tooltip fade animation
 * Opacity: 0 -> 1, Scale: 0.95 -> 1, Y: 5px -> 0
 */
export const tooltipFadeVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0, scale: 0.95, y: 5 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 5 },
    },
    shouldReduce
  );

// ============================================
// ACCORDION / COLLAPSE ANIMATIONS
// ============================================

/**
 * Accordion content animation
 * Height: 0 -> auto, Opacity: 0 -> 1
 */
export const accordionContentVariants = (shouldReduce: boolean): Variants => {
  if (shouldReduce) {
    return {
      collapsed: { height: 'auto', opacity: 1 },
      expanded: { height: 'auto', opacity: 1 },
    };
  }

  return {
    collapsed: {
      height: 0,
      opacity: 0,
    },
    expanded: {
      height: 'auto',
      opacity: 1,
    },
  };
};

// ============================================
// CARD HOVER ANIMATIONS
// ============================================

/**
 * Card hover animation
 * Scale: 1 -> 1.02, Y: 0 -> -4px, shadow changes
 */
export const cardHoverVariants = (shouldReduce: boolean): Variants => {
  const restShadow =
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
  const hoverShadow =
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';

  if (shouldReduce) {
    return {
      rest: { scale: 1, y: 0, boxShadow: restShadow },
      hover: { scale: 1, y: 0, boxShadow: restShadow },
      tap: { scale: 1, y: 0, boxShadow: restShadow },
    };
  }

  return {
    rest: { scale: 1, y: 0, boxShadow: restShadow },
    hover: { scale: 1.02, y: -4, boxShadow: hoverShadow },
    tap: { scale: 0.98 },
  };
};

/**
 * Subtle card hover animation
 * Y: 0 -> -2px, shadow changes
 */
export const cardHoverSubtleVariants = (shouldReduce: boolean): Variants => {
  const restShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
  const hoverShadow =
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';

  if (shouldReduce) {
    return {
      rest: { y: 0, boxShadow: restShadow },
      hover: { y: 0, boxShadow: restShadow },
    };
  }

  return {
    rest: { y: 0, boxShadow: restShadow },
    hover: { y: -2, boxShadow: hoverShadow },
  };
};

// ============================================
// BUTTON ANIMATIONS
// ============================================

/**
 * Button hover animation
 * Scale: 1 -> 1.02, Y: 0 -> -1px
 */
export const buttonHoverVariants = (shouldReduce: boolean): Variants => {
  if (shouldReduce) {
    return {
      rest: { scale: 1, y: 0 },
      hover: { scale: 1, y: 0 },
      tap: { scale: 1, y: 0 },
    };
  }

  return {
    rest: { scale: 1, y: 0 },
    hover: { scale: 1.02, y: -1 },
    tap: { scale: 0.98 },
  };
};

// ============================================
// STAGGER ANIMATIONS
// ============================================

/**
 * Stagger container for lists
 * Delays children animations by 0.1s each
 */
export const staggerContainerVariants = (shouldReduce: boolean): Variants => {
  if (shouldReduce) {
    return {
      initial: {},
      animate: {},
    };
  }

  return {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };
};

/**
 * Fast stagger container
 * Delays children animations by 0.05s each
 */
export const staggerContainerFastVariants = (shouldReduce: boolean): Variants => {
  if (shouldReduce) {
    return {
      initial: {},
      animate: {},
    };
  }

  return {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0,
      },
    },
  };
};

/**
 * Stagger item animation
 * Opacity: 0 -> 1, Y: 20px -> 0
 */
export const staggerItemVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
    },
    shouldReduce
  );

// ============================================
// PAGE TRANSITIONS
// ============================================

/**
 * Page transition animation
 * Opacity: 0 -> 1, Y: 20px -> 0
 */
export const pageTransitionVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    shouldReduce
  );

// ============================================
// TAB ANIMATIONS
// ============================================

/**
 * Tab content transition
 * Opacity: 0 -> 1, X: -10px -> 0
 */
export const tabContentVariants = (shouldReduce: boolean): Variants =>
  createMotionVariant(
    {
      initial: { opacity: 0, x: -10 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 10 },
    },
    shouldReduce
  );

// ============================================
// PRESET TRANSITIONS
// ============================================

/**
 * Spring transition config
 */
export const springTransition = (shouldReduce: boolean): Transition =>
  createTransition(
    {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
    shouldReduce
  );

/**
 * Smooth transition config
 */
export const smoothTransition = (shouldReduce: boolean): Transition =>
  createTransition(
    {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
    shouldReduce
  );

/**
 * Fast transition config
 */
export const fastTransition = (shouldReduce: boolean): Transition =>
  createTransition(
    {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1],
    },
    shouldReduce
  );

/**
 * Bouncy transition config
 */
export const bouncyTransition = (shouldReduce: boolean): Transition =>
  createTransition(
    {
      type: 'spring',
      stiffness: 500,
      damping: 20,
    },
    shouldReduce
  );
