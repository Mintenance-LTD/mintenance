'use client';

import React from 'react';
import { theme } from '@/lib/theme';

interface TrendSparklineProps {
  direction?: 'up' | 'down';
  data?: number[];
  color?: string;
  showLabel?: boolean;
}

/**
 * Small trend graph/sparkline component for KPI cards
 * Matches the design from the UI images showing small green boxes with upward-sloping line graphs
 */
export function TrendSparkline({
  direction = 'up',
  data,
  color = theme.colors.secondary, // Emerald green #10B981
  showLabel = true,
}: TrendSparklineProps) {
  // Generate default upward trend data if not provided
  const trendData = data || (direction === 'up' 
    ? [20, 25, 30, 35, 40, 45, 50] // Upward trend
    : [50, 45, 40, 35, 30, 25, 20] // Downward trend
  );

  const maxValue = Math.max(...trendData);
  const minValue = Math.min(...trendData);
  const range = maxValue - minValue || 1;

  // Calculate points for the line
  const points = trendData.map((value, index) => {
    const x = (index / (trendData.length - 1)) * 100;
    const y = 100 - ((value - minValue) / range) * 60 - 20; // Leave some padding
    return { x, y };
  });

  // Create SVG path
  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded border border-emerald-100">
      {/* Small SVG Sparkline */}
      <svg
        width="36"
        height="16"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="flex-shrink-0"
        style={{ overflow: 'visible' }}
      >
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      
      {/* "Trend" Label */}
      {showLabel && (
        <span className="text-[10px] font-semibold text-emerald-700 whitespace-nowrap leading-tight">
          Trend
        </span>
      )}
    </div>
  );
}

