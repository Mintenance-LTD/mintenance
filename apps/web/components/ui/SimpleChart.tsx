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

export function BarChart({ data, height = 200, showValues = true }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div style={{ width: '100%', height, display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
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

export function LineChart({ data, height = 200, color = theme.colors.primary }: LineChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((item.value - minValue) / range) * 80;
    return { x, y, value: item.value };
  });

  const pathData = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <div style={{ width: '100%', height, display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
        >
          {/* Gradient Fill */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area under line */}
          <path
            d={`${pathData} L 100 100 L 0 100 Z`}
            fill="url(#lineGradient)"
          />

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="1.5"
              fill={color}
              vectorEffect="non-scaling-stroke"
            >
              <title>{point.value}</title>
            </circle>
          ))}
        </svg>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: theme.spacing[2],
        }}
      >
        {data.map((item, index) => (
          <span
            key={index}
            style={{
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

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  innerText?: string;
}

export function DonutChart({ data, size = 160, innerText }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const center = size / 2;
  const radius = (size / 2) * 0.8;
  const strokeWidth = radius * 0.3;
  const innerRadius = radius - strokeWidth / 2;

  let cumulativePercentage = 0;

  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const startAngle = (cumulativePercentage / 100) * 360;
    const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
    cumulativePercentage += percentage;

    const startRadians = ((startAngle - 90) * Math.PI) / 180;
    const endRadians = ((endAngle - 90) * Math.PI) / 180;

    const x1 = center + innerRadius * Math.cos(startRadians);
    const y1 = center + innerRadius * Math.sin(startRadians);
    const x2 = center + innerRadius * Math.cos(endRadians);
    const y2 = center + innerRadius * Math.sin(endRadians);

    const largeArc = percentage > 50 ? 1 : 0;

    return {
      path: `M ${x1} ${y1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
      color: item.color,
      percentage: percentage.toFixed(1),
      label: item.label,
    };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[6] }}>
      {/* Chart */}
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size}>
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          ))}
        </svg>
        {innerText && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: theme.typography.fontSize['3xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}
            >
              {innerText}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
        {data.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: theme.borderRadius.sm,
                backgroundColor: item.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                marginLeft: 'auto',
              }}
            >
              {segments[index].percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

