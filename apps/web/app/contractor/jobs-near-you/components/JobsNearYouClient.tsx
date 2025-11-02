'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMapContainer } from '@/components/maps/GoogleMapContainer';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { formatMoney } from '@/lib/utils/currency';

interface ContractorLocation {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
}

interface Job {
  id: string;
  title: string;
  description?: string;
  budget?: string;
  location?: string;
  category?: string;
  status: string;
  created_at: string;
  photos?: string[];
  required_skills?: string[] | null;
  homeowner_id: string;
  homeowner?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

interface JobWithDistance extends Job {
  distance?: number; // Distance in kilometers
  coordinates?: { lat: number; lng: number };
  requiredSkills?: string[] | null;
  matchedSkills?: string[]; // Skills that match contractor's skills
  skillMatchCount?: number; // Number of matching skills
}

interface JobsNearYouClientProps {
  contractorLocation: ContractorLocation;
  contractorSkills: string[];
  jobs: Job[];
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function JobsNearYouClient({
  contractorLocation,
  contractorSkills,
  jobs,
}: JobsNearYouClientProps) {
  const router = useRouter();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<Map<string, google.maps.InfoWindow>>(new Map());
  const [jobsWithDistance, setJobsWithDistance] = useState<JobWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractorCoords, setContractorCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Geocode contractor location if coordinates not available
  useEffect(() => {
    async function getContractorCoordinates() {
      if (contractorLocation.latitude && contractorLocation.longitude) {
        setContractorCoords({
          lat: contractorLocation.latitude,
          lng: contractorLocation.longitude,
        });
        return;
      }

      // If no coordinates, try to geocode city/country
      if (contractorLocation.city || contractorLocation.country) {
        try {
          const address = [
            contractorLocation.address,
            contractorLocation.city,
            contractorLocation.country,
          ]
            .filter(Boolean)
            .join(', ');

          const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.latitude && data.longitude) {
              setContractorCoords({
                lat: data.latitude,
                lng: data.longitude,
              });
            }
          }
        } catch (error) {
          console.error('Error geocoding contractor location:', error);
        }
      }
    }

    getContractorCoordinates();
  }, [contractorLocation]);

