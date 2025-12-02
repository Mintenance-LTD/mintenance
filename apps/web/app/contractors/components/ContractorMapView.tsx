'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';
import { GoogleMapContainer } from '@/components/maps';
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

/**
 * Contractor Map Marker Interface
 */
interface ContractorMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rating: number;
  distance?: number;
  skills: string[];
  profileImage?: string;
  city?: string;
}

interface ContractorMapData {
  id: string;
  first_name?: string;
  last_name?: string;
  latitude?: string | number;
  longitude?: string | number;
  is_visible_on_map?: boolean;
  rating?: number;
  category?: string;
  profile_image_url?: string;
  city?: string;
  company_name?: string;
  bio?: string;
  email_verified?: boolean;
  total_jobs_completed?: number;
  is_available?: boolean;
  contractor_skills?: Array<{ skill_name: string }>;
  [key: string]: unknown;
}

interface ContractorMapViewProps {
  contractors: ContractorMapData[];
}

/**
 * Contractor Map View Component
 * Shows contractors on an interactive map with markers
 */
export function ContractorMapView({ contractors: initialContractors }: ContractorMapViewProps) {
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
          .from('users')
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

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
          algorithm: new (MarkerClusterer as any).SuperClusterAlgorithm({ radius: 100 }),
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
      serviceAreasData.forEach(([contractorId, areas]: [string, any[]]) => {
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

  const renderContractorCard = (contractor: ContractorMarker) => {
    const distance = userLocation
      ? calculateDistance(
          userLocation.lat,
          userLocation.lng,
          contractor.latitude,
          contractor.longitude
        )
      : null;

    return (
      <button
        type="button"
        aria-label={`View profile for ${contractor.name}, rated ${contractor.rating} stars${distance ? `, ${distance.toFixed(1)} km away` : ''}`}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: theme.spacing.md,
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: '12px',
          border: `1px solid ${theme.colors.border}`,
          marginBottom: theme.spacing.sm,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => setSelectedContractor(contractor)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = theme.colors.primary;
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = theme.colors.border;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '20px',
            }}
          >
            {contractor.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.text,
                marginBottom: 4,
              }}
            >
              {contractor.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="star" size={14} color={theme.colors.warning} />
                <span style={{ color: theme.colors.textSecondary }}>{contractor.rating.toFixed(1)}</span>
              </div>
              {distance && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon name="dot" size={8} color={theme.colors.textSecondary} />
                  <Icon name="mapPin" size={14} color={theme.colors.textSecondary} />
                  <span style={{ color: theme.colors.textSecondary }}>
                    {distance.toFixed(1)} km
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </button>
    );
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
          <GoogleMapContainer
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
        <div
          style={{
            position: 'absolute',
            top: theme.spacing.md,
            left: theme.spacing.md,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.lg,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(10px)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <Icon name="map" size={20} color={theme.colors.primary} />
            <span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text }}>
              {contractors.length} contractors
            </span>
          </div>
          <button
            onClick={() => setShowServiceAreas(!showServiceAreas)}
            disabled={loadingServiceAreas}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`, // Touch-friendly padding
              minHeight: '44px', // Touch target size
              backgroundColor: showServiceAreas ? theme.colors.primary : theme.colors.backgroundSecondary,
              color: showServiceAreas ? 'white' : theme.colors.text,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: loadingServiceAreas ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              WebkitTapHighlightColor: 'transparent', // Remove tap highlight on mobile
              opacity: loadingServiceAreas ? 0.6 : 1,
            }}
            aria-label={showServiceAreas ? 'Hide service areas' : 'Show service areas'}
            aria-busy={loadingServiceAreas}
            role="switch"
            aria-checked={showServiceAreas}
          >
            {loadingServiceAreas ? (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Loading...
              </>
            ) : (
              <>
                <Icon name={showServiceAreas ? 'eye' : 'eyeOff'} size={14} />
                {showServiceAreas ? 'Hide' : 'Show'} Coverage Areas
              </>
            )}
          </button>
        </div>
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
                  {renderContractorCard(contractor)}
                </li>
              ))}
            </ul>
          )}
        </nav>
      </div>

      {/* Selected Contractor Modal */}
      {selectedContractor && (
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
          onClick={() => setSelectedContractor(null)}
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
                {selectedContractor.name.charAt(0).toUpperCase()}
              </div>
              <h2
                style={{
                  fontSize: theme.typography.fontSize['2xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.text,
                  marginBottom: theme.spacing.sm,
                }}
              >
                {selectedContractor.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: theme.typography.fontSize.lg }}>
                <Icon name="star" size={20} color={theme.colors.warning} />
                <span style={{ color: theme.colors.textSecondary }}>{selectedContractor.rating.toFixed(1)}</span>
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
                  <span>{selectedContractor.city || 'Location not specified'}</span>
                </div>
                {userLocation && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.colors.textSecondary }}>
                    <Icon name="map" size={16} color={theme.colors.textSecondary} />
                    <span>
                      {calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        selectedContractor.latitude,
                        selectedContractor.longitude
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
                onClick={() => router.push(`/contractor/${selectedContractor.id}`)}
              >
                View Full Profile
              </Button>
              <Button variant="outline" fullWidth onClick={() => setSelectedContractor(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
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

