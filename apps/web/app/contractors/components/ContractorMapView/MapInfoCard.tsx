'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface MapInfoCardProps {
  contractorCount: number;
  showServiceAreas: boolean;
  loadingServiceAreas: boolean;
  onToggleServiceAreas: () => void;
}

export function MapInfoCard({
  contractorCount,
  showServiceAreas,
  loadingServiceAreas,
  onToggleServiceAreas,
}: MapInfoCardProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: theme.spacing.md,
        left: theme.spacing.md,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(10px)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[2],
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
        <Icon name="map" size={20} color={theme.colors.primary} />
        <span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text }}>
          {contractorCount} contractors
        </span>
      </div>
      <button
        onClick={onToggleServiceAreas}
        disabled={loadingServiceAreas}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[1],
          padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
          minHeight: '44px',
          backgroundColor: showServiceAreas ? theme.colors.primary : theme.colors.backgroundSecondary,
          color: showServiceAreas ? 'white' : theme.colors.text,
          border: 'none',
          borderRadius: theme.borderRadius.sm,
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.medium,
          cursor: loadingServiceAreas ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          WebkitTapHighlightColor: 'transparent',
          opacity: loadingServiceAreas ? 0.6 : 1,
        }}
        aria-label={showServiceAreas ? 'Hide service areas' : 'Show service areas'}
        aria-busy={loadingServiceAreas}
        role="switch"
        aria-checked={showServiceAreas}
      >
        {loadingServiceAreas ? (
          <>
            <div
              style={{
                width: 14,
                height: 14,
                border: '2px solid currentColor',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span className="sr-only">Loading</span>
          </>
        ) : (
          <>
            <Icon name={showServiceAreas ? 'eye' : 'eyeOff'} size={14} />
            {showServiceAreas ? 'Hide' : 'Show'} Coverage Areas
          </>
        )}
      </button>
    </div>
  );
}
