'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@mintenance/shared';
import { theme } from '@/lib/theme';
import { ErrorBoundary } from '../ErrorBoundary';

interface GoogleMapContainerProps {
  center: { lat: number; lng: number };
  zoom?: number;
  onMapLoad?: (map: google.maps.Map) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * GoogleMapContainer Component
 * 
 * Reusable wrapper for Google Maps initialization
 * Handles loading, error states, and provides map instance via callback
 * 
 * @example
 * <GoogleMapContainer
 *   center={{ lat: 51.5074, lng: -0.1278 }}
 *   zoom={10}
 *   onMapLoad={(map) => {
 *     // Add markers, circles, etc.
 *   }}
 * />
 */
export function GoogleMapContainer(props: GoogleMapContainerProps): JSX.Element {
  return (
    <ErrorBoundary componentName="GoogleMapContainer">
      <GoogleMapContent {...props} />
    </ErrorBoundary>
  );
}

function GoogleMapContent({
  center,
  zoom = 10,
  onMapLoad,
  className,
  style,
  children,
}: GoogleMapContainerProps): JSX.Element {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    
    if (mapRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(zoom);
      setLoading(false);
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      logger.error('❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured');
      setError('Map configuration error. Please contact support.');
      setLoading(false);
      return;
    }

    const loadStartTime = performance.now();
    const scriptId = 'google-maps-script';
    let checkInterval: NodeJS.Timeout | null = null;

    // Initialize map function
    const initializeMap = () => {
      if (!mapRef.current) return;
      
      // Type assertion for google maps
      const google = (window as any).google;
      if (!google || !google.maps || !google.maps.Map) {
        logger.warn('Google Maps API not fully loaded yet');
        return;
      }

      try {
        const loadTime = performance.now() - loadStartTime;

        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        mapInstanceRef.current = mapInstance;
        setLoading(false);
        
        logger.info(`✅ Map loaded in ${loadTime.toFixed(0)}ms`);

        // Track performance
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'timing_complete', {
            name: 'map_load',
            value: Math.round(loadTime),
            event_category: 'Map Performance',
          });
        }

        onMapLoad?.(mapInstance);
      } catch (error) {
        logger.error('Error initializing map:', error);
        setError('Failed to initialize map');
        setLoading(false);
      }
    };

    // Check if Google Maps is already fully loaded
    const google = (window as any).google;
    if (google && google.maps && google.maps.Map) {
      initializeMap();
      return;
    }

    // Check if script is already being loaded
    if (document.getElementById(scriptId)) {
      // Wait for script to load and Maps library to be available
      checkInterval = setInterval(() => {
        const google = (window as any).google;
        if (google && google.maps && google.maps.Map) {
          if (checkInterval) clearInterval(checkInterval);
          initializeMap();
        }
      }, 100);
      
      return () => {
        if (checkInterval) clearInterval(checkInterval);
      };
    }

    // Create callback function name
    const callbackName = `initGoogleMap_${Date.now()}`;
    
    // Set up callback function
    (window as any)[callbackName] = () => {
      // Clean up callback
      delete (window as any)[callbackName];
      
      // Initialize map after callback fires (ensures Maps library is ready)
      setTimeout(() => {
        initializeMap();
      }, 100);
    };

    // Create and load script with callback
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=${callbackName}`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      logger.error('❌ Error loading Google Maps script');
      delete (window as any)[callbackName];
      setError('Failed to load map. Please try again.');
      setLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (checkInterval) clearInterval(checkInterval);
      // Clean up callback if component unmounts before script loads
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
      }
      // Don't remove script as it might be used by other components
    };
  }, [center.lat, center.lng, zoom, onMapLoad]);

  if (error) {
    return (
      <div
        style={{
          padding: theme.spacing[8],
          textAlign: 'center',
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.border}`,
          ...style,
        }}
        className={className}
      >
        <div
          style={{
            width: 48,
            height: 48,
            margin: '0 auto 16px',
            borderRadius: '50%',
            backgroundColor: theme.colors.error + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '24px' }}>⚠️</span>
        </div>
        <p
          style={{
            color: theme.colors.error,
            fontSize: theme.typography.fontSize.base,
            marginBottom: theme.spacing[4],
          }}
        >
          {error}
        </p>
        <button
          onClick={handleRetry}
          style={{
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            backgroundColor: theme.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: theme.borderRadius.md,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.primaryDark || '#1e3a8a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.primary;
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', ...style }} className={className}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.lg,
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: `4px solid ${theme.colors.border}`,
              borderTopColor: theme.colors.primary,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: theme.spacing[4],
            }}
          />
          <p
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.base,
            }}
          >
            Loading map...
          </p>
        </div>
      )}
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: theme.borderRadius.lg,
        }}
        role="region"
        aria-label="Interactive map"
        tabIndex={0}
      />
      {children}
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

