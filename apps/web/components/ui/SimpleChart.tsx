'use client';

import React from 'react';
import { theme } from '@/lib/theme';

/**
 * Simple Chart Components
 * Lightweight chart visualizations without external dependencies
 */

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  showValues?: boolean;
}

export function BarChart({
  data,
  height = 200,
  showValues = true,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div
      style={{
        width: '100%',
        height,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[4],
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          gap: theme.spacing[2],
        }}
      >
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100;
          const color = item.color || theme.colors.primary;

          return (
            <div
              key={index}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
            >
              {showValues && (
                <span
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                  }}
                >
                  {item.value}
                </span>
              )}
              <div
                style={{
                  width: '100%',
                  height: `${barHeight}%`,
                  backgroundColor: color,
                  borderRadius: `${theme.borderRadius.md} ${theme.borderRadius.md} 0 0`,
                  transition: 'all 0.3s ease',
                  minHeight: '10px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          gap: theme.spacing[2],
        }}
      >
        {data.map((item, index) => (
          <span
            key={index}
            style={{
              flex: 1,
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              textAlign: 'center',
            }}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
}

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  innerText?: string;
}
