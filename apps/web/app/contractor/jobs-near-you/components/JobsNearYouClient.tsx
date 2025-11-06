'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  distance?: number;
  coordinates?: { lat: number; lng: number };
  requiredSkills?: string[] | null;
  matchedSkills?: string[];
  skillMatchCount?: number;
  recommendationScore?: number;
  isSaved?: boolean;
}

interface JobsNearYouClientProps {
  contractorLocation: ContractorLocation;
  contractorSkills: string[];
  jobs: Job[];
}

type SortBy = 'distance' | 'budget' | 'newest' | 'skillMatch';
type ViewMode = 'map' | 'list';

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
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

// Calculate recommendation score
function calculateRecommendationScore(job: JobWithDistance): number {
  const skillMatchScore = (job.skillMatchCount || 0) * 40;
  const distanceScore = job.distance ? Math.max(0, 30 * (1 - job.distance / 500)) : 0;
  const budgetScore = job.budget ? Math.min(20, (parseFloat(job.budget) / 1000) * 20) : 0;
  const daysSincePosted = Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const recencyScore = Math.max(0, 10 * (1 - daysSincePosted / 30));
  return skillMatchScore + distanceScore + budgetScore + recencyScore;
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
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('skillMatch');
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [filters, setFilters] = useState({
    maxDistance: 100,
    minBudget: 0,
    maxBudget: 100000,
    minSkillMatch: 0,
  });

  // Fetch saved jobs
  useEffect(() => {
    async function loadSavedJobs() {
      try {
        const response = await fetch('/api/contractor/saved-jobs');
        if (response.ok) {
          const data = await response.json();
          const jobIds = Array.isArray(data.jobIds) ? data.jobIds : [];
          setSavedJobIds(new Set(jobIds));
        }
      } catch (error) {
        console.error('Error loading saved jobs:', error);
      }
    }
    loadSavedJobs();
  }, []);

  // Geocode contractor location
  useEffect(() => {
    async function getContractorCoordinates() {
      if (contractorLocation.latitude && contractorLocation.longitude) {
        setContractorCoords({
          lat: contractorLocation.latitude,
          lng: contractorLocation.longitude,
        });
        return;
      }

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

              const jobRequiredSkills = job.required_skills || [];
              const matchedSkills = contractorSkills.filter(skill => 
                jobRequiredSkills.includes(skill)
              );
              const skillMatchCount = matchedSkills.length;

              const jobWithDistance: JobWithDistance = {
                ...job,
                distance,
                coordinates: {
                  lat: data.latitude,
                  lng: data.longitude,
                },
                requiredSkills: jobRequiredSkills.length > 0 ? jobRequiredSkills : undefined,
                matchedSkills: matchedSkills.length > 0 ? matchedSkills : undefined,
                skillMatchCount,
                isSaved: savedJobIds.has(job.id),
              };

              jobWithDistance.recommendationScore = calculateRecommendationScore(jobWithDistance);
              jobsWithCoords.push(jobWithDistance);
            }
          }
        } catch (error) {
          console.error(`Error geocoding job ${job.id}:`, error);
        }
      }

      setJobsWithDistance(jobsWithCoords);
      setLoading(false);
    }

    if (contractorCoords && jobs.length > 0) {
      geocodeJobsAndCalculateDistances();
    } else {
      setLoading(false);
    }
  }, [contractorCoords, jobs, contractorSkills, savedJobIds]);

  // Handle save/unsave job
  const handleSaveJob = useCallback(async (jobId: string, isSaved: boolean) => {
    if (savingJobId === jobId) return;
    
    setSavingJobId(jobId);
    try {
      if (isSaved) {
        const response = await fetch(`/api/contractor/saved-jobs/${jobId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setSavedJobIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });
          setJobsWithDistance(prev => 
            prev.map(job => job.id === jobId ? { ...job, isSaved: false } : job)
          );
        }
      } else {
        const response = await fetch('/api/contractor/saved-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        });
        if (response.ok) {
          setSavedJobIds(prev => new Set([...prev, jobId]));
          setJobsWithDistance(prev => 
            prev.map(job => job.id === jobId ? { ...job, isSaved: true } : job)
          );
        }
      }
    } catch (error) {
      console.error('Error saving/unsaving job:', error);
    } finally {
      setSavingJobId(null);
    }
  }, [savingJobId]);

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobsWithDistance.filter(job => {
      if (job.distance !== undefined && job.distance > filters.maxDistance) return false;
      if (job.budget) {
        const budget = parseFloat(job.budget);
        if (budget < filters.minBudget || budget > filters.maxBudget) return false;
      }
      if ((job.skillMatchCount || 0) < filters.minSkillMatch) return false;
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return (a.distance || Infinity) - (b.distance || Infinity);
        case 'budget':
          return (parseFloat(b.budget || '0')) - (parseFloat(a.budget || '0'));
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'skillMatch':
        default:
          if ((a.skillMatchCount || 0) !== (b.skillMatchCount || 0)) {
            return (b.skillMatchCount || 0) - (a.skillMatchCount || 0);
          }
          return (a.distance || Infinity) - (b.distance || Infinity);
      }
    });

    return filtered;
  }, [jobsWithDistance, filters, sortBy]);

  // Get recommendations (top 5)
  const recommendations = useMemo(() => {
    return [...filteredAndSortedJobs]
      .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0))
      .slice(0, 5);
  }, [filteredAndSortedJobs]);

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapRef.current || !contractorCoords) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current.forEach((window) => window.close());
    infoWindowsRef.current.clear();

    const contractorMarker = new google.maps.Marker({
      position: contractorCoords,
      map: mapRef.current,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#1F2937',
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

    filteredAndSortedJobs.forEach((job) => {
      if (!job.coordinates) return;

      const jobMarker = new google.maps.Marker({
        position: job.coordinates,
        map: mapRef.current,
        title: job.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#10B981',
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
    if (mapRef.current && filteredAndSortedJobs.length > 0 && viewMode === 'map') {
      updateMarkers();
    }
  }, [filteredAndSortedJobs, contractorCoords, viewMode]);

  const center = contractorCoords || { lat: 51.5074, lng: -0.1278 };

  // Render job card component
  const renderJobCard = (job: JobWithDistance, isRecommended = false) => (
    <Card
      key={job.id}
      padding="md"
      hover={true}
      onClick={() => router.push(`/contractor/bid/${job.id}`)}
      style={{
        cursor: 'pointer',
        position: 'relative',
        border: isRecommended ? `2px solid ${theme.colors.primary}` : undefined,
      }}
    >
      {isRecommended && (
        <div
          style={{
            position: 'absolute',
            top: theme.spacing[2],
            right: theme.spacing[2],
            backgroundColor: theme.colors.primary,
            color: theme.colors.white,
            padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
            borderRadius: theme.borderRadius.md,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
            zIndex: 10,
          }}
        >
          Recommended
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[3] }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: theme.spacing[2], marginBottom: theme.spacing[2] }}>
            <h3
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                flex: 1,
              }}
            >
              {job.title}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveJob(job.id, job.isSaved || false);
              }}
              disabled={savingJobId === job.id}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: savingJobId === job.id ? 'wait' : 'pointer',
                padding: theme.spacing[1],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={job.isSaved ? 'Unsave job' : 'Save job'}
            >
              {savingJobId === job.id ? (
                <Icon 
                  name="loader" 
                  size={20} 
                  color={theme.colors.textSecondary}
                  style={{
                    animation: 'spin 1s linear infinite',
                  }}
                />
              ) : (
                <Icon 
                  name={job.isSaved ? "bookmark" : "bookmarkOutline"} 
                  size={20} 
                  color={job.isSaved ? theme.colors.primary : theme.colors.textSecondary} 
                />
              )}
            </button>
          </div>
          
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
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2], marginTop: theme.spacing[2] }}>
            {job.distance !== undefined && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[1],
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.primary,
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                <Icon name="mapPin" size={14} color={theme.colors.primary} />
                <span>{job.distance.toFixed(1)} km</span>
              </div>
            )}
            
            {job.skillMatchCount !== undefined && job.skillMatchCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[1],
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.success,
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                <Icon name="checkCircle" size={14} color={theme.colors.success} />
                <span>{job.skillMatchCount} match{job.skillMatchCount !== 1 ? 'es' : ''}</span>
              </div>
            )}
            
            {job.budget && (
              <div
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.success,
                }}
              >
                {formatMoney(parseFloat(job.budget))}
              </div>
            )}
          </div>

          {job.matchedSkills && job.matchedSkills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[1], marginTop: theme.spacing[2] }}>
              {job.matchedSkills.slice(0, 3).map((skill, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                    backgroundColor: theme.colors.success + '20',
                    color: theme.colors.success,
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.medium,
                  }}
                >
                  {skill}
                </span>
              ))}
              {job.matchedSkills.length > 3 && (
                <span
                  style={{
                    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    color: theme.colors.textSecondary,
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.fontSize.xs,
                  }}
                >
                  +{job.matchedSkills.length - 3}
                </span>
              )}
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
          gap: theme.spacing[2],
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
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/contractor/bid/${job.id}`);
          }}
          style={{
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            backgroundColor: theme.colors.primary,
            color: theme.colors.textInverse,
            border: 'none',
            borderRadius: theme.borderRadius.md,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[1],
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.primaryLight;
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.primary;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Quick Bid
          <Icon name="arrowRight" size={14} color={theme.colors.textInverse} />
        </button>
      </div>
    </Card>
  );

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
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
        <button
          onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
          style={{
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            backgroundColor: theme.colors.backgroundSecondary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textPrimary,
          }}
        >
              <Icon name={viewMode === 'map' ? 'menu' : 'mapPin'} size={18} color={theme.colors.textPrimary} />
          {viewMode === 'map' ? 'List View' : 'Map View'}
        </button>
      </div>

      {/* Filters and Sorting */}
      <Card padding="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[3], alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              <label style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textSecondary }}>
                Sort:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.textPrimary,
                  cursor: 'pointer',
                }}
              >
                <option value="skillMatch">Best Match</option>
                <option value="distance">Closest First</option>
                <option value="budget">Highest Budget</option>
                <option value="newest">Newest First</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              <label style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textSecondary }}>
                Max Distance:
              </label>
              <select
                value={filters.maxDistance}
                onChange={(e) => setFilters({ ...filters, maxDistance: Number(e.target.value) })}
                style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.textPrimary,
                  cursor: 'pointer',
                }}
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
                <option value={500}>500+ km</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              <label style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textSecondary }}>
                Min Skill Match:
              </label>
              <select
                value={filters.minSkillMatch}
                onChange={(e) => setFilters({ ...filters, minSkillMatch: Number(e.target.value) })}
                style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.textPrimary,
                  cursor: 'pointer',
                }}
              >
                <option value={0}>Any</option>
                <option value={1}>1+ skills</option>
                <option value={2}>2+ skills</option>
                <option value={3}>3+ skills</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Map and Jobs List */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'list' ? '1fr' : '2fr 1fr',
          gap: theme.spacing[6],
          height: viewMode === 'list' ? 'auto' : 'calc(100vh - 400px)',
          minHeight: viewMode === 'list' ? 'auto' : '600px',
        }}
      >
        {/* Map */}
        {viewMode === 'map' && (
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
        )}

        {/* Jobs List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[4],
            overflowY: viewMode === 'list' ? 'visible' : 'auto',
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
              <Icon 
                name="loader" 
                size={32} 
                color={theme.colors.textTertiary}
                style={{
                  animation: 'spin 1s linear infinite',
                }}
              />
            </div>
          ) : filteredAndSortedJobs.length === 0 ? (
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
                  Try adjusting your filters to see more opportunities.
                </p>
              </div>
            </Card>
          ) : (
            <>
              <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                Showing {filteredAndSortedJobs.length} job{filteredAndSortedJobs.length !== 1 ? 's' : ''}
              </div>
              {filteredAndSortedJobs.map((job) => renderJobCard(job))}
            </>
          )}
        </div>

        {/* Recommendations Section - At bottom of map container */}
        {recommendations.length > 0 && (
          <div
            style={{
              gridColumn: viewMode === 'map' ? '1 / -1' : '1 / -1',
              marginTop: theme.spacing[6],
            }}
          >
            <h2
              style={{
                margin: `0 0 ${theme.spacing[4]} 0`,
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
              }}
            >
              Recommended for You
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: theme.spacing[4],
              }}
            >
              {recommendations.map(job => renderJobCard(job, true))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
