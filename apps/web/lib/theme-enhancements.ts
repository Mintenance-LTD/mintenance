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
 * Create a custom gradient
 */
export function createGradient(
  startColor: string,
  endColor: string,
  direction: 'horizontal' | 'vertical' | 'diagonal' = 'diagonal'
): string {
  const angle = direction === 'horizontal' ? '90deg' : direction === 'vertical' ? '180deg' : '135deg';
  return `linear-gradient(${angle}, ${startColor} 0%, ${endColor} 100%)`;
}

/**
 * Get enhanced shadow by name
 */
export function getShadow(name: keyof typeof theme.shadows): string {
  return theme.shadows[name];
}

/**
 * Create a hover effect style object
 */
export function getHoverEffect(type: 'lift' | 'scale' | 'glow' = 'lift'): CSSProperties {
  switch (type) {
    case 'lift':
      return {
        transform: 'translateY(-2px)',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: theme.shadows.hover,
      };
    case 'scale':
      return {
        transform: 'scale(1.02)',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      };
    case 'glow':
      return {
        boxShadow: `0 0 20px rgba(15, 23, 42, 0.15), ${theme.shadows.lg}`,
        transition: 'box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      };
    default:
      return {};
  }
}

/**
 * Get glassmorphism effect styles
 */
export function getGlassEffect(opacity: number = 0.7): CSSProperties {
  return {
    background: `rgba(255, 255, 255, ${opacity})`,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
  };
}

/**
 * Create animated gradient background
 */
export function getAnimatedGradient(
  colors: string[],
  duration: number = 5
): CSSProperties {
  const gradientStops = colors.map((color, index) => {
    const percentage = (index / (colors.length - 1)) * 100;
    return `${color} ${percentage}%`;
  }).join(', ');

  return {
    background: `linear-gradient(135deg, ${gradientStops})`,
    backgroundSize: '200% 200%',
    animation: `gradientShift ${duration}s ease infinite`,
  };
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
 * Get metric card enhanced style
 */
export function getMetricCardStyle(
  hasGradient: boolean = false,
  gradientVariant: 'primary' | 'success' | 'warning' = 'primary'
): CSSProperties {
  const baseStyle: CSSProperties = {
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadows.sm,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  if (hasGradient) {
    const gradientMap = {
      primary: theme.gradients.cardPrimary,
      success: theme.gradients.cardSuccess,
      warning: theme.gradients.cardWarning,
    };
    return {
      ...baseStyle,
      background: gradientMap[gradientVariant],
      boxShadow: theme.shadows.md,
    };
  }

  return {
    ...baseStyle,
    backgroundColor: theme.colors.surface,
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
 * Get transition style for smooth animations
 */
export function getTransitionStyle(properties: string[] = ['all']): CSSProperties {
  return {
    transition: `${properties.join(', ')} ${theme.animation.duration.normal} ${theme.animation.easing.smooth}`,
  };
}

/**
 * Create keyframes for gradient animation (to be used in CSS)
 */
export const gradientKeyframes = `
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
 * Get slide-up animation style
 */
export function getSlideUpStyle(delay: number = 0): CSSProperties {
  return {
    animation: `slideUp ${theme.animation.duration.slow} ${theme.animation.easing.easeOut} ${delay}ms both`,
  };
}

/**
 * Get enhanced button styles with ripple effect
 */
export function getEnhancedButtonStyle(
  variant: 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' = 'primary'
): CSSProperties {
  const baseStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    borderRadius: theme.borderRadius.md,
    fontWeight: theme.typography.fontWeight.semibold,
    cursor: 'pointer',
  };

  const variantStyles: Record<typeof variant, CSSProperties> = {
    primary: {
      background: theme.gradients.primary,
      color: theme.colors.white,
      border: 'none',
      boxShadow: theme.shadows.sm,
    },
    secondary: {
      backgroundColor: 'transparent',
      color: theme.colors.primary,
      border: `2px solid ${theme.colors.primary}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.textPrimary,
      border: 'none',
    },
    success: {
      background: theme.gradients.success,
      color: theme.colors.white,
      border: 'none',
      boxShadow: theme.shadows.successGlow,
    },
    danger: {
      backgroundColor: theme.colors.error,
      color: theme.colors.white,
      border: 'none',
      boxShadow: theme.shadows.errorGlow,
    },
  };

  return {
    ...baseStyle,
    ...variantStyles[variant],
  };
}

/**
 * Get input with floating label style
 */
export function getFloatingInputStyle(
  focused: boolean = false,
  hasValue: boolean = false,
  hasError: boolean = false
): { container: CSSProperties; label: CSSProperties; input: CSSProperties } {
  return {
    container: {
      position: 'relative',
      marginBottom: theme.spacing[4],
    },
    label: {
      position: 'absolute',
      left: theme.spacing[3],
      top: focused || hasValue ? '-8px' : '12px',
      fontSize: focused || hasValue ? theme.typography.fontSize.xs : theme.typography.fontSize.base,
      color: hasError
        ? theme.colors.error
        : focused
          ? theme.colors.primary
          : theme.colors.textTertiary,
      backgroundColor: theme.colors.white,
      padding: '0 4px',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: 'none',
    },
    input: {
      width: '100%',
      padding: `${theme.spacing[3]} ${theme.spacing[3]}`,
      borderRadius: theme.borderRadius.md,
      border: `2px solid ${
        hasError
          ? theme.colors.error
          : focused
            ? theme.colors.primary
            : theme.colors.border
      }`,
      fontSize: theme.typography.fontSize.base,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      outline: 'none',
      boxShadow: focused && !hasError ? `0 0 0 3px ${theme.colors.primary}15` : 'none',
    },
  };
}

/**
 * Get badge/chip style
 */
export function getBadgeStyle(
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'neutral',
  withDot: boolean = false
): CSSProperties {
  const statusColors = {
    success: {
      bg: '#D1FAE5',
      text: '#065F46',
      border: '#10B981',
    },
    warning: {
      bg: '#FEF3C7',
      text: '#92400E',
      border: '#F59E0B',
    },
    error: {
      bg: '#FEE2E2',
      text: '#991B1B',
      border: '#EF4444',
    },
    info: {
      bg: '#DBEAFE',
      text: '#1E40AF',
      border: '#3B82F6',
    },
    neutral: {
      bg: theme.colors.backgroundSecondary,
      text: theme.colors.textSecondary,
      border: theme.colors.border,
    },
  };

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: withDot ? theme.spacing[1] : '0',
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    backgroundColor: statusColors[status].bg,
    color: statusColors[status].text,
    border: `1px solid ${statusColors[status].border}30`,
  };
}

/**
 * Get avatar style with status indicator
 */
export function getAvatarStyle(
  size: number = 48,
  status?: 'online' | 'offline' | 'busy'
): { avatar: CSSProperties; statusDot?: CSSProperties } {
  const statusColors = {
    online: theme.colors.success,
    offline: theme.colors.textQuaternary,
    busy: theme.colors.warning,
  };

  const result: { avatar: CSSProperties; statusDot?: CSSProperties } = {
    avatar: {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: theme.borderRadius.xl,
      objectFit: 'cover',
      border: `2px solid ${theme.colors.white}`,
      boxShadow: theme.shadows.sm,
    },
  };

  if (status) {
    result.statusDot = {
      position: 'absolute',
      bottom: '0',
      right: '0',
      width: `${size * 0.25}px`,
      height: `${size * 0.25}px`,
      borderRadius: '50%',
      backgroundColor: statusColors[status],
      border: `2px solid ${theme.colors.white}`,
      boxShadow: theme.shadows.sm,
    };
  }

  return result;
}

/**
 * Get tooltip style
 */
export function getTooltipStyle(): CSSProperties {
  return {
    position: 'absolute',
    padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
    backgroundColor: theme.colors.gray800,
    color: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    boxShadow: theme.shadows.lg,
    whiteSpace: 'nowrap',
    zIndex: 1000,
    pointerEvents: 'none',
  };
}

/**
 * Get empty state style
 */
export function getEmptyStateStyle(): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${theme.spacing[12]} ${theme.spacing[6]}`,
    textAlign: 'center',
    backgroundColor: theme.colors.backgroundSubtle,
    borderRadius: theme.borderRadius.xl,
    border: `2px dashed ${theme.colors.border}`,
  };
}

/**
 * Additional keyframes for animations (moved to animations-enhanced.css)
 * This is kept for backwards compatibility
 */
export const animationKeyframes = `
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

