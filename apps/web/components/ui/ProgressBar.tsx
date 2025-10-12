'use client';

import React from 'react';
import { theme } from '@/lib/theme';

type ProgressTone = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

export interface ProgressBarProps {
  /** Current progress value between 0 and 100 */
  value: number;
  /** Optional accessible label shown above the bar */
  label?: string;
  /** Colour tone applied to the progress indicator */
  tone?: ProgressTone;
  /** Whether to render the numeric value alongside the bar */
  showValue?: boolean;
  /** Optional custom height in pixels for the bar */
  height?: number;
  /** Extra styles */
  style?: React.CSSProperties;
}

const toneToColor: Record<ProgressTone, string> = {
  primary: theme.colors.primary,
  success: theme.colors.success,
  warning: theme.colors.warning,
  error: theme.colors.error,
  neutral: theme.colors.textSecondary,
};

export function ProgressBar({
  value,
  label,
  tone = 'primary',
  showValue = true,
  height = 8,
  style = {},
}: ProgressBarProps) {
  const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const barColor = toneToColor[tone] ?? toneToColor.primary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2], ...style }}>
      {(label || showValue) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
          }}
        >
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(safeValue)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(safeValue)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: height,
          backgroundColor: theme.colors.backgroundSecondary,
          border: `1px solid ${theme.colors.borderLight}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${safeValue}%`,
            background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

