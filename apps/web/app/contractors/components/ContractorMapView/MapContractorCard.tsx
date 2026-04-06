'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import type { ContractorMarker } from './types';
import { calculateDistance } from './utils';

interface MapContractorCardProps {
  contractor: ContractorMarker;
  userLocation: { lat: number; lng: number } | null;
  onSelect: (contractor: ContractorMarker) => void;
}

export function MapContractorCard({ contractor, userLocation, onSelect }: MapContractorCardProps) {
  const distance = userLocation
    ? calculateDistance(
        userLocation.lat,
        userLocation.lng,
        contractor.latitude,
        contractor.longitude
      )
    : null;

  return (
    <button
      type="button"
      aria-label={`View profile for ${contractor.name}, rated ${contractor.rating} stars${distance ? `, ${distance.toFixed(1)} km away` : ''}`}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: '12px',
        border: `1px solid ${theme.colors.border}`,
        marginBottom: theme.spacing.sm,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={() => onSelect(contractor)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = theme.colors.primary;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = theme.colors.border;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            backgroundColor: theme.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '20px',
          }}
        >
          {contractor.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: theme.typography.fontSize.md,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text,
              marginBottom: 4,
            }}
          >
            {contractor.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, fontSize: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Icon name="star" size={14} color={theme.colors.warning} />
              <span style={{ color: theme.colors.textSecondary }}>{contractor.rating.toFixed(1)}</span>
            </div>
            {distance && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="dot" size={8} color={theme.colors.textSecondary} />
                <Icon name="mapPin" size={14} color={theme.colors.textSecondary} />
                <span style={{ color: theme.colors.textSecondary }}>
                  {distance.toFixed(1)} km
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
