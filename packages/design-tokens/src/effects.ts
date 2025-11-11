/**
 * Effects Tokens
 * 
 * Visual effects for web platform (glassmorphism, hover effects, etc.).
 * These are web-specific CSS effects.
 */

export const effects = {
  // Glassmorphism
  glass: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
  },
  // Hover lift
  lift: {
    transform: 'translateY(-2px)',
    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  // Scale on hover
  scale: {
    transform: 'scale(1.02)',
    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type Effects = typeof effects;

