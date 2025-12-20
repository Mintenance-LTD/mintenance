'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
  is_sharing_location: boolean;
}

interface LocationTrackingProps {
  jobId: string;
  contractorId: string | null;
}

export function LocationTracking({ jobId, contractorId }: LocationTrackingProps) {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (contractorId) {
      fetchLocation();
      // Poll for location updates every 5 seconds
      const interval = setInterval(fetchLocation, 5000);
      return () => clearInterval(interval);
    }
  }, [contractorId, jobId]);

  const fetchLocation = async () => {
    if (!contractorId) return;

    try {
      const response = await fetch(`/api/contractors/${contractorId}/location?job_id=${jobId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setLocation(null);
          return;
        }
        throw new Error('Failed to fetch location');
      }
      const data = await response.json();
      setLocation(data.location);
      setError(null);
    } catch (err) {
      // Don't show error if location sharing is just not enabled
      if (err instanceof Error && !err.message.includes('404')) {
        setError(err.message);
      }
    }
  };

  const handleRequestLocation = async () => {
    setIsRequesting(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/request-location`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request location');
      }

      setRequestSent(true);
      alert('Location sharing request sent to contractor. They will be notified.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to request location');
    } finally {
      setIsRequesting(false);
    }
  };

  if (!contractorId) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
      }}>
        <div style={{ textAlign: 'center', color: theme.colors.textSecondary }}>
          <Icon name="mapPin" size={48} color={theme.colors.textTertiary} />
          <p style={{ marginTop: theme.spacing[4], marginBottom: 0 }}>
            No contractor assigned yet. Assign a contractor to enable location tracking.
          </p>
        </div>
      </div>
    );
  }

  if (!location && !requestSent) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
      }}>
        <div style={{ textAlign: 'center' }}>
          <Icon name="mapPin" size={48} color={theme.colors.textTertiary} />
          <h3 style={{
            marginTop: theme.spacing[4],
            marginBottom: theme.spacing[2],
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}>
            Location Tracking Not Available
          </h3>
          <p style={{
            marginBottom: theme.spacing[4],
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.base,
          }}>
            Request location sharing from the contractor to track their location in real-time.
          </p>
          <button
            onClick={handleRequestLocation}
            disabled={isRequesting}
            style={{
              padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
              backgroundColor: theme.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              cursor: isRequesting ? 'not-allowed' : 'pointer',
              opacity: isRequesting ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              margin: '0 auto',
            }}
          >
            {isRequesting ? (
              <>
                <Icon name="loader" size={20} color="white" />
                Sending Request...
              </>
            ) : (
              <>
                <Icon name="mapPin" size={20} color="white" />
                Request Location Sharing
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (requestSent && !location) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
      }}>
        <div style={{ textAlign: 'center' }}>
          <Icon name="checkCircle" size={48} color={theme.colors.success} />
          <h3 style={{
            marginTop: theme.spacing[4],
            marginBottom: theme.spacing[2],
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}>
            Request Sent
          </h3>
          <p style={{
            marginBottom: 0,
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.base,
          }}>
            Location sharing request has been sent to the contractor. They will be notified and can enable sharing when ready.
          </p>
        </div>
      </div>
    );
  }

  if (!location) return null;

  const googleMapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
  const lastUpdate = new Date(location.timestamp);
  const minutesAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);

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
        <h3 style={{
          margin: 0,
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}>
          <Icon name="mapPin" size={24} color={theme.colors.primary} />
          Contractor Location
        </h3>
        <span style={{
          padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
          borderRadius: theme.borderRadius.full,
          backgroundColor: theme.colors.success + '20',
          color: theme.colors.success,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[1],
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: theme.colors.success,
            animation: 'pulse 2s infinite',
          }} />
          Live
        </span>
      </div>

      {/* Map Embed */}
      <div style={{
        width: '100%',
        height: '300px',
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        marginBottom: theme.spacing[4],
        border: `1px solid ${theme.colors.border}`,
      }}>
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0 }}
          src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=${location.latitude},${location.longitude}&zoom=15`}
          allowFullScreen
        />
      </div>

      {/* Location Details */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[3],
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[1],
            }}>
              Coordinates
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textPrimary,
              fontFamily: 'monospace',
            }}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </div>
          </div>
          {location.accuracy && (
            <div>
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing[1],
              }}>
                Accuracy
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
              }}>
                ±{Math.round(location.accuracy)}m
              </div>
            </div>
          )}
        </div>

        <div style={{
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}>
          <Icon name="clock" size={16} color={theme.colors.textSecondary} />
          Last updated {minutesAgo < 1 ? 'just now' : `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`}
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing[2],
            padding: theme.spacing[3],
            backgroundColor: theme.colors.primary,
            color: 'white',
            borderRadius: theme.borderRadius.md,
            textDecoration: 'none',
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <Icon name="externalLink" size={20} color="white" />
          Open in Google Maps
        </a>
      </div>

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

