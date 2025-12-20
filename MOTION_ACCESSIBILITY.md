# Motion Accessibility Implementation

**Status:** ✅ Complete and Production-Ready
**Compliance:** WCAG 2.1 Level AA (Guideline 2.3.3) | European Accessibility Act 2025

## Overview

This platform fully supports the `prefers-reduced-motion` user preference, automatically disabling all animations when users have indicated they prefer reduced motion. This is a critical accessibility requirement under the European Accessibility Act (2025) and WCAG 2.1 Level AA standards.

## Implementation Summary

### 1. Global CSS Protection
**Location:** `apps/web/app/globals.css`

All CSS animations and transitions are automatically disabled when the user has `prefers-reduced-motion: reduce` enabled:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This provides a baseline protection that catches ALL animations, even if developers forget to manually handle reduced motion.

### 2. React Hooks

#### Web Hook
**Location:** `apps/web/hooks/useReducedMotion.ts`

```typescript
import { useReducedMotion } from '@/hooks/useReducedMotion';

function MyComponent() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={reducedMotion ? {} : fadeIn}
      animate={reducedMotion ? false : "animate"}
    >
      Content
    </motion.div>
  );
}
```

Features:
- SSR-safe (starts with `false`)
- Reactive (updates when user changes preference)
- Cross-browser compatible (supports legacy Safari)
- Additional helper hooks: `useMotionPreference()`, `useConditionalMotion()`

#### Mobile Hook
**Location:** `apps/mobile/src/hooks/useReducedMotion.ts`

```typescript
import { useReducedMotion } from '@/hooks/useReducedMotion';

function MyComponent() {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      style={{ opacity: reducedMotion ? 1 : fadeAnim }}
    >
      Content
    </Animated.View>
  );
}
```

Features:
- Uses React Native's `AccessibilityInfo` API
- Supports both iOS and Android
- Reactive to system preference changes
- Additional helpers: `useMotionPreference()`, `useAccessibilityState()`

### 3. Animation Library

#### Motion Config (Recommended)
**Location:** `apps/web/lib/animations/motion-config.ts`

All animations are now factory functions that accept a `shouldReduce` parameter:

```typescript
import { fadeInVariants } from '@/lib/animations/motion-config';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function MyComponent() {
  const reducedMotion = useReducedMotion();
  const variants = fadeInVariants(reducedMotion);

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
    >
      Content
    </motion.div>
  );
}
```

Available variants:
- **Fade:** `fadeIn`, `fadeInUp`, `fadeInDown`, `fadeInLeft`, `fadeInRight`
- **Scale:** `scaleIn`, `scaleSpring`
- **Slide:** `slideInFromBottom`, `slideInFromTop`, `slideInFromLeft`, `slideInFromRight`
- **Modal:** `modalBackdrop`, `modalContent`, `drawerContent`
- **Notification:** `notificationSlideIn`, `notificationBounce`
- **UI:** `tooltipFade`, `accordionContent`, `cardHover`, `buttonHover`
- **List:** `staggerContainer`, `staggerContainerFast`, `staggerItem`
- **Page:** `pageTransition`, `tabContent`

#### Convenience Exports
**Location:** `apps/web/lib/animations/index.ts`

```typescript
import { motionVariants, useReducedMotion } from '@/lib/animations';

function MyComponent() {
  const reducedMotion = useReducedMotion();
  const variants = motionVariants.fadeIn(reducedMotion);

  return (
    <motion.div variants={variants} initial="initial" animate="animate">
      Content
    </motion.div>
  );
}
```

CSS Animation Helpers:

```typescript
import { withMotion, getAnimationClass } from '@/lib/animations';

function MyComponent() {
  const reducedMotion = useReducedMotion();

  return (
    <div className={withMotion(reducedMotion, 'animate-fade-in')}>
      Content
    </div>
  );
}
```

### 4. CSS Animations
**Location:** `apps/web/styles/animations.css`

All CSS animation classes are automatically disabled via the global media query in `globals.css`. No additional work needed.

