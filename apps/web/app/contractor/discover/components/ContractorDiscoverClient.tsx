'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { DynamicGoogleMap } from '@/components/maps';
import { LocationPromptModal } from './LocationPromptModal';
import toast from 'react-hot-toast';
import { MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@mintenance/shared';

import { calculateDistance } from './discoverUtils';
import { DiscoverQuickStats } from './DiscoverQuickStats';
import { DiscoverJobCard } from './DiscoverJobCard';
import { updateMapMarkers } from './DiscoverMapMarkers';
import type { MapJob, ContractorLocationForMap } from './DiscoverMapMarkers';

// ── Types ───────────────────────────────────────────────────────────────────

interface AIAssessment {
  id: string;
  severity: 'early' | 'midway' | 'full';
  damage_type: string;
  confidence: number;
  urgency: 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor';
  created_at?: string;
  assessment_data?: {
    contractorAdvice?: {
      estimatedCost?: {
        min: number;
        max: number;
        recommended: number;
      };
      complexity?: 'low' | 'medium' | 'high';
    };
    safetyHazards?: {
      hasCriticalHazards: boolean;
      overallSafetyScore: number;
    };
  };
}

interface Job {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budget: number;
  priority: string | null;
  photos: string[] | null;
  created_at: string;
  homeowner: {
    first_name: string;
    last_name: string;
    profile_image_url: string | null;
    rating: number | null;
  } | null;
  property: {
    address: string;
    postcode: string;
  } | null;
  matchScore: number;
  building_assessments?: AIAssessment[] | null;
}

interface ContractorLocation {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  address?: string | null;
  postcode?: string | null;
}

interface ContractorDiscoverClientProps {
  jobs: Job[];
  contractorId: string;
  contractorLocation?: ContractorLocation | null;
}

// ── Component ───────────────────────────────────────────────────────────────

export function ContractorDiscoverClient({
  jobs,
  contractorId,
  contractorLocation: initialContractorLocation,
}: ContractorDiscoverClientProps) {
  // Debug logging - track props received from server
  logger.info('[CLIENT] ContractorDiscoverClient Props', {
    totalJobs: jobs.length,
    contractorId,
    contractorLocation: initialContractorLocation,
    firstJob: jobs[0] ? {
      id: jobs[0].id,
      title: jobs[0].title,
      lat: (jobs[0] as Job & { latitude?: number }).latitude,
      lng: (jobs[0] as Job & { longitude?: number }).longitude,
      property: jobs[0].property
    } : null,
    service: 'ui',
  });

  const router = useRouter();
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [skippedJobIds, setSkippedJobIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [jobsWithCoordinates, setJobsWithCoordinates] = useState<(Job & { lat?: number; lng?: number; distance?: number })[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(true);
  const [selectedRadius, setSelectedRadius] = useState<number>(10);
  const [loadingSavedJobs, setLoadingSavedJobs] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [contractorLocation, setContractorLocation] = useState<ContractorLocation | null | undefined>(initialContractorLocation);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Load saved jobs on mount
  useEffect(() => {
    loadSavedJobs();
  }, []);

  // Check if we should show location prompt
  useEffect(() => {
    const hasLocation = contractorLocation?.latitude && contractorLocation?.longitude;
    const isDismissed = localStorage.getItem('location-prompt-dismissed') === 'true';

    if (!hasLocation && !isDismissed) {
      const timer = setTimeout(() => {
        setShowLocationPrompt(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [contractorLocation]);

  const loadSavedJobs = async () => {
    try {
      const response = await fetch('/api/contractor/saved-jobs');
      if (response.ok) {
        const data = await response.json();
        const savedIds = new Set<string>(data.jobIds || []);
        setSavedJobIds(savedIds);
      }
    } catch (error) {
      logger.error('Error loading saved jobs', error, { service: 'ui' });
    } finally {
      setLoadingSavedJobs(false);
    }
  };

  // Filter out only skipped jobs (saved jobs should remain visible with saved state)
  const availableJobs = useMemo(() =>
    jobs.filter(job => !skippedJobIds.has(job.id)),
    [jobs, skippedJobIds]
  );

  // Filter jobs by radius
  const filteredJobsByRadius = useMemo(() => {
    if (!contractorLocation?.latitude || !contractorLocation?.longitude) {
      const filtered = jobsWithCoordinates.filter(job => job.lat && job.lng);
      logger.info('[CLIENT] Filtering (no contractor location)', {
        input: jobsWithCoordinates.length,
        output: filtered.length,
        contractorHasLocation: false,
        service: 'ui',
      });
      return filtered;
    }

    const filtered = jobsWithCoordinates.filter(job => {
      if (!job.lat || !job.lng) return false;
      if (!job.distance) return true;
      return job.distance <= selectedRadius;
    });

    logger.info('[CLIENT] Filtering (with contractor location)', {
      input: jobsWithCoordinates.length,
      output: filtered.length,
      radius: selectedRadius,
      contractorLocation: {
        lat: contractorLocation.latitude,
        lng: contractorLocation.longitude
      },
      service: 'ui',
    });

    return filtered;
  }, [jobsWithCoordinates, selectedRadius, contractorLocation]);

  const handleSaveToggle = async (jobId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    setIsLoading(jobId);
    const isCurrentlySaved = savedJobIds.has(jobId);

    try {
      if (isCurrentlySaved) {
        const response = await fetch(`/api/contractor/saved-jobs?jobId=${jobId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': ((window as Window & { csrfToken?: string }).csrfToken) || '',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to unsave job');
        }

        setSavedJobIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
        toast.success('Job removed from saved');
      } else {
        const response = await fetch('/api/contractor/saved-jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': ((window as Window & { csrfToken?: string }).csrfToken) || '',
          },
          body: JSON.stringify({ jobId }),
        });

        if (!response.ok) {
          const error = await response.json();
          if (response.status === 409) {
            setSavedJobIds(prev => new Set(prev).add(jobId));
            return;
          }
          throw new Error(error.error || 'Failed to save job');
        }

        setSavedJobIds(prev => new Set(prev).add(jobId));
        toast.success('Job saved! You can view it in your saved jobs.');
      }
    } catch (error) {
      logger.error('Error toggling save', error, { service: 'ui' });
      toast.error(isCurrentlySaved ? 'Failed to unsave job' : 'Failed to save job');
    } finally {
      setIsLoading(null);
    }
  };

  const handleSkip = (jobId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSkippedJobIds(prev => new Set(prev).add(jobId));
  };

  // Use stored coordinates from database and calculate distances
  useEffect(() => {
    const jobsWithCoords = availableJobs.map(job => {
      const jobWithCoords = job as Job & { latitude?: number; lat?: number; longitude?: number; lng?: number };
      const lat = jobWithCoords.latitude || jobWithCoords.lat;
      const lng = jobWithCoords.longitude || jobWithCoords.lng;

      let distance: number | undefined;
      if (contractorLocation?.latitude && contractorLocation?.longitude && lat && lng) {
        distance = calculateDistance(
          contractorLocation.latitude,
          contractorLocation.longitude,
          lat,
          lng
        );
      }

      return {
        ...job,
        lat,
        lng,
        distance,
      };
    });

    logger.info('[CLIENT] Jobs with coordinates', {
      total: jobsWithCoords.length,
      withCoords: jobsWithCoords.filter(j => j.lat && j.lng).length,
      withoutCoords: jobsWithCoords.filter(j => !j.lat || !j.lng).length,
      sample: jobsWithCoords.slice(0, 2).map(j => ({
        id: j.id,
        title: j.title,
        lat: j.lat,
        lng: j.lng,
        distance: j.distance
      })),
      service: 'ui',
    });

    setJobsWithCoordinates(jobsWithCoords);
    setIsGeocoding(false);
  }, [availableJobs, contractorLocation]);

  // Handle map load
  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    runUpdateMapMarkers();
  };

  // Update markers when jobs change
  useEffect(() => {
    if (mapRef.current && !isGeocoding) {
      runUpdateMapMarkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredJobsByRadius, isGeocoding]);

  /** Delegate to the extracted map-marker logic. */
  const runUpdateMapMarkers = () => {
    if (!mapRef.current) return;

    const mapJobs: MapJob[] = filteredJobsByRadius.map(j => ({
      id: j.id,
      title: j.title,
      description: j.description,
      category: j.category,
      budget: j.budget,
      priority: j.priority,
      property: j.property,
      building_assessments: j.building_assessments,
      lat: j.lat,
      lng: j.lng,
      distance: j.distance,
    }));

    markersRef.current = updateMapMarkers(
      mapRef.current,
      markersRef.current,
      mapJobs,
      contractorLocation as ContractorLocationForMap,
    );
  };

  // Handle location set from modal
  const handleLocationSet = (location: ContractorLocation) => {
    setContractorLocation(location);
    toast.success('Location saved successfully!');
    router.refresh();
  };

  const hasContractorLocation = !!(contractorLocation?.latitude && contractorLocation?.longitude);

  return (
    <ContractorPageWrapper>
      <DiscoverQuickStats
        filteredJobCount={filteredJobsByRadius.length}
        savedJobCount={savedJobIds.size}
        selectedRadius={selectedRadius}
        hasContractorLocation={hasContractorLocation}
        totalJobCount={jobs.length}
        onReviewAgain={() => {
          setSavedJobIds(new Set());
          setSkippedJobIds(new Set());
        }}
      />

      {/* Content */}
      <div className="w-full">
        {filteredJobsByRadius.length > 0 && (
          // Split View - Map and Cards Side by Side
          <div className="flex gap-6">
            {/* Left Side - Job Cards (Scrollable) */}
            <div className="w-1/3 space-y-4 overflow-y-auto" style={{ maxHeight: '800px' }}>
              <div className="sticky top-0 bg-white z-10 pb-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Available Jobs ({filteredJobsByRadius.length})
                  {hasContractorLocation && (
                    <span className="text-sm text-gray-500 ml-2">
                      within {selectedRadius}km
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 mt-1">Click on a job to view details</p>

                {/* Radius Selector */}
                {hasContractorLocation && (
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Radius:</label>
                    <select
                      value={selectedRadius}
                      onChange={(e) => setSelectedRadius(Number(e.target.value))}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="5">5 km</option>
                      <option value="10">10 km</option>
                      <option value="20">20 km</option>
                      <option value="30">30 km</option>
                      <option value="50">50 km</option>
                      <option value="100">100 km</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-4 pr-2">
                {filteredJobsByRadius.map(job => (
                  <DiscoverJobCard
                    key={job.id}
                    job={{
                      ...job,
                      distance: job.distance,
                    }}
                    isSaved={savedJobIds.has(job.id)}
                    isLoading={isLoading === job.id}
                    onSaveToggle={handleSaveToggle}
                    onSkip={handleSkip}
                    onNavigate={(id) => router.push(`/contractor/bid/${id}/details`)}
                  />
                ))}
              </div>
            </div>

            {/* Right Side - Map */}
            <div className="flex-1">
              {/* Map Info Bar with Legend */}
              <div className="bg-white rounded-xl border border-gray-200 px-6 py-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    <span className="text-gray-700 font-medium">
                      {filteredJobsByRadius.length} jobs near you
                      {hasContractorLocation && (
                        <span className="text-gray-500"> within {selectedRadius}km</span>
                      )}
                    </span>
                    {contractorLocation?.address && (
                      <span className="text-sm text-gray-500">
                        {'\u2022'} {contractorLocation.address}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Click markers for details
                  </div>
                </div>
              </div>

              {/* Map Container */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '740px' }}>
                {isGeocoding ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading map...</p>
                    </div>
                  </div>
                ) : (
                  <DynamicGoogleMap
                    center={{
                      lat: contractorLocation?.latitude || 51.5074,
                      lng: contractorLocation?.longitude || -0.1278
                    }}
                    zoom={12}
                    onMapLoad={handleMapLoad}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location Prompt Modal */}
      <LocationPromptModal
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onLocationSet={handleLocationSet}
        contractorId={contractorId}
      />
    </ContractorPageWrapper>
  );
}

// Also export as default for better compatibility with dynamic imports
export default ContractorDiscoverClient;
