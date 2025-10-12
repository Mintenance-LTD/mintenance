'use client';

import React, { useState, useRef, useEffect } from 'react';
import { theme } from '@/lib/theme';

interface TouchableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  activeOpacity?: number;
  hapticFeedback?: boolean;
  rippleEffect?: boolean;
  longPressDelay?: number;
  'aria-label'?: string;
  'data-testid'?: string;
}

export const Touchable: React.FC<TouchableProps> = ({
  children,
  onPress,
  onLongPress,
  disabled = false,
  className = '',
  style = {},
  activeOpacity = 0.7,
  hapticFeedback = true,
  rippleEffect = true,
  longPressDelay = 500,
  'aria-label': ariaLabel,
  'data-testid': testId,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  const triggerHapticFeedback = () => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const createRipple = (event: React.MouseEvent | React.TouchEvent) => {
    if (!rippleEffect || !elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const x = 'touches' in event ? event.touches[0].clientX - rect.left : event.clientX - rect.left;
    const y = 'touches' in event ? event.touches[0].clientY - rect.top : event.clientY - rect.top;

    const newRipple = {
      id: rippleIdRef.current++,
      x,
      y,
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);
  };

  const handlePressStart = (event: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;

    setIsPressed(true);
    createRipple(event);

    if (onLongPress) {
      const timer = setTimeout(() => {
        triggerHapticFeedback();
        onLongPress();
        setIsPressed(false);
      }, longPressDelay);
      setLongPressTimer(timer);
    }
  };

  const handlePressEnd = () => {
    if (disabled) return;

    setIsPressed(false);

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (onPress) {
      triggerHapticFeedback();
      onPress();
    }
  };

  const handlePressCancel = () => {
    setIsPressed(false);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const containerStyles = {
    position: 'relative' as const,
    display: 'inline-block',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'opacity 0.2s ease-in-out',
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    ...style,
  };

  const overlayStyles = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    opacity: isPressed ? 1 : 0,
    transition: 'opacity 0.1s ease-in-out',
    borderRadius: 'inherit',
    pointerEvents: 'none' as const,
  };

  const rippleStyles = {
    position: 'absolute' as const,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    transform: 'scale(0)',
    animation: 'ripple 0.6s linear',
    pointerEvents: 'none' as const,
  };

  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  return (
    <div
      ref={elementRef}
      className={`touchable ${className}`}
      style={containerStyles}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressCancel}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressCancel}
      aria-label={ariaLabel}
      data-testid={testId}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePressEnd();
        }
      }}
    >
      {children}
      
      {/* Press overlay */}
      <div style={overlayStyles} />
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          style={{
            ...rippleStyles,
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        .touchable:focus-visible {
          outline: 2px solid ${theme.colors.borderFocus};
          outline-offset: 2px;
        }
        
        .touchable:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
};

// Touchable button variant
interface TouchableButtonProps extends TouchableProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const TouchableButton: React.FC<TouchableButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  ...props
}) => {
  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: 'white',
      border: `1px solid ${theme.colors.primary}`,
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
      color: 'white',
      border: `1px solid ${theme.colors.secondary}`,
    },
    outline: {
      backgroundColor: 'transparent',
      color: theme.colors.primary,
      border: `1px solid ${theme.colors.primary}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.textPrimary,
      border: '1px solid transparent',
    },
  };

  const sizeStyles = {
    sm: {
      padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
      fontSize: theme.typography.fontSize.sm,
      minHeight: '32px',
    },
    md: {
      padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
      fontSize: theme.typography.fontSize.base,
      minHeight: '40px',
    },
    lg: {
      padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
      fontSize: theme.typography.fontSize.lg,
      minHeight: '48px',
    },
  };

  const buttonStyles = {
    ...variantStyles[variant],
    ...sizeStyles[size],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    borderRadius: theme.borderRadius.base,
    fontWeight: theme.typography.fontWeight.semibold,
    textDecoration: 'none',
    width: fullWidth ? '100%' : 'auto',
    minWidth: '44px', // Minimum touch target
    transition: 'all 0.2s ease-in-out',
  };

  return (
    <Touchable
      {...props}
      style={{
        ...buttonStyles,
        ...props.style,
      }}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </Touchable>
  );
};

// Touchable card variant
interface TouchableCardProps extends TouchableProps {
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  padding?: 'sm' | 'md' | 'lg';
}

export const TouchableCard: React.FC<TouchableCardProps> = ({
  children,
  elevation = 'sm',
  padding = 'md',
  ...props
}) => {
  const elevationStyles = {
    none: { boxShadow: 'none' },
    sm: { boxShadow: theme.shadows.sm },
    md: { boxShadow: theme.shadows.base },
    lg: { boxShadow: theme.shadows.lg },
  };

  const paddingStyles = {
    sm: { padding: theme.spacing[3] },
    md: { padding: theme.spacing[4] },
    lg: { padding: theme.spacing[6] },
  };

  const cardStyles = {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border}`,
    ...elevationStyles[elevation],
    ...paddingStyles[padding],
    transition: 'all 0.2s ease-in-out',
  };

  return (
    <Touchable
      {...props}
      style={{
        ...cardStyles,
        ...props.style,
      }}
    >
      {children}
    </Touchable>
  );
};

export default Touchable;