Classes:
- `.float-animation`
- `.pulse-animation`
- `.animate-fade-in`
- `.animate-fade-in-up`
- `.animate-slide-in-right`
- `.animate-slide-down`
- `.animate-shimmer`
- `.animate-pulse-slow`

## Usage Guide

### Basic Pattern (Recommended)

```typescript
'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fadeInUpVariants } from '@/lib/animations/motion-config';

export function MyComponent() {
  const reducedMotion = useReducedMotion();
  const variants = fadeInUpVariants(reducedMotion);

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <h1>My Content</h1>
    </motion.div>
  );
}
```

### Advanced Pattern

```typescript
'use client';

import { motion } from 'framer-motion';
import { useMotionPreference } from '@/hooks/useReducedMotion';
import { fadeInUpVariants, smoothTransition } from '@/lib/animations/motion-config';

export function MyComponent() {
  const { prefersReducedMotion, getTransition } = useMotionPreference();

  const variants = fadeInUpVariants(prefersReducedMotion);
  const transition = getTransition(smoothTransition(prefersReducedMotion));

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      transition={transition}
    >
      <h1>My Content</h1>
    </motion.div>
  );
}
```

### CSS Animations

```typescript
'use client';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { withMotion } from '@/lib/animations';

export function MyComponent() {
  const reducedMotion = useReducedMotion();

  return (
    <div className={withMotion(reducedMotion, 'animate-fade-in')}>
      <h1>My Content</h1>
    </div>
  );
}
```

### Hover Animations

```typescript
'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cardHoverVariants } from '@/lib/animations/motion-config';

export function MyCard() {
  const reducedMotion = useReducedMotion();
  const hoverVariants = cardHoverVariants(reducedMotion);

  return (
    <motion.div
      variants={hoverVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      className="p-6 bg-white rounded-lg shadow-md cursor-pointer"
    >
      <h2>Hover over me!</h2>
    </motion.div>
  );
}
```

### React Native (Mobile)

```typescript
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Animated } from 'react-native';

export function MyComponent() {
  const reducedMotion = useReducedMotion();
  const fadeAnim = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [reducedMotion, fadeAnim]);

  return (
    <Animated.View style={{ opacity: reducedMotion ? 1 : fadeAnim }}>
      <Text>My Content</Text>
    </Animated.View>
  );
}
```

## Testing

### Test Page
**Location:** `apps/web/app/test-animations/page.tsx`
**URL:** `/test-animations`

The test page provides:
- Live detection of system reduced motion preference
- Manual toggle to simulate reduced motion
- Demonstrations of all animation types
- Visual indicators of current state
- Testing instructions

### System-Level Testing

#### macOS
1. Open System Preferences
2. Go to Accessibility > Display
3. Enable "Reduce motion"
4. Reload the website
5. All animations should be disabled

#### Windows
1. Open Settings
2. Go to Ease of Access > Display
3. Enable "Show animations in Windows"
4. Reload the website
5. All animations should be disabled

#### iOS
1. Open Settings
2. Go to Accessibility > Motion
3. Enable "Reduce Motion"
4. Reload the app
5. All animations should be disabled

#### Android
1. Open Settings
2. Go to Accessibility
3. Enable "Remove animations"
4. Reload the app
5. All animations should be disabled

### Developer Testing

```typescript
// Simulate reduced motion in DevTools
// Chrome/Edge: Open DevTools > Rendering > Emulate CSS media feature prefers-reduced-motion
// Firefox: Open DevTools > Responsive Design Mode > Accessibility > prefers-reduced-motion
```

## Migration Guide

### For Existing Framer Motion Code

**Before:**
```typescript
<motion.div
  variants={fadeIn}
  initial="initial"
  animate="animate"
>
  Content
</motion.div>
```

**After:**
```typescript
const reducedMotion = useReducedMotion();
const variants = fadeInVariants(reducedMotion);

<motion.div
  variants={variants}
  initial="initial"
  animate="animate"
>
  Content
</motion.div>
```

### For CSS Animations

**Before:**
```typescript
<div className="animate-fade-in">
  Content
</div>
```

