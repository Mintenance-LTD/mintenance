'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface LocationSharingProps {
  jobId: string;
  contractorId: string;
}

export function LocationSharing({ jobId, contractorId }: LocationSharingProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    // Check current sharing status
    checkSharingStatus();

    return () => {
      // Cleanup: stop watching location when component unmounts
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [jobId]);

  const checkSharingStatus = async () => {
    try {
      const response = await fetch(`/api/contractors/${contractorId}/location?job_id=${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setIsSharing(!!data.location?.is_sharing_location);
      }
    } catch (err) {
      // Ignore errors - location might not be set up yet
    }
  };

  const startLocationSharing = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Request permission and start watching
    const watchIdValue = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const response = await fetch(`/api/contractors/${contractorId}/location`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude || undefined,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed || undefined,
              job_id: jobId,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update location');
          }

          setIsSharing(true);
          setIsLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to share location');
          setIsLoading(false);
        }
      },
      (err) => {
        setError(`Location error: ${err.message}`);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    setWatchId(watchIdValue);
  };

  const stopLocationSharing = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/enable-location-sharing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to disable location sharing');
      }

      // Stop watching location
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }

      setIsSharing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop location sharing');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLocationSharing = async () => {
    if (isSharing) {
      await stopLocationSharing();
    } else {
      // First enable sharing on server, then start watching
      try {
        const response = await fetch(`/api/jobs/${jobId}/enable-location-sharing`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled: true }),
        });

        if (!response.ok) {
          throw new Error('Failed to enable location sharing');
        }

        startLocationSharing();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to enable location sharing');
        setIsLoading(false);
      }
    }
  };

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[6],
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing[4],
      }}>
        <div>
          <h3 style={{
            margin: 0,
            marginBottom: theme.spacing[1],
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}>
            <Icon name="mapPin" size={24} color={theme.colors.primary} />
            Location Sharing
          </h3>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}>
            Allow homeowner to track your location in real-time (like Uber)
          </p>
        </div>
        <div style={{
          padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
          borderRadius: theme.borderRadius.full,
          backgroundColor: isSharing ? theme.colors.success + '20' : theme.colors.textTertiary + '20',
          color: isSharing ? theme.colors.success : theme.colors.textSecondary,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[1],
        }}>
          {isSharing && (
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: theme.colors.success,
              animation: 'pulse 2s infinite',
            }} />
          )}
          {isSharing ? 'Sharing' : 'Not Sharing'}
        </div>
      </div>

      {error && (
        <div style={{
          padding: theme.spacing[3],
          backgroundColor: theme.colors.error + '20',
          borderRadius: theme.borderRadius.md,
          color: theme.colors.error,
          fontSize: theme.typography.fontSize.sm,
          marginBottom: theme.spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}>
          <Icon name="alertCircle" size={20} color={theme.colors.error} />
          {error}
        </div>
      )}

      <div style={{
        padding: theme.spacing[4],
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing[4],
      }}>
        <div style={{
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
          lineHeight: 1.6,
        }}>
          <p style={{ margin: 0, marginBottom: theme.spacing[2] }}>
            <strong>When enabled:</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: theme.spacing[5] }}>
            <li>Your location will be shared with the homeowner</li>
            <li>Location updates automatically every few seconds</li>
            <li>Homeowner can see your location on a map</li>
            <li>You can disable sharing at any time</li>
          </ul>
        </div>
      </div>

      <button
        onClick={toggleLocationSharing}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: theme.spacing[3],
          backgroundColor: isSharing ? theme.colors.error : theme.colors.primary,
          color: 'white',
          border: 'none',
          borderRadius: theme.borderRadius.md,
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.semibold,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing[2],
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.opacity = '0.9';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.opacity = '1';
          }
        }}
      >
        {isLoading ? (
          <>
            <Icon name="loader" size={20} color="white" />
            {isSharing ? 'Stopping...' : 'Starting...'}
          </>
        ) : (
          <>
            <Icon name={isSharing ? "x" : "mapPin"} size={20} color="white" />
            {isSharing ? 'Stop Sharing Location' : 'Start Sharing Location'}
          </>
        )}
      </button>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
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

