import React from 'react';
import { theme } from '@/lib/theme';

interface ChartSkeletonProps {
  height?: number;
  showLegend?: boolean;
}

export function ChartSkeleton({ height = 300, showLegend = false }: ChartSkeletonProps) {
  return (
    <div
      style={{
        width: '100%',
        height: height,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[4],
        position: 'relative',
        overflow: 'hidden',
      }}
      role="status"
      aria-label="Loading chart"
    >
      {/* Animated gradient overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
          animation: 'shimmer 2s infinite',
          zIndex: 1,
        }}
      />

      {/* Chart bars skeleton */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          height: showLegend ? height - 80 : height - 40,
          gap: theme.spacing[2],
          padding: `0 ${theme.spacing[4]}`,
        }}
      >
        {[65, 85, 55, 95, 70, 80, 60].map((barHeight, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              height: `${barHeight}%`,
              backgroundColor: theme.colors.border,
              borderRadius: theme.borderRadius.sm,
              opacity: 0.3,
              animation: `pulse 1.5s ease-in-out ${index * 0.1}s infinite`,
            }}
          />
        ))}
      </div>

      {/* X-axis labels skeleton */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: theme.spacing[2],
          paddingTop: theme.spacing[2],
          borderTop: `1px solid ${theme.colors.border}`,
        }}
      >
        {[...Array(7)].map((_, index) => (
          <div
            key={index}
            style={{
              width: 30,
              height: 12,
              backgroundColor: theme.colors.border,
              borderRadius: theme.borderRadius.sm,
              opacity: 0.3,
            }}
          />
        ))}
      </div>

      {/* Legend skeleton */}
      {showLegend && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: theme.spacing[4],
            marginTop: theme.spacing[3],
          }}
        >
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: theme.borderRadius.sm,
                  backgroundColor: theme.colors.border,
                  opacity: 0.3,
                }}
              />
              <div
                style={{
                  width: 60,
                  height: 12,
                  backgroundColor: theme.colors.border,
                  borderRadius: theme.borderRadius.sm,
                  opacity: 0.3,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