**After:**
```typescript
const reducedMotion = useReducedMotion();

<div className={withMotion(reducedMotion, 'animate-fade-in')}>
  Content
</div>
```

### For Custom Animations

**Before:**
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

**After:**
```typescript
const reducedMotion = useReducedMotion();

<motion.div
  initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: reducedMotion ? 0 : 0.3 }}
>
  Content
</motion.div>
```

## Best Practices

### 1. Always Use the Hook
Never hardcode animations without checking reduced motion preference:

```typescript
// ❌ Bad
<motion.div variants={fadeIn} animate="animate" />

// ✅ Good
const reducedMotion = useReducedMotion();
const variants = fadeInVariants(reducedMotion);
<motion.div variants={variants} animate="animate" />
```

### 2. Preserve Functionality
Ensure that disabling animations doesn't break functionality:

```typescript
// ✅ Content still appears, just without animation
const reducedMotion = useReducedMotion();
const variants = reducedMotion
  ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
  : { initial: { opacity: 0 }, animate: { opacity: 1 } };
```

### 3. Test Both States
Always test your component with animations ON and OFF:

```typescript
// Use the test page or manual toggle
const [testMode, setTestMode] = useState(false);
const reducedMotion = testMode || useReducedMotion();
```

### 4. Consider Performance
Reduced motion can also improve performance on low-end devices:

```typescript
import { shouldDisableAnimations } from '@/lib/animations';

const disableAnimations = shouldDisableAnimations(); // Checks motion + device capabilities
```

### 5. Provide Alternatives
For important feedback, provide non-motion alternatives:

```typescript
const reducedMotion = useReducedMotion();

if (reducedMotion) {
  // Use instant state changes, color changes, or icons
  return <div className="bg-green-500">Success!</div>;
} else {
  // Use animations
  return <motion.div animate={{ scale: [1, 1.2, 1] }}>Success!</motion.div>;
}
```

## Compliance Checklist

- ✅ Global CSS media query for `prefers-reduced-motion`
- ✅ React hook for detecting user preference (Web)
- ✅ React hook for detecting user preference (Mobile)
- ✅ Animation library with reduced motion support
- ✅ All Framer Motion variants support reduced motion
- ✅ CSS animation classes respect reduced motion
- ✅ Hover effects respect reduced motion
- ✅ Modal/Dialog animations respect reduced motion
- ✅ Page transitions respect reduced motion
- ✅ List stagger animations respect reduced motion
- ✅ Test page for verification
- ✅ Documentation and usage guide
- ✅ Migration guide for existing code

## Standards Met

### WCAG 2.1 Level AA
- **Guideline 2.3.3:** Animation from Interactions
- **Success Criterion:** Motion animation triggered by interaction can be disabled, unless the animation is essential to the functionality or the information being conveyed.

### European Accessibility Act (2025)
- **Article 4:** Accessibility requirements for products and services
- **Requirement:** User interfaces must provide options to minimize non-essential motion

## Support

### Browser Support
- ✅ Chrome/Edge 74+
- ✅ Firefox 63+
- ✅ Safari 10.1+
- ✅ iOS Safari 10.3+
- ✅ Chrome Android 74+

### Mobile Support
- ✅ iOS 7.0+ (via AccessibilityInfo)
- ✅ Android 4.1+ (via AccessibilityInfo)

## Resources

- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [European Accessibility Act](https://ec.europa.eu/social/main.jsp?catId=1202)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [React Native AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo)

## Maintenance

This implementation is production-ready and requires no ongoing maintenance. However:

1. **New Animations:** When adding new animations, always use the factory functions from `motion-config.ts`
2. **Testing:** Run `/test-animations` page periodically to ensure compliance
3. **Updates:** Keep Framer Motion and React Native updated for latest accessibility features
4. **Monitoring:** Consider tracking how many users prefer reduced motion (analytics)

## Contact

For questions or issues with motion accessibility:
- Review this documentation
- Check the test page at `/test-animations`
- Review code examples in `apps/web/lib/animations/`
