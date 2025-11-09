'use client';

import { useEffect, useState, useRef } from 'react';
import { GoogleMapContainer } from '@/components/maps/GoogleMapContainer';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface JobLocationMapProps {
  jobLocation: string;
  jobId: string;
}

interface ContractorMarker {
  id: string;
  name: string;
  email: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  profile_image_url?: string;
}

export function JobLocationMap({ jobLocation, jobId }: JobLocationMapProps) {
  const [jobCoords, setJobCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyContractors, setNearbyContractors] = useState<ContractorMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<Map<string, google.maps.InfoWindow>>(new Map());

  useEffect(() => {
    async function geocodeJobLocation() {
      try {
        // Geocode job location
        const geocodeResponse = await fetch(
          `/api/geocode?address=${encodeURIComponent(jobLocation)}`
        );
        if (!geocodeResponse.ok) {
          throw new Error('Failed to geocode job location');
        }
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.latitude && geocodeData.longitude) {
          setJobCoords({
            lat: geocodeData.latitude,
            lng: geocodeData.longitude,
          });
        } else {
          throw new Error('No coordinates found');
        }

        // Fetch nearby contractors
        const contractorsResponse = await fetch(
          `/api/jobs/${jobId}/nearby-contractors?lat=${geocodeData.latitude}&lng=${geocodeData.longitude}`
        );
        if (contractorsResponse.ok) {
          const contractorsData = await contractorsResponse.json();
          setNearbyContractors(contractorsData.contractors || []);
        }
      } catch (err) {
        console.error('Error geocoding location:', err);
        setError('Failed to load map location');
      } finally {
        setLoading(false);
      }
    }

    if (jobLocation) {
      geocodeJobLocation();
    } else {
      setLoading(false);
    }
  }, [jobLocation, jobId]);

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapRef.current || !jobCoords) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current.forEach(window => window.close());
    infoWindowsRef.current.clear();

    // Add job location marker (red pin)
    const jobMarker = new google.maps.Marker({
      position: jobCoords,
      map: mapRef.current,
      title: 'Job Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#10B981', // Green for jobs/homeowners from company theme
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
    });

    const jobInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px;">
          <strong style="color: #111827; font-size: 14px;">Job Location</strong>
          <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 12px;">${jobLocation}</p>
        </div>
      `,
    });

    jobMarker.addListener('click', () => {
      infoWindowsRef.current.forEach(window => window.close());
      jobInfoWindow.open(mapRef.current, jobMarker);
    });

    markersRef.current.push(jobMarker);
    infoWindowsRef.current.set('job', jobInfoWindow);

    // Add contractor markers (dark blue pins)
    nearbyContractors.forEach((contractor) => {
      if (!contractor.latitude || !contractor.longitude) return;

      const contractorMarker = new google.maps.Marker({
        position: {
          lat: contractor.latitude,
          lng: contractor.longitude,
        },
        map: mapRef.current,
        title: contractor.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#1F2937', // Dark blue from company theme
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      const contractorInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <strong style="color: #111827; font-size: 14px;">${contractor.name}</strong>
            <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 12px;">${contractor.email}</p>
            ${contractor.location ? `<p style="margin: 4px 0 0 0; color: #6B7280; font-size: 12px;">${contractor.location}</p>` : ''}
          </div>
        `,
      });

      contractorMarker.addListener('click', () => {
        infoWindowsRef.current.forEach(window => window.close());
        contractorInfoWindow.open(mapRef.current, contractorMarker);
      });

      markersRef.current.push(contractorMarker);
      infoWindowsRef.current.set(contractor.id, contractorInfoWindow);
    });

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      mapRef.current.fitBounds(bounds);
      
      // Add padding
      const padding = 50;
      mapRef.current.fitBounds(bounds, padding);
    } else {
      // If no contractors, center on job location
      mapRef.current.setCenter(jobCoords);
      mapRef.current.setZoom(14);
    }
  };

  useEffect(() => {
    if (mapRef.current && jobCoords) {
      updateMarkers();
    }
  }, [jobCoords, nearbyContractors]);

  if (loading) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Icon name="refresh" size={32} color={theme.colors.textTertiary} />
          <p style={{ marginTop: theme.spacing[2], margin: 0, fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            Loading map...
          </p>
        </div>
      </div>
    );
  }

  if (error || !jobCoords) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Icon name="mapPin" size={48} color={theme.colors.textTertiary} />
          <p style={{ marginTop: theme.spacing[2], margin: 0, fontSize: theme.typography.fontSize.base, color: theme.colors.textSecondary }}>
            {error || 'Unable to load map location'}
          </p>
          {jobLocation && (
            <p style={{ marginTop: theme.spacing[1], margin: 0, fontSize: theme.typography.fontSize.sm, color: theme.colors.textTertiary }}>
              {jobLocation}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[6],
    }}>
      <h2 style={{
        margin: 0,
        marginBottom: theme.spacing[4],
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.textPrimary,
      }}>
        Job Location
      </h2>

      <div style={{
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        height: '400px',
        border: `1px solid ${theme.colors.border}`,
        marginBottom: theme.spacing[4],
      }}>
        <GoogleMapContainer
          center={jobCoords}
          zoom={13}
          onMapLoad={handleMapLoad}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: theme.spacing[4],
        flexWrap: 'wrap',
        padding: theme.spacing[3],
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.md,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#EF4444',
            border: '2px solid white',
          }} />
          <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            Job Location
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#3B82F6',
            border: '2px solid white',
          }} />
          <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            Nearby Contractors ({nearbyContractors.length})
          </span>
        </div>
      </div>
    </div>
  );
}

