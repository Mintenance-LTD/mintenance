'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export interface StatusChipProps {
  label: React.ReactNode;
  tone?: StatusTone;
  icon?: string;
  /** Set true to render a coloured dot automatically */
  withDot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const toneConfig: Record<StatusTone, { text: string; background: string; border: string; iconColor: string }> = {
  neutral: {
    text: theme.colors.textSecondary,
    background: theme.colors.backgroundSecondary,
    border: theme.colors.border,
    iconColor: theme.colors.textSecondary,
  },
  info: {
    text: theme.colors.infoDark ?? '#0f4ab0',
    background: `${theme.colors.info}1A`,
    border: theme.colors.info,
    iconColor: theme.colors.info,
  },
  success: {
    text: theme.colors.successDark ?? '#0f5132',
    background: `${theme.colors.success}1A`,
    border: theme.colors.success,
    iconColor: theme.colors.success,
  },
  warning: {
    text: theme.colors.warningDark ?? '#7a3b00',
    background: `${theme.colors.warning}1A`,
    border: theme.colors.warning,
    iconColor: theme.colors.warning,
  },
  error: {
    text: theme.colors.errorDark ?? '#842029',
    background: `${theme.colors.error}1A`,
    border: theme.colors.error,
    iconColor: theme.colors.error,
  },
};

export function StatusChip({
  label,
  tone = 'neutral',
  icon,
  withDot = false,
  className = '',
  style = {},
}: StatusChipProps) {
  const palette = toneConfig[tone];
  const resolvedIcon = icon || (withDot ? 'dot' : undefined);

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing[1],
        padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
        borderRadius: 999,
        backgroundColor: palette.background,
        border: `1px solid ${palette.border}`,
        color: palette.text,
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.medium,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {resolvedIcon && (
        <Icon
          name={resolvedIcon}
          size={resolvedIcon === 'dot' ? 8 : 12}
          color={palette.iconColor}
          style={resolvedIcon === 'dot' ? { marginRight: 0 } : {}}
        />
      )}
      <span>{label}</span>
    </span>
  );
}

