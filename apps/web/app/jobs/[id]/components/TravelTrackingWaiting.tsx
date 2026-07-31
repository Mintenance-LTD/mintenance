'use client';

/**
 * Pre-travel state for ContractorTravelTracking: the job's destination on a
 * static map plus a "waiting for contractor" note, shown until the first
 * usable GPS fix arrives.
 *
 * Split out of ContractorTravelTracking.tsx on 2026-07-20 — adding the shared
 * travel stage machine pushed that file past the 500-line pre-commit gate,
 * and this branch is entirely self-contained.
 */
import { DynamicGoogleMap } from '@/components/maps';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface TravelTrackingWaitingProps {
  destination: { lat: number; lng: number };
  /** Lets the parent keep its map ref so later fixes can drive markers. */
  onMapLoad: (map: google.maps.Map) => void;
}

export function TravelTrackingWaiting({
  destination,
  onMapLoad,
}: TravelTrackingWaitingProps) {
  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
      }}
    >
      {/* Map showing job destination */}
      <div style={{ width: '100%', height: '200px' }}>
        <DynamicGoogleMap
          center={destination}
          zoom={15}
          onMapLoad={(map) => {
            onMapLoad(map);
            new google.maps.Marker({
              position: destination,
              map,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: theme.colors.success,
                fillOpacity: 1,
                strokeColor: theme.colors.white,
                strokeWeight: 2,
              },
              title: 'Job Location',
            });
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div
        style={{
          padding: `${theme.spacing[4]} ${theme.spacing[5]}`,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[3],
        }}
      >
        <Icon name='mapPin' size={20} color={theme.colors.textTertiary} />
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}
          >
            Waiting for Contractor
          </h3>
          <p
            style={{
              margin: 0,
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.xs,
            }}
          >
            They will appear on the map when travelling to the job location.
          </p>
        </div>
      </div>
    </div>
  );
}
