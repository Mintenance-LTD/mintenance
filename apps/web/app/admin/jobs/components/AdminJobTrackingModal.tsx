'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DynamicGoogleMap } from '@/components/maps';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { logger } from '@mintenance/shared';

// Design tokens (the repo blocks new hard-coded hex in style props).
const C = {
  white: theme.colors.white,
  border: theme.colors.border,
  ink: theme.colors.textPrimary,
  ink2: theme.colors.textSecondary,
  ink3: theme.colors.textTertiary,
  green: theme.colors.success,
  blue: theme.colors.info,
  teal: theme.colors.teal[700],
  red: theme.colors.status.error.text,
} as const;

interface TrackingData {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  eta_minutes: number | null;
  context: string | null;
  is_sharing_location: boolean | null;
  is_active: boolean | null;
  location_timestamp: string | null;
}

interface TrackingResponse {
  job: { id: string; status: string };
  destination: { lat: number; lng: number } | null;
  contractor: { id: string; name: string } | null;
  tracking: TrackingData | null;
}

const ARRIVED_CONTEXTS = new Set(['on_job', 'arrived', 'on_site']);
const POLL_MS = 12_000;

/**
 * AdminJobTrackingModal — admin oversight of "contractor on the way".
 *
 * Admins are blocked by RLS from reading `contractor_locations` client-side,
 * so this polls the service-role `/api/admin/jobs/[id]/tracking` route every
 * 12s and draws the contractor + destination on a Google map, reusing the
 * same imperative marker/polyline logic as the homeowner's
 * ContractorTravelTracking view.
 */
export function AdminJobTrackingModal({
  jobId,
  jobTitle,
  onClose,
}: {
  jobId: string;
  jobTitle?: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [initialCenter, setInitialCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);
  const contractorMarkerRef = useRef<google.maps.Marker | null>(null);
  const routeLineRef = useRef<google.maps.Polyline | null>(null);

  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/tracking`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          body.error || `Tracking request failed (${res.status})`
        );
      }
      setData((await res.json()) as TrackingResponse);
      setError(null);
    } catch (err) {
      logger.warn('admin tracking poll failed', {
        service: 'admin-tracking',
        jobId,
        error: err instanceof Error ? err.message : String(err),
      });
      setError(err instanceof Error ? err.message : 'Failed to load tracking');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchTracking();
    const id = setInterval(fetchTracking, POLL_MS);
    return () => clearInterval(id);
  }, [fetchTracking]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tracking = data?.tracking ?? null;
  const destination = data?.destination ?? null;
  const mapCenter =
    destination ??
    (tracking ? { lat: tracking.latitude, lng: tracking.longitude } : null);

  // Lock in the first usable center so the map mounts once and never
  // re-centers on the prop (movement is handled imperatively below).
  useEffect(() => {
    if (!initialCenter && mapCenter) setInitialCenter(mapCenter);
  }, [initialCenter, mapCenter]);

  const drawMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || typeof google === 'undefined') return;

    if (destination && !destMarkerRef.current) {
      destMarkerRef.current = new google.maps.Marker({
        position: destination,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: C.green,
          fillOpacity: 1,
          strokeColor: C.white,
          strokeWeight: 2,
        },
        title: 'Job location',
      });
    }

    if (!tracking) return;
    const pos = { lat: tracking.latitude, lng: tracking.longitude };
    const icon = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 5,
      rotation: tracking.heading ?? 0,
      fillColor: C.blue,
      fillOpacity: 1,
      strokeColor: C.white,
      strokeWeight: 2,
    };
    if (contractorMarkerRef.current) {
      contractorMarkerRef.current.setPosition(pos);
      contractorMarkerRef.current.setIcon(icon);
    } else {
      contractorMarkerRef.current = new google.maps.Marker({
        position: pos,
        map,
        icon,
        title: 'Contractor',
      });
    }

    if (destination) {
      if (routeLineRef.current) {
        routeLineRef.current.setPath([pos, destination]);
      } else {
        routeLineRef.current = new google.maps.Polyline({
          path: [pos, destination],
          geodesic: true,
          strokeColor: C.blue,
          strokeOpacity: 0.6,
          strokeWeight: 3,
          map,
        });
      }
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pos);
      bounds.extend(destination);
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    } else {
      map.setCenter(pos);
      map.setZoom(15);
    }
  }, [tracking, destination]);

  useEffect(() => {
    drawMarkers();
  }, [drawMarkers]);

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    drawMarkers();
  };

  const isArrived =
    tracking?.context != null && ARRIVED_CONTEXTS.has(tracking.context);
  const isSharing = !!tracking?.is_sharing_location && !!tracking?.is_active;
  const minutesAgo = tracking?.location_timestamp
    ? Math.floor(
        (nowMs - new Date(tracking.location_timestamp).getTime()) / 60000
      )
    : null;

  const statusLabel = !tracking
    ? 'Not sharing location yet'
    : isArrived
      ? 'Arrived on site'
      : isSharing
        ? 'On the way'
        : 'Sharing paused';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: C.white,
          borderRadius: theme.borderRadius.xl,
          width: '100%',
          maxWidth: '640px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name='mapPin' size={18} color={theme.colors.primary} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: C.ink }}>
                Live Tracking
              </div>
              <div style={{ fontSize: '12px', color: C.ink2 }}>
                {jobTitle ? `${jobTitle} · ` : ''}
                {data?.contractor?.name ?? 'Contractor'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label='Close'
            style={{
              width: '32px',
              height: '32px',
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${C.border}`,
              backgroundColor: C.white,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name='x' size={16} color={C.ink2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          {loading && !data ? (
            <div
              style={{
                padding: '48px 0',
                textAlign: 'center',
                color: C.ink2,
                fontSize: '14px',
              }}
            >
              Loading tracking…
            </div>
          ) : initialCenter ? (
            <>
              <div
                style={{
                  width: '100%',
                  height: '340px',
                  borderRadius: theme.borderRadius.md,
                  overflow: 'hidden',
                  border: `1px solid ${C.border}`,
                  marginBottom: '14px',
                }}
              >
                <DynamicGoogleMap
                  center={initialCenter}
                  zoom={14}
                  onMapLoad={handleMapLoad}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: isSharing ? C.green : C.ink3,
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{ fontSize: '14px', fontWeight: 600, color: C.ink }}
                  >
                    {statusLabel}
                  </span>
                </div>
                {tracking && !isArrived && tracking.eta_minutes != null && (
                  <span
                    style={{ fontSize: '14px', color: C.teal, fontWeight: 600 }}
                  >
                    {tracking.eta_minutes <= 0
                      ? 'Arriving now'
                      : `~${tracking.eta_minutes} min away`}
                  </span>
                )}
              </div>

              {minutesAgo != null && (
                <div
                  style={{ marginTop: '6px', fontSize: '12px', color: C.ink3 }}
                >
                  Last update{' '}
                  {minutesAgo < 1
                    ? 'just now'
                    : `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`}
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                padding: '40px 0',
                textAlign: 'center',
                color: C.ink2,
                fontSize: '14px',
              }}
            >
              {data?.contractor
                ? 'The contractor has not shared a location for this job yet.'
                : 'No contractor is assigned to this job yet.'}
            </div>
          )}

          {error && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: C.red }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
