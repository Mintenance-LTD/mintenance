import React from 'react';
import { theme } from '@/lib/theme';

export function MapSkeleton() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        position: 'relative',
        overflow: 'hidden',
      }}
      role="status"
      aria-label="Loading map"
    >
      {/* Animated gradient overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          animation: 'shimmer 2s infinite',
        }}
      />

      {/* Map controls skeleton */}
      <div
        style={{
          position: 'absolute',
          top: theme.spacing[4],
          right: theme.spacing[4],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[2],
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: theme.borderRadius.md,
          }}
        />
        <div
          style={{
            width: 40,
            height: 80,
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: theme.borderRadius.md,
          }}
        />
      </div>

      {/* Map markers skeleton */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '40%',
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: theme.colors.primary,
          opacity: 0.3,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '60%',
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: theme.colors.primary,
          opacity: 0.3,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '30%',
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: theme.colors.primary,
          opacity: 0.3,
        }}
      />

      {/* Center loading indicator */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: theme.spacing[3],
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: `4px solid ${theme.colors.border}`,
            borderTopColor: theme.colors.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
          }}
        >
          Loading map...
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
