'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { ContractorMarker } from './types';
import { calculateDistance } from './utils';

interface ContractorDetailsModalProps {
  contractor: ContractorMarker;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onViewProfile: (contractorId: string) => void;
}

export function ContractorDetailsModal({
  contractor,
  userLocation,
  onClose,
  onViewProfile,
}: ContractorDetailsModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          padding: theme.spacing.xl,
          maxWidth: 500,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '32px',
              margin: '0 auto 16px',
            }}
          >
            {contractor.name.charAt(0).toUpperCase()}
          </div>
          <h2
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing.sm,
            }}
          >
            {contractor.name}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: theme.typography.fontSize.lg }}>
            <Icon name="star" size={20} color={theme.colors.warning} />
            <span style={{ color: theme.colors.textSecondary }}>{contractor.rating.toFixed(1)}</span>
          </div>
        </div>

        <div style={{ marginBottom: theme.spacing.lg }}>
          <h3
            style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text,
              marginBottom: theme.spacing.sm,
            }}
          >
            Location
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.colors.textSecondary }}>
              <Icon name="mapPin" size={16} color={theme.colors.textSecondary} />
              <span>{contractor.city || 'Location not specified'}</span>
            </div>
            {userLocation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.colors.textSecondary }}>
                <Icon name="map" size={16} color={theme.colors.textSecondary} />
                <span>
                  {calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    contractor.latitude,
                    contractor.longitude
                  ).toFixed(1)}{' '}
                  km away
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          <Button
            variant="primary"
            fullWidth
            onClick={() => onViewProfile(contractor.id)}
          >
            View Full Profile
          </Button>
          <Button variant="outline" fullWidth onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
