'use client';

import React from 'react';
import { designSystem } from '@/lib/design-system';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary',
  size = 'md',
  className = '',
  style = {},
  loading = false,
  fullWidth = false,
  disabled,
  ...props
}: ButtonProps) {
  const variantStyle =
    variant === 'primary' ? designSystem.components.button.primary
    : variant === 'outline' ? {
        backgroundColor: 'transparent',
        color: designSystem.colors.primary,
        border: `2px solid ${designSystem.colors.primary}`,
        borderRadius: designSystem.borderRadius.base,
        padding: '0.75rem 1.5rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }
    : designSystem.components.button.secondary;

  const sizeStyle = size === 'sm' 
    ? { padding: '0.5rem 1rem', fontSize: '0.75rem' }
    : size === 'lg'
    ? { padding: '1rem 2rem', fontSize: '1rem' }
    : {};

  const disabledStyle = (disabled || loading) 
    ? { opacity: 0.5, cursor: 'not-allowed' }
    : {};

  const widthStyle = fullWidth ? { width: '100%' } : {};

  return (
    <button 
      className={className}
      style={{
        ...variantStyle,
        ...sizeStyle,
        ...disabledStyle,
        ...widthStyle,
        ...style,
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span style={{ marginRight: '0.5rem' }}>
          <svg 
            className="animate-spin h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
            style={{ width: '1rem', height: '1rem' }}
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            ></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </span>
      )}
      {children}
    </button>
  );
}