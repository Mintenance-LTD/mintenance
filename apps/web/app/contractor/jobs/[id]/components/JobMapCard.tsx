'use client';

/**
 * Map + drive-time + Navigate button on the contractor job-detail
 * sidebar.
 *
 * Lives in its own component so we can keep the Google Distance
 * Matrix call (which needs `navigator.geolocation` + a runtime
 * Maps SDK call) isolated from the parent server-rendered view.
 *
 * Failure modes are silent:
 *   - no contractor geolocation (permission denied / browser blocks)
 *   - Distance Matrix call errors out
 * The "X mi · Y min drive" pill simply doesn't render in those
 * cases; the rest of the card (map + Navigate button) still works.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Navigation } from 'lucide-react';
import { DynamicGoogleMap } from '@/components/maps';

interface JobMapCardProps {
  jobLatitude: number | null | undefined;
  jobLongitude: number | null | undefined;
  jobLocation: string | null | undefined;
}

interface DriveInfo {
  distanceText: string;
  durationText: string;
}

export function JobMapCard({
  jobLatitude,
  jobLongitude,
  jobLocation,
}: JobMapCardProps) {
  const [driveInfo, setDriveInfo] = useState<DriveInfo | null>(null);
  const hasCoords =
    typeof jobLatitude === 'number' && typeof jobLongitude === 'number';
  const hasAnyLocation = hasCoords || !!jobLocation;

  /**
   * Distance Matrix call — fired once the map is loaded (so we know
   * the Maps SDK is initialised) and we have the contractor's
   * browser geolocation. Both calls are best-effort; permission
   * denial silently leaves driveInfo null.
   */
  const computeDriveInfo = useCallback(() => {
    if (!hasCoords) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    if (typeof google === 'undefined') return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          const service = new google.maps.DistanceMatrixService();
          service.getDistanceMatrix(
            {
              origins: [
                new google.maps.LatLng(
                  pos.coords.latitude,
                  pos.coords.longitude
                ),
              ],
              destinations: [
                new google.maps.LatLng(jobLatitude!, jobLongitude!),
              ],
              travelMode: google.maps.TravelMode.DRIVING,
              unitSystem: google.maps.UnitSystem.IMPERIAL,
            },
            (response, status) => {
              if (status !== 'OK' || !response) return;
              const element = response.rows?.[0]?.elements?.[0];
              if (
                !element ||
                element.status !== 'OK' ||
                !element.distance ||
                !element.duration
              ) {
                return;
              }
              setDriveInfo({
                distanceText: element.distance.text,
                durationText: element.duration.text,
              });
            }
          );
        } catch {
          // Distance Matrix throws if Maps SDK isn't fully ready —
          // silent because the card still renders the map.
        }
      },
      () => {
        // Geolocation denied — leave driveInfo null.
      },
      { timeout: 10_000, maximumAge: 5 * 60 * 1000 }
    );
  }, [hasCoords, jobLatitude, jobLongitude]);

  useEffect(() => {
    // Re-run when the job coordinates change. The map-load callback
    // also triggers this, but the SDK might already be initialised
    // (e.g. when navigating between job details), so we kick off a
    // computation eagerly too.
    if (typeof google !== 'undefined') {
      computeDriveInfo();
    }
  }, [computeDriveInfo]);

  if (!hasAnyLocation) return null;

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${jobLatitude},${jobLongitude}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(jobLocation || '')}&travelmode=driving`;

  return (
    <div className='card' style={{ padding: 0, overflow: 'hidden' }}>
      {hasCoords ? (
        <div style={{ height: 180, position: 'relative' }}>
          <DynamicGoogleMap
            center={{ lat: jobLatitude!, lng: jobLongitude! }}
            zoom={15}
            onMapLoad={(map) => {
              if (typeof google === 'undefined') return;
              new google.maps.Marker({
                position: {
                  lat: jobLatitude!,
                  lng: jobLongitude!,
                },
                map,
              });
              // Kick off Distance Matrix once the Maps SDK is
              // definitely ready.
              computeDriveInfo();
            }}
            style={{ width: '100%', height: '100%' }}
          />
          {driveInfo ? (
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                padding: '4px 10px',
                borderRadius: 9999,
                background: 'var(--me-surface)',
                border: '1px solid var(--me-line)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--me-ink)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              {driveInfo.distanceText} · {driveInfo.durationText} drive
            </div>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            height: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--me-bg-2)',
            color: 'var(--me-ink-3)',
            fontSize: 13,
          }}
        >
          Address-only — open in Maps for directions.
        </div>
      )}
      <div
        className='col'
        style={{
          gap: 10,
          padding: 14,
          borderTop: '1px solid var(--me-line)',
        }}
      >
        {jobLocation ? (
          <div className='col' style={{ gap: 2 }}>
            <span className='t-meta'>Job address</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{jobLocation}</span>
          </div>
        ) : null}
        <a
          href={directionsUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='btn btn-primary btn-sm'
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <Navigation size={13} strokeWidth={1.75} />
          Navigate
        </a>
      </div>
    </div>
  );
}
