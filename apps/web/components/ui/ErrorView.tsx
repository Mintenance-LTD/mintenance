'use client';

import React from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { theme } from '@/lib/theme';

export interface ErrorViewProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: 'card' | 'fullscreen' | 'inline';
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an error while loading this content. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
  variant = 'card',
}) => {
  const iconStyles: React.CSSProperties = {
    fontSize: '48px',
    marginBottom: theme.spacing[4],
    color: theme.colors.error,
  };

  const titleStyles: React.CSSProperties = {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  };

  const messageStyles: React.CSSProperties = {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing[6],
  };

  const content = (
    <>
      <div style={iconStyles}>⚠️</div>
      <h2 style={titleStyles}>{title}</h2>
      <p style={messageStyles}>{message}</p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </>
  );

  if (variant === 'fullscreen') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundSecondary,
        padding: theme.spacing[6],
      }}>
        <div style={{ maxWidth: '400px', width: '100%' }}>
          {content}
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing[6],
        textAlign: 'center',
      }}>
        {content}
      </div>
    );
  }

  return (
    <Card variant="elevated" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing[8],
      textAlign: 'center',
      maxWidth: '400px',
      margin: '0 auto',
    }}>
      {content}
    </Card>
  );
};

export default ErrorView;
