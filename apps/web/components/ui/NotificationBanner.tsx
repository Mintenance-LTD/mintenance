'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';

export type NotificationTone = 'success' | 'info' | 'warning' | 'error';

export interface NotificationBannerProps {
  tone?: NotificationTone;
  title?: string;
  message: string;
  onDismiss?: () => void;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const toneMap: Record<NotificationTone, { icon: string; color: string; background: string; border: string }> = {
  success: {
    icon: 'checkCircle',
    color: theme.colors.success,
    background: `${theme.colors.success}14`,
    border: `${theme.colors.success}33`,
  },
  info: {
    icon: 'info',
    color: theme.colors.info,
    background: `${theme.colors.info}14`,
    border: `${theme.colors.info}33`,
  },
  warning: {
    icon: 'warning',
    color: theme.colors.warning,
    background: `${theme.colors.warning}14`,
    border: `${theme.colors.warning}33`,
  },
  error: {
    icon: 'alert',
    color: theme.colors.error,
    background: `${theme.colors.error}14`,
    border: `${theme.colors.error}33`,
  },
};

export function NotificationBanner({
  tone = 'info',
  title,
  message,
  onDismiss,
  action,
  className = '',
  style = {},
}: NotificationBannerProps) {
  const palette = toneMap[tone];

  return (
    <div
      role="status"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: theme.spacing[3],
        padding: theme.spacing[4],
        borderRadius: '16px',
        backgroundColor: palette.background,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        ...style,
      }}
    >
      <Icon name={palette.icon} size={20} color={palette.color} />
      <div style={{ flex: 1 }}>
        {title && (
          <strong
            style={{
              display: 'block',
              marginBottom: theme.spacing[1],
              color: theme.colors.textPrimary,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            {title}
          </strong>
        )}
        <p
          style={{
            margin: 0,
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: theme.typography.lineHeight.relaxed,
          }}
        >
          {message}
        </p>
        {action && <div style={{ marginTop: theme.spacing[2] }}>{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          style={{
            border: 'none',
            background: 'transparent',
            color: theme.colors.textSecondary,
            cursor: 'pointer',
            padding: theme.spacing[1],
          }}
        >
          <Icon name="x" size={16} color={theme.colors.textSecondary} />
        </button>
      )}
    </div>
  );
}

