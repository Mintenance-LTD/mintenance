'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
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
}

/**
 * Contractor Map Page
 * Shows contractors on an interactive map for homeowners
 */
export default function ContractorMapPage() {
  const [loading, setLoading] = useState(true);
  const [contractors, setContractors] = useState<ContractorMarker[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<ContractorMarker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Find Contractors Near You | Mintenance';
  }, []);

  useEffect(() => {
    loadUserLocation();
    loadContractors();
  }, []);

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
      // Default to London
      setUserLocation({ lat: 51.5074, lng: -0.1278 });
    }
  };

  const loadContractors = async () => {
    try {
      setLoading(true);
      
      // Fetch contractors with geolocation data
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, latitude, longitude, rating, profile_image_url')
        .eq('role', 'contractor')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;

      // Transform to markers
      const markers: ContractorMarker[] = (data || []).map((contractor: any) => ({
        id: contractor.id,
        name: `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || 'Contractor',
        latitude: parseFloat(contractor.latitude),
        longitude: parseFloat(contractor.longitude),
        rating: contractor.rating || 0,
        skills: [],
        profileImage: contractor.profile_image_url,
      }));

      setContractors(markers);
      setLoading(false);
    } catch (error) {
      console.error('Error loading contractors:', error);
      setMapError('Failed to load contractors');
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
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.text,
                marginBottom: theme.spacing.xs,
              }}
            >
              {contractor.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <span style={{ color: theme.colors.warning }}>⭐ {contractor.rating.toFixed(1)}</span>
              {distance && (
                <span style={{ color: theme.colors.textSecondary }}>
                  • {distance.toFixed(1)} km away
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm">
            View Profile
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.colors.backgroundSecondary,
        padding: theme.spacing.lg,
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: 1400, margin: '0 auto', marginBottom: theme.spacing.lg }}>
        <h1
          style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            marginBottom: theme.spacing.sm,
          }}
        >
          Find Contractors Near You
        </h1>
        <p style={{ color: theme.colors.textSecondary }}>
          Explore verified contractors in your area on the map
        </p>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: theme.spacing.lg }}>
        {/* Map Container (Left Side - 70%) */}
        <div style={{ flex: '0 0 70%' }}>
          <div
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xl,
              height: 700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${theme.colors.border}`,
            }}
          >
            {loading ? (
              <div style={{ textAlign: 'center' }}>
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
                <p style={{ color: theme.colors.textSecondary }}>Loading contractors...</p>
              </div>
            ) : mapError ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: theme.colors.error, marginBottom: theme.spacing.md }}>
                  {mapError}
                </p>
                <Button onClick={loadContractors}>Try Again</Button>
              </div>
            ) : (
              <>
                {/* Map Placeholder - Would integrate React Google Maps here */}
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
                    {/* Sample Map Markers */}
                    {contractors.map((contractor, index) => (
                      <div
                        key={contractor.id}
                        style={{
                          position: 'absolute',
                          left: `${20 + (index % 5) * 15}%`,
                          top: `${20 + Math.floor(index / 5) * 20}%`,
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
                    <h3
                      style={{
                        fontSize: theme.typography.fontSize.xl,
                        fontWeight: theme.typography.fontWeight.bold,
                        color: theme.colors.text,
                        marginBottom: theme.spacing.sm,
                      }}
                    >
                      🗺️ Interactive Map Coming Soon
                    </h3>
                    <p style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.md }}>
                      Click on contractor cards in the sidebar to view their location and details
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
                      {contractors.length} contractors found in your area
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contractor List (Right Side - 30%) */}
        <div style={{ flex: '0 0 30%' }}>
          <div
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              height: 700,
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
              Nearby Contractors ({contractors.length})
            </h2>
            {contractors.length === 0 ? (
              <p style={{ color: theme.colors.textSecondary, textAlign: 'center', padding: theme.spacing.xl }}>
                No contractors found in your area
              </p>
            ) : (
              contractors.map((contractor) => renderContractorCard(contractor))
            )}
          </div>
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
              <div style={{ fontSize: theme.typography.fontSize.lg, color: theme.colors.warning }}>
                ⭐ {selectedContractor.rating.toFixed(1)}
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
              <p style={{ color: theme.colors.textSecondary }}>
                📍 Lat: {selectedContractor.latitude.toFixed(4)}, Lng: {selectedContractor.longitude.toFixed(4)}
                {userLocation && (
                  <>
                    <br />
                    📏 Distance:{' '}
                    {calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      selectedContractor.latitude,
                      selectedContractor.longitude
                    ).toFixed(1)}{' '}
                    km away
                  </>
                )}
              </p>
            </div>

            <div style={{ display: 'flex', gap: theme.spacing.sm }}>
              <Button variant="primary" fullWidth onClick={() => alert('Contact feature coming soon!')}>
                Contact Contractor
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

