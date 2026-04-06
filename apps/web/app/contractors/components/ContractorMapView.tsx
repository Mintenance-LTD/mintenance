'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { DynamicGoogleMap } from '@/components/maps';
import {
  createContractorMarker,
  createContractorInfoWindow,
  calculateBounds,
  fitMapToBounds,
  createRecenterControl,
  clearMarkers,
  clearCircles,
  createServiceAreaCircle,
} from '@/lib/maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { ContractorMarker, ContractorMapData } from './ContractorMapView/types';
import { MapContractorCard } from './ContractorMapView/MapContractorCard';
import { MapInfoCard } from './ContractorMapView/MapInfoCard';
import { ContractorDetailsModal } from './ContractorMapView/ContractorDetailsModal';

interface ContractorMapViewProps {
  contractors: ContractorMapData[];
}

/**
 * Contractor Map View Component
 * Shows contractors on an interactive map with markers
 */
export function ContractorMapView(props: ContractorMapViewProps) {
  // Defensive prop destructuring with defaults to prevent test crashes
  const {
    contractors: initialContractors = [],
  } = props || {};
  const [loading, setLoading] = useState(false);
  const [contractors, setContractors] = useState<ContractorMarker[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<ContractorMarker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<Map<string, google.maps.InfoWindow>>(new Map());
  const markerClustererRef = useRef<MarkerClusterer | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const [showServiceAreas, setShowServiceAreas] = useState(true);
  const [loadingServiceAreas, setLoadingServiceAreas] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUserLocation();
    loadContractors();
  }, [initialContractors]);

  const loadUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          logger.warn('Geolocation not available', {
            service: 'contractor-map',
            error: error.message || String(error),
            code: error.code,
          });
          // Default to London
          setUserLocation({ lat: 51.5074, lng: -0.1278 });
        }
      );
    } else {
      setUserLocation({ lat: 51.5074, lng: -0.1278 });
    }
  };

  const loadContractors = async () => {
    try {
      setLoading(true);

      // Transform initial contractors or fetch from database
      if (initialContractors && initialContractors.length > 0) {
        const markers: ContractorMarker[] = initialContractors
          .filter((c: ContractorMapData) => c.latitude && c.longitude && c.is_visible_on_map !== false)
          .map((contractor: ContractorMapData) => ({
            id: contractor.id,
            name: `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || 'Contractor',
            latitude: typeof contractor.latitude === 'string' ? parseFloat(contractor.latitude) : (contractor.latitude as number),
            longitude: typeof contractor.longitude === 'string' ? parseFloat(contractor.longitude) : (contractor.longitude as number),
            rating: contractor.rating || 0,
            skills: [],
            profileImage: contractor.profile_image_url,
            city: contractor.city,
          }));
        setContractors(markers);
      } else {
        // Fetch from database if not provided
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, latitude, longitude, rating, profile_image_url, city, is_visible_on_map')
          .eq('role', 'contractor')
          .eq('is_visible_on_map', true)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (error) throw error;

        const markers: ContractorMarker[] = (data || [])
          .filter((contractor: ContractorMapData) => contractor.is_visible_on_map !== false && contractor.latitude && contractor.longitude)
          .map((contractor: ContractorMapData) => ({
            id: contractor.id,
            name: `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || 'Contractor',
            latitude: typeof contractor.latitude === 'string' ? parseFloat(contractor.latitude) : (contractor.latitude as number),
            longitude: typeof contractor.longitude === 'string' ? parseFloat(contractor.longitude) : (contractor.longitude as number),
            rating: contractor.rating || 0,
            skills: [],
            profileImage: contractor.profile_image_url,
            city: contractor.city,
          }));

        setContractors(markers);
      }
      setLoading(false);
    } catch (error) {
      logger.error('Error loading contractors:', error);
      setMapError('Failed to load contractors on map');
      setLoading(false);
    }
  };

  /**
   * Handle map load and create markers for all contractors
   * No 15-contractor limit - show all!
   */
  const handleMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);

      // Clear any existing markers, clusterer, and circles
      if (markerClustererRef.current) {
        markerClustererRef.current.clearMarkers();
        markerClustererRef.current = null;
      }
      clearMarkers(markersRef.current);
      clearCircles(circlesRef.current);
      infoWindowsRef.current.clear();
      markersRef.current = [];
      circlesRef.current = [];

      // Create markers for ALL contractors (no limit!)
      contractors.forEach((contractor) => {
        const marker = createContractorMarker(
          mapInstance,
          {
            id: contractor.id,
            name: contractor.name,
            latitude: contractor.latitude,
            longitude: contractor.longitude,
            rating: contractor.rating,
            city: contractor.city,
            profileImage: contractor.profileImage,
          },
          () => {
            // On marker click, select contractor (opens modal)
            setSelectedContractor(contractor);
          }
        );

        // Create info window for hover
        const infoWindow = createContractorInfoWindow({
          id: contractor.id,
          name: contractor.name,
          latitude: contractor.latitude,
          longitude: contractor.longitude,
          rating: contractor.rating,
          city: contractor.city,
        });

        // Show info window on marker hover
        marker.addListener('mouseover', () => {
          // Close all other info windows
          infoWindowsRef.current.forEach((iw) => iw.close());
          infoWindow.open(mapInstance, marker);
        });

        marker.addListener('mouseout', () => {
          infoWindow.close();
        });

        markersRef.current.push(marker);
        infoWindowsRef.current.set(contractor.id, infoWindow);
      });

      // Implement marker clustering for performance (20+ contractors)
      if (contractors.length >= 20) {
        markerClustererRef.current = new MarkerClusterer({
          map: mapInstance,
          markers: markersRef.current,
          algorithm: new ((MarkerClusterer as unknown as Record<string, unknown>).SuperClusterAlgorithm as new (opts: { radius: number }) => import('@googlemaps/markerclusterer').Algorithm)({ radius: 100 }),
        });
        logger.info(`✅ Marker clustering enabled for ${contractors.length} contractors`);
      }

      // Fit map to show all contractors
      if (contractors.length > 0) {
        const bounds = calculateBounds(
          contractors.map((c) => ({
            lat: c.latitude,
            lng: c.longitude,
          }))
        );

        if (bounds) {
          fitMapToBounds(mapInstance, bounds, 50);
        }
      }

      // Add recenter control if we have user location
      if (userLocation) {
        const recenterControl = createRecenterControl(mapInstance, userLocation);
        mapInstance.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(recenterControl);
      }

      // Fetch and display service areas for all contractors
      if (showServiceAreas && contractors.length > 0) {
        fetchAndDisplayServiceAreas(mapInstance, contractors);
      }
    },
    [contractors, userLocation, showServiceAreas]
  );

  /**
   * Fetch service areas for contractors and display as circles
   */
  const fetchAndDisplayServiceAreas = async (
    mapInstance: google.maps.Map,
    contractorsList: ContractorMarker[]
  ) => {
    setLoadingServiceAreas(true);
    try {
      const contractorIds = contractorsList.map((c) => c.id);

      const response = await fetch('/api/contractors/service-areas-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractorIds }),
      });

      if (!response.ok) {
        logger.warn('Failed to fetch service areas');
        return;
      }

      const serviceAreasData = await response.json();

      // Draw circles for each service area
      serviceAreasData.forEach(([contractorId, areas]: [string, ({ id: string; latitude: number; longitude: number; radius_km: number; is_active: boolean; city: string; state: string })[]]) => {
        areas.forEach((area) => {
          const circle = createServiceAreaCircle(mapInstance, {
            id: area.id,
            latitude: area.latitude,
            longitude: area.longitude,
            radius_km: area.radius_km,
            is_active: area.is_active,
            city: area.city,
            state: area.state,
          });

          circlesRef.current.push(circle);
        });
      });

      logger.info(`✅ Displayed ${circlesRef.current.length} service area circles`);
    } catch (error) {
      logger.error('Error fetching service areas:', error);
      // Service areas are optional - don't block user experience
    } finally {
      setLoadingServiceAreas(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: theme.spacing.xl }}>
        <div
          style={{
            width: 50,
            height: 50,
            border: `4px solid ${theme.colors.border}`,
            borderTop: `4px solid ${theme.colors.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <p style={{ color: theme.colors.textSecondary }}>Loading map...</p>
      </div>
    );
  }

  if (mapError) {
    return (
      <div style={{ textAlign: 'center', padding: theme.spacing.xl }}>
        <p style={{ color: theme.colors.error, marginBottom: theme.spacing.md }}>
          {mapError}
        </p>
        <Button onClick={loadContractors}>Try Again</Button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: theme.spacing.lg,
        height: 700,
      }}
      className="contractor-map-view"
    >
      <style jsx>{`
        @media (max-width: 1024px) {
          .contractor-map-view {
            flex-direction: column !important;
            height: auto !important;
          }
          .map-container {
            flex: 1 1 auto !important;
            min-height: 400px !important;
          }
          .contractor-list {
            flex: 1 1 auto !important;
            max-height: 400px !important;
            overflow-y: auto !important;
          }
        }
        @media (max-width: 768px) {
          .map-container {
            min-height: 300px !important;
          }
          .contractor-list {
            max-height: 300px !important;
          }
        }
      `}</style>
      {/* Real Google Maps Container (Left Side - 70%) */}
      <div style={{ flex: '0 0 70%', position: 'relative' }} className="map-container">
        <div
          role="region"
          aria-label="Interactive map showing contractor locations and service areas"
          tabIndex={0}
        >
          <DynamicGoogleMap
            center={userLocation || { lat: 51.5074, lng: -0.1278 }}
            zoom={10}
            onMapLoad={handleMapLoad}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '20px',
              overflow: 'hidden',
              border: `1px solid ${theme.colors.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          />
        </div>

        {/* Floating info card */}
        <MapInfoCard
          contractorCount={contractors.length}
          showServiceAreas={showServiceAreas}
          loadingServiceAreas={loadingServiceAreas}
          onToggleServiceAreas={() => setShowServiceAreas(!showServiceAreas)}
        />
      </div>

      {/* Contractor List (Right Side - 30%) */}
      <div style={{ flex: '0 0 30%' }} className="contractor-list">
        <nav
          aria-labelledby="contractor-list-heading"
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: '20px',
            padding: theme.spacing.md,
            height: '100%',
            overflowY: 'auto',
            border: `1px solid ${theme.colors.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          }}
        >
          <h2
            id="contractor-list-heading"
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing.md,
              position: 'sticky',
              top: 0,
              backgroundColor: theme.colors.background,
              paddingBottom: theme.spacing.sm,
              borderBottom: `1px solid ${theme.colors.border}`,
            }}
          >
            Nearby ({contractors.length})
          </h2>
          {contractors.length === 0 ? (
            <p
              style={{ color: theme.colors.textSecondary, textAlign: 'center', padding: theme.spacing.xl }}
              role="status"
              aria-live="polite"
            >
              No contractors with location data
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {contractors.map((contractor) => (
                <li key={contractor.id}>
                  <MapContractorCard
                    contractor={contractor}
                    userLocation={userLocation}
                    onSelect={setSelectedContractor}
                  />
                </li>
              ))}
            </ul>
          )}
        </nav>
      </div>

      {/* Selected Contractor Modal */}
      {selectedContractor && (
        <ContractorDetailsModal
          contractor={selectedContractor}
          userLocation={userLocation}
          onClose={() => setSelectedContractor(null)}
          onViewProfile={(id) => router.push(`/contractor/${id}`)}
        />
      )}

      {/* CSS Animation */}
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
