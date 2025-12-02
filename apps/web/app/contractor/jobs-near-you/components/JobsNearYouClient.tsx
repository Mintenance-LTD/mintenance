'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMapContainer } from '@/components/maps/GoogleMapContainer';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge.unified';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { getGradientCardStyle, getCardHoverStyle, getIconContainerStyle } from '@/lib/theme-enhancements';
import { formatMoney } from '@/lib/utils/currency';
import { logger } from '@mintenance/shared';

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

  // Memoize navigation handler
  const handleJobClick = useCallback((jobId: string) => {
    router.push(`/contractor/bid/${jobId}`);
  }, [router]);

  // Render job card component
  const renderJobCard = (job: JobWithDistance, isRecommended = false) => {
    return (
    <Card
      key={job.id}
      padding="lg"
      hover={true}
      onClick={() => handleJobClick(job.id)}
      style={{
        cursor: 'pointer',
        position: 'relative',
        ...getCardHoverStyle(),
        border: isRecommended ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
        boxShadow: isRecommended ? theme.shadows.lg : theme.shadows.md,
        borderRadius: theme.borderRadius.xl,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        paddingTop: theme.spacing[5],
        paddingBottom: theme.spacing[5],
        paddingLeft: theme.spacing[5],
        paddingRight: theme.spacing[5],
      }}
    >
      {/* Recommended Badge - Top Right */}
      {isRecommended && (
        <Badge
          variant="primary"
          style={{
            position: 'absolute',
            top: theme.spacing[4],
            right: theme.spacing[4],
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[1],
          }}
        >
          <Icon name="star" size={12} color={theme.colors.white} />
          Recommended
        </Badge>
      )}
      
      {/* Header with title and bookmark */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[3], marginBottom: theme.spacing[4] }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category and NEW Badges */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: theme.spacing[2], 
            marginBottom: theme.spacing[2],
            flexWrap: 'wrap',
          }}>
            {job.category && (
              <Badge 
                variant="info" 
                style={{ 
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  backgroundColor: theme.colors.backgroundTertiary,
                  color: theme.colors.textPrimary,
                  border: `1px solid ${theme.colors.border}`,
                  textTransform: 'lowercase',
                }}
              >
                {job.category}
              </Badge>
            )}
            {job.created_at && new Date(job.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
              <Badge 
                variant="success" 
                style={{ 
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.bold,
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  backgroundColor: theme.colors.success,
                  color: theme.colors.white,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                NEW
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-[560] text-gray-900 m-0 tracking-normal">
            {job.title}
          </h3>
          {job.description && (
            <p
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                lineHeight: 1.5,
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
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            handleSaveJob(job.id, job.isSaved || false);
          }}
          disabled={savingJobId === job.id}
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
        </Button>
      </div>

      {/* Budget and Location Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: theme.spacing[3],
        marginBottom: theme.spacing[4],
        padding: theme.spacing[4],
        ...getGradientCardStyle('success'),
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.success}20`,
      }}>
        {job.budget && (
          <div>
            <div style={{
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[1],
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Budget
            </div>
            <div style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              <AnimatedCounter value={parseFloat(job.budget)} formatType="currency" currency="GBP" />
            </div>
          </div>
        )}
        {job.location && (
          <div>
            <div style={{
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[1],
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Location
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
            }}>
              <Icon name="mapPin" size={16} color={theme.colors.primary} />
              <span>{job.location.split(',').slice(-2).join(',').trim()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Job Metadata */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2], marginBottom: theme.spacing[3] }}>
        {job.distance !== undefined && (
          <Badge 
            variant="info" 
            style={{ 
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
              padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
              backgroundColor: theme.colors.backgroundSecondary,
              color: theme.colors.textPrimary,
              border: `1px solid ${theme.colors.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
            }}
          >
            <Icon name="mapPin" size={12} color={theme.colors.textSecondary} />
            {job.distance.toFixed(1)} km
          </Badge>
        )}
        
        {job.skillMatchCount !== undefined && job.skillMatchCount > 0 && (
          <Badge variant="success" style={{ fontSize: theme.typography.fontSize.xs }}>
            <Icon name="checkCircle" size={12} color={theme.colors.success} style={{ marginRight: theme.spacing[1] }} />
            {job.skillMatchCount} match{job.skillMatchCount !== 1 ? 'es' : ''}
          </Badge>
        )}
      </div>

      {/* Matched Skills */}
      {job.matchedSkills && job.matchedSkills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2], marginBottom: theme.spacing[4] }}>
          {job.matchedSkills.slice(0, 3).map((skill, idx) => (
            <Badge
              key={idx}
              variant="success"
              style={{
                fontSize: theme.typography.fontSize.xs,
                backgroundColor: `${theme.colors.success}20`,
                color: theme.colors.success,
                border: `1px solid ${theme.colors.success}40`,
              }}
            >
              {skill}
            </Badge>
          ))}
          {job.matchedSkills.length > 3 && (
            <Badge variant="info" style={{ fontSize: theme.typography.fontSize.xs }}>
              +{job.matchedSkills.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Posted By */}
      {job.homeowner && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
          marginBottom: theme.spacing[4],
          padding: theme.spacing[2],
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.md,
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: theme.borderRadius.full,
            backgroundColor: theme.colors.primary + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.primary,
            }}>
              {job.homeowner.first_name?.[0] || job.homeowner.email?.[0] || 'U'}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[1],
            }}>
              Posted by
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              {job.homeowner.first_name && job.homeowner.last_name
                ? `${job.homeowner.first_name} ${job.homeowner.last_name}`
                : job.homeowner.email || 'Unknown'}
            </div>
          </div>
        </div>
      )}
      
      {/* Footer with date and action */}
      <div
        style={{
          paddingTop: theme.spacing[4],
          borderTop: `1px solid ${theme.colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: theme.spacing[3],
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[1],
        }}>
          <Icon name="calendar" size={14} color={theme.colors.textTertiary} />
          <span
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              fontWeight: theme.typography.fontWeight.medium,
            }}
          >
            {new Date(job.created_at).toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })}
          </span>
        </div>
        <Button
          variant="primary"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            handleJobClick(job.id);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            fontWeight: theme.typography.fontWeight.semibold,
            fontSize: theme.typography.fontSize.sm,
            borderRadius: theme.borderRadius.lg,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          }}
        >
          Quick Bid
          <Icon name="arrowRight" size={14} />
        </Button>
      </div>
    </Card>
    );
  };

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
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 rounded-2xl p-8 border border-primary-700/50 shadow-xl">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start flex-wrap gap-6">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <Icon name="mapPin" size={28} color="white" />
                </div>
                <h1 className="text-4xl font-bold text-white tracking-tight">
                  Discover Jobs
                </h1>
              </div>
              <p className="text-lg text-gray-300 leading-relaxed max-w-2xl">
                {contractorLocation.city || contractorLocation.country
                  ? `Find your next project opportunity near ${[contractorLocation.city, contractorLocation.country].filter(Boolean).join(', ')}`
                  : 'Find your next project opportunity'}
              </p>
            </div>
          <div className="flex items-center gap-4">
            {filteredAndSortedJobs.length > 0 && (
              <div className="px-6 py-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-center min-w-[120px]">
                <div className="text-3xl font-bold text-white mb-1">
                  <AnimatedCounter value={filteredAndSortedJobs.length} />
                </div>
                <div className="text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Available
                </div>
              </div>
            )}
            <Button
              variant="secondary"
              onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
            >
              <Icon name={viewMode === 'map' ? 'menu' : 'mapPin'} size={18} />
              {viewMode === 'map' ? 'List View' : 'Map View'}
            </Button>
          </div>
        </div>
      </div>
      </div>

      {/* Filters and Sorting */}
      {/* Filters and Sorting - Collapsible */}
      <details className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group relative">
        {/* Gradient bar - appears on hover, always visible on large screens */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
        <summary className="px-6 py-4 cursor-pointer list-none flex items-center justify-between hover:bg-gray-50 transition-colors">
          <h3 className="text-lg font-[560] text-gray-900 m-0 tracking-normal flex items-center gap-2">
            <Icon name="filter" size={20} color={theme.colors.primary} />
            Filters & Sorting
          </h3>
          <Icon name="chevronDown" size={20} color={theme.colors.textSecondary} className="transition-transform duration-200 details-open:rotate-180" />
        </summary>
        <div className="px-6 pb-4 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-gray-900">
                Sort:
              </Label>
              <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as SortBy)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skillMatch">Best Match</SelectItem>
                  <SelectItem value="distance">Closest First</SelectItem>
                  <SelectItem value="budget">Highest Budget</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-gray-900">
                Max Distance:
              </Label>
              <Select 
                value={filters.maxDistance.toString()} 
                onValueChange={(value: string) => setFilters({ ...filters, maxDistance: Number(value) })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 km</SelectItem>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="25">25 km</SelectItem>
                  <SelectItem value="50">50 km</SelectItem>
                  <SelectItem value="100">100 km</SelectItem>
                  <SelectItem value="500">500+ km</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-gray-900">
                Min Skill Match:
              </Label>
              <Select 
                value={filters.minSkillMatch.toString()} 
                onValueChange={(value: string) => setFilters({ ...filters, minSkillMatch: Number(value) })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any</SelectItem>
                  <SelectItem value="1">1+ skills</SelectItem>
                  <SelectItem value="2">2+ skills</SelectItem>
                  <SelectItem value="3">3+ skills</SelectItem>
                  <SelectItem value="4">4+ skills</SelectItem>
                  <SelectItem value="5">All skills</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </details>

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
                {filteredAndSortedJobs.map((job) => renderJobCard(job))}
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
            {recommendations.map(job => renderJobCard(job, true))}
          </div>
        </div>
      )}
    </div>
  );
}
