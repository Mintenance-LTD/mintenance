'use client';

import { useEffect, useState, useRef } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { DynamicGoogleMap } from '@/components/maps';
import { theme } from '@/lib/theme';
import {
  deriveTravelStage,
  isArrivedContext,
  isFixTrustable,
  travelPresentation,
  travelBadgeLabel,
} from '@mintenance/shared';
import { Icon } from '@/components/ui/Icon';
import { useContractorLocationHydration } from './useContractorLocationHydration';
import { TravelTrackingWaiting } from './TravelTrackingWaiting';

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

  // 2026-05-26 audit-48 P1: Supabase Realtime Postgres Changes filters
  // are single-column equality only — multi-condition SQL-style "AND"
  // expressions like the previous one silently failed to subscribe
  // (no error, just no events). Drop to the most-selective single
  // filter (job_id is unique per assignment and effectively scopes the
  // event stream) and run the remaining conditions client-side in the
  // onUpdate handler. Reference:
  // https://supabase.com/docs/guides/realtime/postgres-changes#available-filters
  //
  // Also wires onInsert so the first GPS tick (which is an INSERT
  // because of the select-then-update/insert pattern in
  // JobContextLocationService) paints the map without waiting for the
  // second tick to fire an UPDATE.
  const handleLocationEvent = (payload: { new: unknown | null }) => {
    if (!payload.new) return;
    const newData = payload.new as Record<string, unknown>;
    // 2026-05-26 audit-48 P1: belt-and-braces — match the rest of
    // the previous filter client-side so a stale row from another
    // contractor or a closed tracking session can't paint the map.
    if (newData.contractor_id !== contractorId) return;
    if (newData.is_active === false) return;
    if (meetingId && newData.meeting_id !== meetingId) return;
    // 2026-05-23 audit: live `contractor_locations` has
    // `location_timestamp`, NOT `timestamp`. Reading the wrong
    // column made `lastUpdate` resolve to `new Date(undefined)`
    // → Invalid Date → "NaN minutes ago" on the live status pill.
    // Falls back to `updated_at` as a secondary anchor, then the
    // current moment so the pill stays meaningful.
    const locationData: ContractorLocationData = {
      latitude: newData.latitude as number,
      longitude: newData.longitude as number,
      eta: (newData.eta_minutes as number) || 0,
      heading: newData.heading as number | undefined,
      speed: newData.speed as number | undefined,
      timestamp:
        (newData.location_timestamp as string) ||
        (newData.updated_at as string) ||
        new Date().toISOString(),
      context: (newData.context as string) || 'traveling',
    };

    setContractorLocation(locationData);

    // Update map markers
    updateMapMarkers(locationData);
  };

  // 2026-05-27 audit-84 P2: hydrate before subscribing — see hook file.
  useContractorLocationHydration({
    jobId,
    contractorId,
    meetingId,
    onHydrate: handleLocationEvent,
  });

  useRealtime({
    table: 'contractor_locations',
    filter: `job_id=eq.${jobId}`,
    onInsert: handleLocationEvent,
    onUpdate: handleLocationEvent,
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
      <TravelTrackingWaiting
        destination={destination}
        onMapLoad={(map) => {
          mapRef.current = map;
        }}
      />
    );
  }

  // Plain consts (not useMemo) because this code path lives below the
  // early return for `!contractorLocation`. Hooks must run unconditionally,
  // but these are cheap pure computations off `nowMs` (state) +
  // `contractorLocation.timestamp` (string) so memoization buys nothing.
  const lastUpdate = new Date(contractorLocation.timestamp);
  const minutesAgo = Math.floor((nowMs - lastUpdate.getTime()) / 60000);

  // 2026-07-20 web parity: derive the journey stage with the SAME machine
  // mobile uses (@mintenance/shared) instead of a flat
  // `context === 'traveling'` boolean. This also brings web the freshness
  // gate it never had — previously a stale row (app killed mid-trip) kept
  // rendering "on the way, ETA N minutes" indefinitely.
  const hasArrived = isArrivedContext(contractorLocation.context);
  const trustable = isFixTrustable(
    contractorLocation.timestamp,
    hasArrived,
    nowMs
  );
  const eta = trustable ? contractorLocation.eta : null;
  const stage = deriveTravelStage(hasArrived, trustable && !hasArrived, eta);
  const presentation = travelPresentation(stage, { eta });
  // `tone` is semantic; map it to this surface's legacy theme colours.
  const toneColor =
    presentation.tone === 'ok'
      ? theme.colors.success
      : presentation.tone === 'warn'
        ? theme.colors.warning
        : theme.colors.info;

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
      }}
    >
      {/* Stage banner — copy, tone and badge wording all come from the
          shared travel machine, so this reads identically to mobile. */}
      {stage !== 'idle' && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing[4],
            padding: theme.spacing[4],
            backgroundColor: toneColor + '20',
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${toneColor}`,
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
              <Icon
                name={stage === 'arrived' ? 'mapPin' : 'car'}
                size={24}
                color={toneColor}
              />
              {presentation.title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textSecondary,
              }}
            >
              {presentation.subtitle}
            </p>
          </div>
          <div
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              borderRadius: theme.borderRadius.full,
              backgroundColor: toneColor + '20',
              color: toneColor,
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
                backgroundColor: toneColor,
                animation: 'pulse 2s infinite',
              }}
            />
            {travelBadgeLabel(stage)}
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
