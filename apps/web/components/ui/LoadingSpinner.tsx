'use client';

import React from 'react';
import { theme } from '@/lib/theme';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = theme.colors.primary,
  message,
  fullScreen = false,
}) => {
  const sizeMap = {
    sm: '20px',
    md: '32px',
    lg: '48px',
  };

  const spinnerSize = sizeMap[size];

  const spinnerStyles: React.CSSProperties = {
    width: spinnerSize,
    height: spinnerSize,
    border: `3px solid ${theme.colors.borderLight}`,
    borderTop: `3px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[3],
    ...(fullScreen && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.backgroundSecondary,
      zIndex: 9999,
    }),
  };

  const messageStyles: React.CSSProperties = {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  };

  return (
    <div style={containerStyles}>
      <div style={spinnerStyles} />
      {message && <div style={messageStyles}>{message}</div>}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
