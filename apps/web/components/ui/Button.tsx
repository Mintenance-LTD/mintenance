import React from 'react';
import { theme } from '@/lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'ghost' | 'outline';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
  'aria-label'?: string;
  'data-testid'?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  iconOnly = false,
  type = 'button',
  style = {},
  'aria-label': ariaLabel,
  'data-testid': testId,
}) => {
  const variantStyles = theme.components.button[variant];

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: theme.typography.fontFamily.regular,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.lg,
    lineHeight: theme.typography.lineHeight.normal,
    border: '1px solid',
    borderRadius: iconOnly ? theme.borderRadius.full : (size === 'sm' ? theme.borderRadius.base : theme.borderRadius.xl),
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease-in-out',
    textDecoration: 'none',
    outline: 'none',
    position: 'relative' as const,

    // Size-specific styles
    minHeight: size === 'sm' ? theme.layout.minTouchTarget : theme.layout.buttonHeightLarge,
    paddingLeft: iconOnly ? '0px' : (size === 'sm' ? theme.spacing[2] : theme.spacing[4]),
    paddingRight: iconOnly ? '0px' : (size === 'sm' ? theme.spacing[2] : theme.spacing[4]),
    minWidth: iconOnly ? theme.layout.minTouchTarget : 'auto',

    // Variant-specific styles
    backgroundColor: variantStyles.backgroundColor,
    color: variantStyles.color,
    borderColor: variantStyles.borderColor,

    // Full width
    width: fullWidth ? '100%' : 'auto',

    // Shadow for elevated buttons
    boxShadow: variantStyles.backgroundColor !== 'transparent' ? theme.shadows.base : 'none',
  };

  const disabledStyles = {
    backgroundColor: theme.colors.textTertiary,
    color: theme.colors.white,
    borderColor: theme.colors.textTertiary,
    boxShadow: 'none',
    opacity: 0.6,
  };

  const hoverStyles = !disabled && !loading ? {
    transform: 'translateY(-1px)',
    boxShadow: variantStyles.backgroundColor !== 'transparent' ? theme.shadows.lg : 'none',
  } : {};

  const activeStyles = {
    transform: 'translateY(0)',
    boxShadow: variantStyles.backgroundColor !== 'transparent' ? theme.shadows.sm : 'none',
  };

  const linkStyles = variant === 'tertiary' ? {
    textDecoration: 'underline',
    fontWeight: theme.typography.fontWeight.medium,
  } : {};

  const finalStyles = {
    ...baseStyles,
    ...(disabled || loading ? disabledStyles : {}),
    ...linkStyles,
    ...style,
  };

  const handleClick = (e?: React.MouseEvent) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || loading}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-disabled={disabled || loading}
      data-testid={testId}
      className={`button ${className}`}
      style={finalStyles}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, {
            transform: 'translateY(0)',
            boxShadow: variantStyles.backgroundColor !== 'transparent' ? theme.shadows.base : 'none',
          });
        }
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, activeStyles);
        }
      }}
      onMouseUp={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
    >
      {loading ? (
        <div
          style={{
            width: '20px',
            height: '20px',
            border: `2px solid ${theme.colors.textInverse}`,
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      ) : iconOnly ? (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: icon ? theme.spacing[1] : '0'
        }}>
          {icon && iconPosition === 'left' && (
            <div style={{ marginRight: theme.spacing[1] }}>
              {icon}
            </div>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <div style={{ marginLeft: theme.spacing[1] }}>
              {icon}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .button:focus-visible {
          outline: 2px solid ${theme.colors.borderFocus};
          outline-offset: 2px;
        }
      `}</style>
    </button>
  );
};

export default Button;