  // Geocode jobs, calculate distances, and match skills
  useEffect(() => {
    async function geocodeJobsAndCalculateDistances() {
      if (!contractorCoords) {
        setLoading(false);
        return;
      }

      const jobsWithCoords: JobWithDistance[] = [];

      for (const job of jobs) {
        if (!job.location) continue;

        try {
          const response = await fetch(`/api/geocode?address=${encodeURIComponent(job.location)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.latitude && data.longitude) {
              const distance = calculateDistance(
                contractorCoords.lat,
                contractorCoords.lng,
                data.latitude,
                data.longitude
              );

              // Calculate skill matches
              const jobRequiredSkills = job.required_skills || [];
              const matchedSkills = contractorSkills.filter(skill => 
                jobRequiredSkills.includes(skill)
              );
              const skillMatchCount = matchedSkills.length;

              jobsWithCoords.push({
                ...job,
                distance,
                coordinates: {
                  lat: data.latitude,
                  lng: data.longitude,
                },
                requiredSkills: jobRequiredSkills.length > 0 ? jobRequiredSkills : undefined,
                matchedSkills: matchedSkills.length > 0 ? matchedSkills : undefined,
                skillMatchCount,
              });
            }
          }
        } catch (error) {
          console.error(`Error geocoding job ${job.id}:`, error);
        }
      }

      // Sort by skill match count (descending), then by distance (ascending)
      // Jobs with matching skills appear first, then jobs without required skills, then others
      jobsWithCoords.sort((a, b) => {
        // Prioritize jobs with skill matches
        if ((a.skillMatchCount || 0) > 0 && (b.skillMatchCount || 0) === 0) return -1;
        if ((a.skillMatchCount || 0) === 0 && (b.skillMatchCount || 0) > 0) return 1;
        
        // If both have matches, sort by match count (descending)
        if ((a.skillMatchCount || 0) > 0 && (b.skillMatchCount || 0) > 0) {
          if (a.skillMatchCount !== b.skillMatchCount) {
            return (b.skillMatchCount || 0) - (a.skillMatchCount || 0);
          }
        }
        
        // Then sort by distance
        return (a.distance || Infinity) - (b.distance || Infinity);
      });
      
      setJobsWithDistance(jobsWithCoords);
      setLoading(false);
    }

    if (contractorCoords && jobs.length > 0) {
      geocodeJobsAndCalculateDistances();
    } else {
      setLoading(false);
    }
  }, [contractorCoords, jobs, contractorSkills]);

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapRef.current || !contractorCoords) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current.forEach((window) => window.close());
    infoWindowsRef.current.clear();

    // Add contractor marker (dark blue pin)
    const contractorMarker = new google.maps.Marker({
      position: contractorCoords,
      map: mapRef.current,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#1F2937', // Dark blue from company theme
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
    });

    const contractorInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px;">
          <strong style="color: #111827; font-size: 14px;">Your Location</strong>
          ${contractorLocation.city || contractorLocation.country
            ? `<p style="margin: 4px 0 0 0; color: #6B7280; font-size: 12px;">${[contractorLocation.city, contractorLocation.country].filter(Boolean).join(', ')}</p>`
            : ''}
        </div>
      `,
    });

    contractorMarker.addListener('click', () => {
      infoWindowsRef.current.forEach((window) => window.close());
      contractorInfoWindow.open(mapRef.current, contractorMarker);
    });

    markersRef.current.push(contractorMarker);
    infoWindowsRef.current.set('contractor', contractorInfoWindow);

    // Add job markers (red pins)
    jobsWithDistance.forEach((job) => {
      if (!job.coordinates) return;

      const jobMarker = new google.maps.Marker({
        position: job.coordinates,
        map: mapRef.current,
        title: job.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#10B981', // Green for homeowners/jobs from company theme
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      const homeownerName = job.homeowner
        ? `${job.homeowner.first_name || ''} ${job.homeowner.last_name || ''}`.trim() || job.homeowner.email
        : 'Unknown';

      const jobInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 250px;">
            <strong style="color: #111827; font-size: 14px;">${job.title}</strong>
            <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 12px;">${job.location || 'Location not specified'}</p>
            ${job.distance !== undefined
              ? `<p style="margin: 4px 0 0 0; color: #3B82F6; font-size: 12px; font-weight: 600;">${job.distance.toFixed(1)} km away</p>`
              : ''}
            ${job.budget
              ? `<p style="margin: 4px 0 0 0; color: #10B981; font-size: 12px; font-weight: 600;">${formatMoney(parseFloat(job.budget))}</p>`
              : ''}
            <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 11px;">Posted by: ${homeownerName}</p>
          </div>
        `,
      });

      jobMarker.addListener('click', () => {
        infoWindowsRef.current.forEach((window) => window.close());
        jobInfoWindow.open(mapRef.current, jobMarker);
      });

      markersRef.current.push(jobMarker);
      infoWindowsRef.current.set(job.id, jobInfoWindow);
    });

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markersRef.current.forEach((marker) => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      mapRef.current.fitBounds(bounds, 50);
    } else {
      mapRef.current.setCenter(contractorCoords);
      mapRef.current.setZoom(12);
    }
  };

  useEffect(() => {
    if (mapRef.current && jobsWithDistance.length > 0) {
      updateMarkers();
    }
  }, [jobsWithDistance, contractorCoords]);

  const center = contractorCoords || { lat: 51.5074, lng: -0.1278 }; // Default to London

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
        padding: theme.spacing[6],
        maxWidth: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: theme.spacing[4],
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}
          >
            Jobs Near You
          </h1>
          <p
            style={{
              margin: `${theme.spacing[2]} 0 0 0`,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}
          >
            {contractorLocation.city || contractorLocation.country
              ? `Showing jobs near ${[contractorLocation.city, contractorLocation.country].filter(Boolean).join(', ')}`
              : 'Find jobs in your area'}
          </p>
        </div>
      </div>

      {/* Map and Jobs List */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: theme.spacing[6],
          height: 'calc(100vh - 300px)',
          minHeight: '500px',
        }}
        className="jobs-near-you-grid"
      >
        <style jsx>{`
          .jobs-near-you-grid {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 24px;
            height: calc(100vh - 300px);
            min-height: 500px;
          }
          @media (max-width: 1024px) {
            .jobs-near-you-grid {
              grid-template-columns: 1fr !important;
              height: auto;
              min-height: 400px;
            }
          }
        `}</style>
        {/* Map */}
        <Card padding="none" style={{ overflow: 'hidden', position: 'relative' }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: theme.colors.textSecondary,
              }}
            >
              Loading map...
            </div>
          ) : contractorCoords ? (
            <GoogleMapContainer
              center={center}
              zoom={12}
              onMapLoad={handleMapLoad}
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: theme.spacing[8],
                textAlign: 'center',
                color: theme.colors.textSecondary,
              }}
            >
              <Icon name="mapPin" size={48} color={theme.colors.textTertiary} />
              <p style={{ marginTop: theme.spacing[4], fontSize: theme.typography.fontSize.lg }}>
                Location not available
              </p>
              <p style={{ marginTop: theme.spacing[2], fontSize: theme.typography.fontSize.sm }}>
                Please update your location in your profile to see jobs near you.
              </p>
            </div>
          )}
        </Card>

        {/* Jobs List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[4],
            overflowY: 'auto',
            paddingRight: theme.spacing[2],
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: theme.spacing[8],
                color: theme.colors.textSecondary,
              }}
            >
              Loading jobs...
            </div>
          ) : jobsWithDistance.length === 0 ? (
            <Card padding="lg">
              <div
                style={{
                  textAlign: 'center',
                  color: theme.colors.textSecondary,
                  padding: theme.spacing[4],
                }}
              >
                <Icon name="briefcase" size={48} color={theme.colors.textTertiary} />
                <p style={{ marginTop: theme.spacing[4], fontSize: theme.typography.fontSize.lg }}>
                  No jobs found
                </p>
                <p style={{ marginTop: theme.spacing[2], fontSize: theme.typography.fontSize.sm }}>
                  There are no open jobs in your area at the moment.
                </p>
              </div>
            </Card>
          ) : (
            jobsWithDistance.map((job) => (
              <Card
                key={job.id}
                padding="md"
                hover={true}
                onClick={() => router.push(`/contractor/bid/${job.id}`)}
                style={{
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[3] }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: theme.typography.fontSize.lg,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
                        marginBottom: theme.spacing[1],
                      }}
                    >
                      {job.title}
                    </h3>
                    {job.location && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing[1],
                          marginTop: theme.spacing[1],
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.textSecondary,
                        }}
                      >
                        <Icon name="mapPin" size={14} color={theme.colors.textSecondary} />
                        <span>{job.location}</span>
                      </div>
                    )}
                    {job.distance !== undefined && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing[1],
                          marginTop: theme.spacing[1],
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.primary,
                          fontWeight: theme.typography.fontWeight.medium,
                        }}
                      >
                        <Icon name="mapPin" size={14} color={theme.colors.primary} />
                        <span>{job.distance.toFixed(1)} km away</span>
                      </div>
                    )}
                    {job.skillMatchCount !== undefined && job.skillMatchCount > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing[1],
                          marginTop: theme.spacing[1],
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.success,
                          fontWeight: theme.typography.fontWeight.medium,
                        }}
                      >
                        <Icon name="checkCircle" size={14} color={theme.colors.success} />
                        <span>{job.skillMatchCount} skill{job.skillMatchCount !== 1 ? 's' : ''} match</span>
                      </div>
                    )}
                    {job.requiredSkills && job.requiredSkills.length > 0 && (!job.matchedSkills || job.matchedSkills.length === 0) && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing[1],
                          marginTop: theme.spacing[1],
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.warning,
                          fontWeight: theme.typography.fontWeight.medium,
                        }}
                      >
                        <Icon name="alertCircle" size={14} color={theme.colors.warning} />
                        <span>Skills required</span>
                      </div>
                    )}
                    {job.budget && (
                      <div
                        style={{
                          marginTop: theme.spacing[2],
                          fontSize: theme.typography.fontSize.base,
                          fontWeight: theme.typography.fontWeight.semibold,
                          color: theme.colors.success,
                        }}
                      >
                        {formatMoney(parseFloat(job.budget))}
                      </div>
                    )}
                  </div>
                </div>
                {job.description && (
                  <p
                    style={{
                      margin: `${theme.spacing[2]} 0 0 0`,
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {job.description}
                  </p>
                )}
                <div
                  style={{
                    marginTop: theme.spacing[3],
                    paddingTop: theme.spacing[3],
                    borderTop: `1px solid ${theme.colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textTertiary,
                    }}
                  >
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                  <button
                    style={{
                      padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                      backgroundColor: theme.colors.primary,
                      color: theme.colors.textInverse,
                      border: 'none',
                      borderRadius: theme.borderRadius.md,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/contractor/bid/${job.id}`);
                    }}
                  >
                    View Details
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

