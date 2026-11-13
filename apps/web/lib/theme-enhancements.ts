/**
 * Theme Enhancement Utilities
 *
 * Provides helper functions for gradients, animations, and visual effects
 * to enhance the UI with modern design patterns.
 */

import { theme } from './theme';

// CSS Properties type (compatible with React.CSSProperties)
type CSSProperties = Record<string, string | number | undefined>;

/**
 * Get a gradient by name
 */
export function getGradient(name: keyof typeof theme.gradients): string {
  return theme.gradients[name];
}

/**
 * Get card variant with gradient
 */
export function getGradientCardStyle(
  variant: 'primary' | 'success' | 'warning' | 'info' | 'subtle' = 'subtle'
): CSSProperties {
  const gradientMap = {
    primary: theme.gradients.cardPrimary,
    success: theme.gradients.cardSuccess,
    warning: theme.gradients.cardWarning,
    info: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(96, 165, 250, 0.05) 100%)',
    subtle: theme.gradients.backgroundSubtle,
  };

  return {
    background: gradientMap[variant],
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.shadows.sm,
  };
}

/**
 * Get icon container style with gradient background
 */
export function getIconContainerStyle(
  color: string = theme.colors.primary,
  size: number = 48
): CSSProperties {
  return {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: theme.borderRadius.lg,
    background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
    border: `1px solid ${color}30`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

/**
 * Get hover state styles for interactive cards
 */
export function getCardHoverStyle(): CSSProperties {
  return {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows.xl,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  };
}

/**
 * Create keyframes for gradient animation (to be used in CSS)
 */
const gradientKeyframes = `
  @keyframes gradientShift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`;

/**
 * Get fade-in animation style
 */
export function getFadeInStyle(delay: number = 0): CSSProperties {
  return {
    animation: `fadeIn ${theme.animation.duration.slow} ${theme.animation.easing.easeOut} ${delay}ms both`,
  };
}

/**
 * Additional keyframes for animations (moved to animations-enhanced.css)
 * This is kept for backwards compatibility
 */
const animationKeyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;
