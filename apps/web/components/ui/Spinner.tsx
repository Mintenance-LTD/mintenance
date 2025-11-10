'use client';

import React from 'react';
import { theme } from '@/lib/theme';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

/**
 * Spinner Component
 * 
 * Simple loading spinner for inline use
 */
export function Spinner({ 
  size = 'md', 
  color = theme.colors.primary,
  className = ''
}: SpinnerProps) {
  const sizeMap = {
    sm: '16px',
    md: '24px',
    lg: '32px',
  };

  const spinnerSize = sizeMap[size];

  const spinnerStyles: React.CSSProperties = {
    width: spinnerSize,
    height: spinnerSize,
    border: `2px solid ${theme.colors.borderLight || '#E5E7EB'}`,
    borderTop: `2px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    display: 'inline-block',
  };

  return (
    <>
      <div 
        style={spinnerStyles} 
        className={className}
        role="status"
        aria-label="Loading"
      />
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default Spinner;

