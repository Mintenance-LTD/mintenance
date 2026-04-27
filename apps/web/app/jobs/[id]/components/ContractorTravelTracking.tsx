'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { DynamicGoogleMap } from '@/components/maps';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import { Icon } from '@/components/ui/Icon';

interface ContractorTravelTrackingProps {
  jobId: string;
  contractorId: string;
  meetingId?: string;
  destination: { lat: number; lng: number };
}

interface ContractorLocationData {
  latitude: number;
  longitude: number;
  eta: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  context: string;
}

export function ContractorTravelTracking({
  jobId,
  contractorId,
  meetingId,
  destination,
}: ContractorTravelTrackingProps) {
  const [contractorLocation, setContractorLocation] =
    useState<ContractorLocationData | null>(null);
  const [isTraveling, setIsTraveling] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const contractorMarkerRef = useRef<google.maps.Marker | null>(null);
  const routeLineRef = useRef<google.maps.Polyline | null>(null);

  // Tick once a minute so the "X minutes ago" label refreshes even when
  // the contractor stops sending location updates. Using state (instead
  // of `Date.now()` directly in render) keeps the component pure under
  // the React Compiler linter and avoids SSR/CSR hydration mismatches.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Subscribe to real-time contractor location updates
  const { status } = useRealtime({
    table: 'contractor_locations',
    filter: `contractor_id=eq.${contractorId} AND job_id=eq.${jobId}${meetingId ? ` AND meeting_id=eq.${meetingId}` : ''} AND is_active=eq.true`,
    onUpdate: (payload) => {
      if (payload.new) {
        const newData = payload.new as Record<string, unknown>;
        const locationData: ContractorLocationData = {
          latitude: newData.latitude as number,
          longitude: newData.longitude as number,
          eta: (newData.eta_minutes as number) || 0,
          heading: newData.heading as number | undefined,
          speed: newData.speed as number | undefined,
          timestamp: newData.timestamp as string,
          context: (newData.context as string) || 'traveling',
        };

        setContractorLocation(locationData);
        setIsTraveling(locationData.context === 'traveling');

        // Update map markers
        updateMapMarkers(locationData);
      }
    },
  });

  const updateMapMarkers = (locationData: ContractorLocationData) => {
    if (!mapRef.current) return;

    const contractorPosition = {
      lat: locationData.latitude,
      lng: locationData.longitude,
    };

    // Update or create contractor marker
    if (contractorMarkerRef.current) {
      contractorMarkerRef.current.setPosition(contractorPosition);
      if (locationData.heading !== undefined) {
        contractorMarkerRef.current.setIcon({
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          rotation: locationData.heading,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        });
      }
    } else {
      contractorMarkerRef.current = new google.maps.Marker({
        position: contractorPosition,
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          rotation: locationData.heading || 0,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        title: 'Contractor Location',
      });
    }

    // Update route line
    if (routeLineRef.current) {
      routeLineRef.current.setPath([contractorPosition, destination]);
    } else {
      routeLineRef.current = new google.maps.Polyline({
        path: [contractorPosition, destination],
        geodesic: true,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.6,
        strokeWeight: 3,
        map: mapRef.current,
      });
    }

    // Fit bounds to show both locations
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(contractorPosition);
    bounds.extend(destination);
    mapRef.current.fitBounds(bounds, {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50,
    });
  };

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;

    // Create destination marker
    new google.maps.Marker({
      position: destination,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#10B981',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
      title: 'Job Location',
    });

    // If we already have location data, update markers
    if (contractorLocation) {
      updateMapMarkers(contractorLocation);
    } else {
      // Center on destination
      map.setCenter(destination);
      map.setZoom(15);
    }
  };

  if (!contractorLocation) {
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
              mapRef.current = map;
              new google.maps.Marker({
                position: destination,
                map,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#10B981',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
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

  // Plain consts (not useMemo) because this code path lives below the
  // early return for `!contractorLocation`. Hooks must run unconditionally,
  // but these are cheap pure computations off `nowMs` (state) +
  // `contractorLocation.timestamp` (string) so memoization buys nothing.
  const lastUpdate = new Date(contractorLocation.timestamp);
  const minutesAgo = Math.floor((nowMs - lastUpdate.getTime()) / 60000);

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
      }}
    >
      {/* ETA Banner */}
      {isTraveling && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing[4],
            padding: theme.spacing[4],
            backgroundColor: theme.colors.info + '20',
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.info}`,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                marginBottom: theme.spacing[1],
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
            >
              <Icon name='car' size={24} color={theme.colors.info} />
              Contractor is on the way
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textSecondary,
              }}
            >
              Estimated arrival:{' '}
              <strong>{contractorLocation.eta} minutes</strong>
            </p>
          </div>
          <div
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.success + '20',
              color: theme.colors.success,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: theme.colors.success,
                animation: 'pulse 2s infinite',
              }}
            />
            Live
          </div>
        </div>
      )}

      {/* Map */}
      <div
        style={{
          width: '100%',
          height: '400px',
          borderRadius: theme.borderRadius.md,
          overflow: 'hidden',
          marginBottom: theme.spacing[4],
          border: `1px solid ${theme.colors.border}`,
        }}
      >
        <DynamicGoogleMap
          center={
            contractorLocation
              ? {
                  lat: contractorLocation.latitude,
                  lng: contractorLocation.longitude,
                }
              : destination
          }
          zoom={15}
          onMapLoad={handleMapLoad}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Location Details */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[3],
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing[1],
              }}
            >
              Current Location
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
                fontFamily: 'monospace',
              }}
            >
              {contractorLocation.latitude.toFixed(6)},{' '}
              {contractorLocation.longitude.toFixed(6)}
            </div>
          </div>
          {contractorLocation.speed && (
            <div>
              <div
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[1],
                }}
              >
                Speed
              </div>
              <div
                style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                }}
              >
                {Math.round(contractorLocation.speed * 3.6)} km/h
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}
        >
          <Icon name='clock' size={16} color={theme.colors.textSecondary} />
          Last updated{' '}
          {minutesAgo < 1
            ? 'just now'
            : `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
