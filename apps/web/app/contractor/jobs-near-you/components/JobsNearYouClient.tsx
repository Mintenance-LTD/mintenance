'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicGoogleMap } from '@/components/maps';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { getGradientCardStyle, getIconContainerStyle } from '@/lib/theme-enhancements';
import { logger } from '@mintenance/shared';

import { calculateDistance, calculateRecommendationScore } from './jobsNearYouUtils';
import { updateMarkers, handleMapLoad } from './JobsMapController';
import { NearbyJobCard } from './NearbyJobCard';
import { JobsFilterBar } from './JobsFilterBar';

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
        logger.error('Error loading saved jobs:', error);
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
          logger.error('Error geocoding contractor location:', error);
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
          logger.error(`Error geocoding job ${job.id}:`, error);
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
      logger.error('Error saving/unsaving job:', error);
    } finally {
      setSavingJobId(null);
    }
  }, [savingJobId]);

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    const filtered = jobsWithDistance.filter(job => {
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

  // Map refs bundle for the controller
  const mapRefs = { mapRef, markersRef, infoWindowsRef };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    handleMapLoad(map, mapRefs, contractorCoords, contractorLocation, filteredAndSortedJobs);
  }, [contractorCoords, contractorLocation, filteredAndSortedJobs]);

  useEffect(() => {
    if (mapRef.current && filteredAndSortedJobs.length > 0 && viewMode === 'map') {
      updateMarkers(mapRefs, contractorCoords, contractorLocation, filteredAndSortedJobs);
    }
  }, [filteredAndSortedJobs, contractorCoords, viewMode]);

  const center = contractorCoords || { lat: 51.5074, lng: -0.1278 };

  // Memoize navigation handler
  const handleJobClick = useCallback((jobId: string) => {
    router.push(`/contractor/bid/${jobId}`);
  }, [router]);

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
      {/* Header and Filters */}
      <JobsFilterBar
        contractorLocation={contractorLocation}
        jobCount={filteredAndSortedJobs.length}
        sortBy={sortBy}
        setSortBy={setSortBy}
        filters={filters}
        setFilters={setFilters}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

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
              <DynamicGoogleMap
                center={center}
                zoom={12}
                onMapLoad={onMapLoad}
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
          {loading && (
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
          )}
          {!loading && filteredAndSortedJobs.length === 0 && (
            <Card
              padding="lg"
              style={{
                ...getGradientCardStyle('primary'),
                border: `1px solid ${theme.colors.border}`,
                boxShadow: theme.shadows.sm,
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  color: theme.colors.textSecondary,
                  padding: theme.spacing[8],
                }}
              >
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto',
                  ...getIconContainerStyle(theme.colors.primary, 80),
                }}>
                  <Icon name="briefcase" size={40} color={theme.colors.primary} />
                </div>
                <p style={{
                  marginTop: theme.spacing[4],
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                }}>
                  No jobs found
                </p>
                <p style={{
                  marginTop: theme.spacing[2],
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
                  Try adjusting your filters to see more opportunities.
                </p>
              </div>
            </Card>
          )}
          {!loading && filteredAndSortedJobs.length > 0 && (
            <div>
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing[2],
              }}>
                Showing {filteredAndSortedJobs.length} job{filteredAndSortedJobs.length !== 1 ? 's' : ''}
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[4],
              }}>
                {filteredAndSortedJobs.map((job) => (
                  <NearbyJobCard
                    key={job.id}
                    job={job}
                    savedJobIds={savedJobIds}
                    savingJobId={savingJobId}
                    onSave={handleSaveJob}
                    onClick={handleJobClick}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <div
          style={{
            marginTop: theme.spacing[6],
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            marginBottom: theme.spacing[5],
          }}>
            <div style={getIconContainerStyle(theme.colors.primary, 40)}>
              <Icon name="star" size={20} color={theme.colors.primary} />
            </div>
            <h2 className="text-xl font-[560] text-gray-900 m-0 tracking-normal">
              Recommended for You
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: theme.spacing[5],
            }}
          >
            {recommendations.map(job => (
              <NearbyJobCard
                key={job.id}
                job={job}
                isRecommended={true}
                savedJobIds={savedJobIds}
                savingJobId={savingJobId}
                onSave={handleSaveJob}
                onClick={handleJobClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
