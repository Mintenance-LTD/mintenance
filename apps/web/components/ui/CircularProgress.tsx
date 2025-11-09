'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { getGradient } from '@/lib/theme-enhancements';

interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  showPercentage?: boolean;
}

export function CircularProgress({
  value,
  size = 200,
  strokeWidth = 12,
  label = 'Completed',
  showPercentage = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  // Color based on completion percentage
  const getColor = () => {
    if (value >= 75) return theme.colors.success;
    if (value >= 50) return '#F59E0B'; // warning/yellow
    if (value >= 25) return '#EF4444'; // error/red
    return theme.colors.textSecondary;
  };

  const color = getColor();
  
  // Use gradient for high completion
  const useGradient = value >= 75;

  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background Circle */}
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
          position: 'absolute',
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.colors.border}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={useGradient ? `url(#gradient-${size})` : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        {useGradient && (
          <defs>
            <linearGradient id={`gradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.colors.success} />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>
        )}
      </svg>

      {/* Center Text */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: theme.spacing[1],
        }}
      >
        {showPercentage && (
          <span
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}
          >
            {value}%
          </span>
        )}
        <span
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}
        >
          {label}
        </span>
      </div>

      {/* Scale Markers */}
      <div
        style={{
          position: 'absolute',
          width: `${size + 40}px`,
          height: `${size + 40}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {[0, 25, 50, 75, 100].map((marker) => {
          const angle = (marker / 100) * 360 - 90; // Start from top
          const markerRadius = size / 2 + 10;
          const x = markerRadius * Math.cos((angle * Math.PI) / 180);
          const y = markerRadius * Math.sin((angle * Math.PI) / 180);

          return (
            <span
              key={marker}
              style={{
                position: 'absolute',
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              {marker}
            </span>
          );
        })}
      </div>
    </div>
  );
}
