// Framer Motion Animation Variants
// Barrel re-export of all variant modules for backward compatibility.
//
// Prefer importing from the specific submodule, e.g.:
//   import { fadeIn } from '@/lib/animations/variants/page';
// but `import { fadeIn } from '@/lib/animations/variants'` continues to work.

export * from './variants/page';
export * from './variants/item';
export * from './variants/overlay';
export * from './variants/ui';

// ============================================
// SHARED TRANSITION CONFIGS
// ============================================
// NOTE: Legacy transition configs have been moved to motion-config.ts
// with reduced motion support. Import from @/lib/animations instead.
//
// The new versions are functions that accept a shouldReduce boolean:
// - springTransition(shouldReduce)
// - smoothTransition(shouldReduce)
// - fastTransition(shouldReduce)
// - bouncyTransition(shouldReduce)
//
// For backward compatibility, use motionTransitions object from index.ts
