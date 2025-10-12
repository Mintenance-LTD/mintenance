'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';

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

interface ContractorMapViewProps {
  contractors: any[];
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
          console.warn('Geolocation not available:', error);
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
          .filter((c: any) => c.latitude && c.longitude && c.is_visible_on_map !== false)
          .map((contractor: any) => ({
            id: contractor.id,
            name: `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || 'Contractor',
            latitude: parseFloat(contractor.latitude),
            longitude: parseFloat(contractor.longitude),
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
          .filter((contractor: any) => contractor.is_visible_on_map !== false)
          .map((contractor: any) => ({
            id: contractor.id,
            name: `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || 'Contractor',
            latitude: parseFloat(contractor.latitude),
            longitude: parseFloat(contractor.longitude),
            rating: contractor.rating || 0,
            skills: [],
            profileImage: contractor.profile_image_url,
            city: contractor.city,
          }));

        setContractors(markers);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading contractors:', error);
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
      <div
        key={contractor.id}
        style={{
          padding: theme.spacing.md,
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.md,
          border: `1px solid ${theme.colors.border}`,
          marginBottom: theme.spacing.sm,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => setSelectedContractor(contractor)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = theme.colors.primary;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = theme.colors.border;
          e.currentTarget.style.transform = 'translateY(0)';
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
      </div>
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
    <div style={{ display: 'flex', gap: theme.spacing.lg, height: 700 }}>
      {/* Map Container (Left Side - 70%) */}
      <div style={{ flex: '0 0 70%' }}>
        <div
          style={{
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          {/* Map Placeholder with Contractor Markers */}
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#e3e8ef',
                backgroundImage: `
                  linear-gradient(0deg, transparent 24%, rgba(0, 0, 0, .05) 25%, rgba(0, 0, 0, .05) 26%, transparent 27%, transparent 74%, rgba(0, 0, 0, .05) 75%, rgba(0, 0, 0, .05) 76%, transparent 77%, transparent),
                  linear-gradient(90deg, transparent 24%, rgba(0, 0, 0, .05) 25%, rgba(0, 0, 0, .05) 26%, transparent 27%, transparent 74%, rgba(0, 0, 0, .05) 75%, rgba(0, 0, 0, .05) 76%, transparent 77%, transparent)
                `,
                backgroundSize: '50px 50px',
                borderRadius: theme.borderRadius.md,
              }}
            >
              {/* Contractor Markers */}
              {contractors.slice(0, 15).map((contractor, index) => (
                <div
                  key={contractor.id}
                  style={{
                    position: 'absolute',
                    left: `${15 + (index % 5) * 17}%`,
                    top: `${15 + Math.floor(index / 5) * 25}%`,
                    width: 40,
                    height: 40,
                    backgroundColor: theme.colors.primary,
                    borderRadius: '50%',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    transition: 'transform 0.2s',
                  }}
                  onClick={() => setSelectedContractor(contractor)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.2)';
                    e.currentTarget.style.zIndex = '10';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.zIndex = '1';
                  }}
                  title={contractor.name}
                >
                  {contractor.name.charAt(0)}
                </div>
              ))}
            </div>

            {/* Map Instructions */}
            <div
              style={{
                position: 'relative',
                zIndex: 5,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: theme.spacing.lg,
                borderRadius: theme.borderRadius.md,
                textAlign: 'center',
                maxWidth: 400,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
                <Icon name="map" size={24} color={theme.colors.primary} />
                <h3
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize.xl,
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.text,
                  }}
                >
                  Interactive Map
                </h3>
              </div>
              <p style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.md }}>
                Click on contractor pins or cards in the sidebar to view details
              </p>
              <div
                style={{
                  display: 'inline-block',
                  padding: theme.spacing.sm,
                  backgroundColor: theme.colors.primaryLight,
                  borderRadius: theme.borderRadius.sm,
                  color: theme.colors.primary,
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                {contractors.length} contractors with geolocation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contractor List (Right Side - 30%) */}
      <div style={{ flex: '0 0 30%' }}>
        <div
          style={{
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            height: '100%',
            overflowY: 'auto',
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <h2
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
            <p style={{ color: theme.colors.textSecondary, textAlign: 'center', padding: theme.spacing.xl }}>
              No contractors with location data
            </p>
          ) : (
            contractors.map((contractor) => renderContractorCard(contractor))
          )}
        </div>
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
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xl,
              maxWidth: 500,
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
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

