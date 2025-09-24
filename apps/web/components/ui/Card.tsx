import React from 'react';
import { theme } from '@/lib/theme';

type CardVariant = 'default' | 'elevated' | 'outlined';

export interface CardProps {
  children?: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  hover?: boolean;
  'data-testid'?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  style = {},
  onClick,
  hover = false,
  'data-testid': testId,
}) => {
  const variantStyles = theme.components.card[variant];

  const baseStyles: React.CSSProperties = {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.xl,
    backgroundColor: variantStyles.backgroundColor,
    borderColor: variantStyles.borderColor,
    borderWidth: variantStyles.borderWidth,
    borderStyle: 'solid',
    transition: 'all 0.2s ease-in-out',
    position: 'relative',

    // Add shadow for elevated cards
    boxShadow: variant === 'elevated' ? theme.shadows.lg :
               variant === 'default' ? theme.shadows.sm : 'none',
  };

  const hoverStyles: React.CSSProperties = hover || onClick ? {
    cursor: 'pointer',
    transform: 'translateY(-2px)',
    boxShadow: variant === 'elevated' ? theme.shadows.xl : theme.shadows.lg,
  } : {};

  const activeStyles: React.CSSProperties = {
    transform: 'translateY(0)',
    boxShadow: variant === 'elevated' ? theme.shadows.lg : theme.shadows.sm,
  };

  const finalStyles: React.CSSProperties = {
    ...baseStyles,
    ...style,
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`card ${className}`}
      style={finalStyles}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      data-testid={testId}
      onMouseEnter={(e) => {
        if (hover || onClick) {
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
      onMouseLeave={(e) => {
        if (hover || onClick) {
          Object.assign(e.currentTarget.style, {
            transform: 'translateY(0)',
            boxShadow: variant === 'elevated' ? theme.shadows.lg :
                       variant === 'default' ? theme.shadows.sm : 'none',
          });
        }
      }}
      onMouseDown={(e) => {
        if (hover || onClick) {
          Object.assign(e.currentTarget.style, activeStyles);
        }
      }}
      onMouseUp={(e) => {
        if (hover || onClick) {
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
    >
      {children}

      <style jsx>{`
        .card:focus-visible {
          outline: 2px solid ${theme.colors.borderFocus};
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default Card;