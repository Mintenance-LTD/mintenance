'use client';

import React from 'react';
import { TouchableButton } from './Touchable';
import { theme } from '@/lib/theme';

interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  'data-testid'?: string;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className = '',
  style = {},
  'aria-label': ariaLabel,
  'data-testid': testId,
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
      minHeight: '44px', // Minimum touch target
    },
    md: {
      padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
      fontSize: theme.typography.fontSize.base,
      minHeight: '48px',
    },
    lg: {
      padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
      fontSize: theme.typography.fontSize.lg,
      minHeight: '52px',
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
    opacity: disabled || loading ? 0.6 : 1,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    position: 'relative' as const,
  };

  const loadingSpinner = loading ? (
    <div
      style={{
        width: '16px',
        height: '16px',
        border: `2px solid ${variant === 'outline' || variant === 'ghost' ? theme.colors.primary : 'white'}`,
        borderTop: '2px solid transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  ) : null;

  return (
    <TouchableButton
      onPress={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      className={className}
      style={{
        ...buttonStyles,
        ...style,
      }}
      aria-label={ariaLabel}
      data-testid={testId}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      icon={loading ? loadingSpinner : icon}
      iconPosition={iconPosition}
      hapticFeedback={true}
      rippleEffect={true}
    >
      {loading ? null : children}
    </TouchableButton>
  );
};

export default TouchButton;
