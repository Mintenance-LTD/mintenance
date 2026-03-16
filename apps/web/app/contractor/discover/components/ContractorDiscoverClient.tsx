'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { DynamicGoogleMap } from '@/components/maps';
import { LocationPromptModal } from './LocationPromptModal';
import toast from 'react-hot-toast';
import { MapPin, LayoutGrid, Map } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@mintenance/shared';
import { getCsrfToken } from '@/lib/csrf-client';

import { calculateDistance } from './discoverUtils';
import { DiscoverQuickStats } from './DiscoverQuickStats';
import { DiscoverJobCard, type DiscoverJob } from './DiscoverJobCard';
import { DiscoverFilters } from './DiscoverFilters';
import { DiscoverSkeletonCard } from './DiscoverSkeletonCard';
import { DiscoverJobsEmptyState } from './DiscoverJobsEmptyState';
import { updateMapMarkers } from './DiscoverMapMarkers';
import type { MapJob, ContractorLocationForMap } from './DiscoverMapMarkers';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ContractorLocation {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  address?: string | null;
  postcode?: string | null;
}

interface ContractorDiscoverClientProps {
  jobs: DiscoverJob[];
  contractorId: string;
  contractorLocation?: ContractorLocation | null;
}

type JobWithCoords = DiscoverJob & { lat?: number; lng?: number };

// ── Component ─────────────────────────────────────────────────────────────────
export function ContractorDiscoverClient({
  jobs,
  contractorId,
  contractorLocation: initialLocation,
}: ContractorDiscoverClientProps) {
  const router = useRouter();

  // Core state
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [skippedJobIds, setSkippedJobIds] = useState<Set<string>>(new Set());
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [jobsWithCoords, setJobsWithCoords] = useState<JobWithCoords[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(true);
  const [loadingSavedJobs, setLoadingSavedJobs] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [contractorLocation, setContractorLocation] = useState(initialLocation);

  // Filter state
  const [selectedRadius, setSelectedRadius] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [minBudget, setMinBudget] = useState(0);
  const [aiAssessedOnly, setAiAssessedOnly] = useState(false);

  // UI state
  const [viewMode, setViewMode] = useState<'split' | 'cards'>('split');
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Load saved jobs on mount
  useEffect(() => {
    fetch('/api/contractor/saved-jobs')
      .then(r => r.json())
      .then(d => setSavedJobIds(new Set<string>(d.jobIds || [])))
      .catch(err => logger.error('Error loading saved jobs', err, { service: 'ui' }))
      .finally(() => setLoadingSavedJobs(false));
  }, []);

  // Location prompt
  useEffect(() => {
    const hasLoc = contractorLocation?.latitude && contractorLocation?.longitude;
    if (!hasLoc && localStorage.getItem('location-prompt-dismissed') !== 'true') {
      const t = setTimeout(() => setShowLocationPrompt(true), 1000);
      return () => clearTimeout(t);
    }
  }, [contractorLocation]);

  // Available jobs (skip filter)
  const availableJobs = useMemo(
    () => jobs.filter(j => !skippedJobIds.has(j.id)),
    [jobs, skippedJobIds]
  );

  // Geocode + calculate distances from stored coordinates
  useEffect(() => {
    const withCoords = availableJobs.map(job => {
      const j = job as DiscoverJob & { latitude?: number; longitude?: number };
      const lat = j.latitude ?? undefined;
      const lng = j.longitude ?? undefined;
      const distance =
        contractorLocation?.latitude && contractorLocation?.longitude && lat && lng
          ? calculateDistance(contractorLocation.latitude, contractorLocation.longitude, lat, lng)
          : undefined;
      return { ...job, lat, lng, distance } as JobWithCoords & { distance?: number };
    });
    setJobsWithCoords(withCoords);
    setIsGeocoding(false);
  }, [availableJobs, contractorLocation]);

  // Apply all filters
  const filteredJobs = useMemo(() => {
    const hasLoc = !!(contractorLocation?.latitude && contractorLocation?.longitude);
    return jobsWithCoords
      // Include jobs without coordinates (they just won't appear on map)
      // Only apply distance filter to jobs that have coordinates
      .filter(j => !hasLoc || !(j.lat && j.lng) || !j.distance || j.distance <= selectedRadius)
      .filter(j => !selectedCategory || j.category === selectedCategory)
      .filter(j => j.budget >= minBudget)
      .filter(j => !aiAssessedOnly || (j.building_assessments?.length ?? 0) > 0);
  }, [jobsWithCoords, selectedRadius, selectedCategory, minBudget, aiAssessedOnly, contractorLocation]);

  // Pan map to hovered job
  useEffect(() => {
    if (!hoveredJobId || !mapRef.current) return;
    const job = filteredJobs.find(j => j.id === hoveredJobId) as (JobWithCoords & { lat?: number; lng?: number }) | undefined;
    if (job?.lat && job?.lng) mapRef.current.panTo({ lat: job.lat, lng: job.lng });
  }, [hoveredJobId, filteredJobs]);

  // Update map markers when filtered jobs change
  const runUpdateMarkers = () => {
    if (!mapRef.current) return;
    const mapJobs: MapJob[] = (filteredJobs as (JobWithCoords & { lat?: number; lng?: number; distance?: number })[]).map(j => ({
      id: j.id, title: j.title, description: j.description,
      category: j.category, budget: j.budget, priority: j.priority,
      property: j.property ?? null, building_assessments: j.building_assessments as MapJob['building_assessments'],
      lat: j.lat, lng: j.lng, distance: j.distance,
    }));
    markersRef.current = updateMapMarkers(
      mapRef.current, markersRef.current, mapJobs,
      contractorLocation as ContractorLocationForMap,
    );
  };

  useEffect(() => {
    if (mapRef.current && !isGeocoding) runUpdateMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredJobs, isGeocoding]);

  // Save/skip handlers
  const handleSaveToggle = async (jobId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActionLoadingId(jobId);
    const wasSaved = savedJobIds.has(jobId);
    try {
      const res = await fetch(
        wasSaved ? `/api/contractor/saved-jobs?jobId=${jobId}` : '/api/contractor/saved-jobs',
        {
          method: wasSaved ? 'DELETE' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': await getCsrfToken(),
          },
          body: wasSaved ? undefined : JSON.stringify({ jobId }),
        }
      );
      if (!res.ok && res.status !== 409) throw new Error('Request failed');
      setSavedJobIds(prev => {
        const next = new Set(prev);
        wasSaved ? next.delete(jobId) : next.add(jobId);
        return next;
      });
      toast.success(wasSaved ? 'Job removed from saved' : 'Job saved!');
    } catch {
      toast.error(wasSaved ? 'Failed to unsave job' : 'Failed to save job');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSkip = (jobId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSkippedJobIds(prev => new Set(prev).add(jobId));
  };

  // Derived values
  const hasLocation = !!(contractorLocation?.latitude && contractorLocation?.longitude);
  const categories = useMemo(
    () => [...new Set(jobs.map(j => j.category).filter(Boolean))] as string[],
    [jobs]
  );
  const isInitialLoading = isGeocoding || loadingSavedJobs;

  const cardProps = (job: JobWithCoords) => ({
    job,
    isSaved: savedJobIds.has(job.id),
    isLoading: actionLoadingId === job.id,
    onSaveToggle: handleSaveToggle,
    onSkip: handleSkip,
    onNavigate: (id: string) => router.push(`/contractor/bid/${id}/details`),
    onHover: setHoveredJobId,
  });

  return (
    <ContractorPageWrapper>
      <DiscoverQuickStats
        filteredJobCount={filteredJobs.length}
        savedJobCount={savedJobIds.size}
        selectedRadius={selectedRadius}
        hasContractorLocation={hasLocation}
        totalJobCount={jobs.length}
        onReviewAgain={() => { setSavedJobIds(new Set()); setSkippedJobIds(new Set()); }}
      />

      {/* Header: count + view toggle + filter chips */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-gray-900">
            Available Jobs ({filteredJobs.length})
            {hasLocation && (
              <span className="text-sm text-gray-400 font-normal ml-1.5">within {selectedRadius}km</span>
            )}
          </h3>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'split' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Map className="w-3.5 h-3.5" /> Map
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Cards
            </button>
          </div>
        </div>

        <DiscoverFilters
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedRadius={selectedRadius}
          onRadiusChange={setSelectedRadius}
          minBudget={minBudget}
          onMinBudgetChange={setMinBudget}
          aiAssessedOnly={aiAssessedOnly}
          onAiAssessedToggle={() => setAiAssessedOnly(v => !v)}
          hasLocation={hasLocation}
        />
      </div>

      {/* Content */}
      {isInitialLoading ? (
        /* Skeleton loading */
        <div className={viewMode === 'cards' ? 'grid grid-cols-2 gap-4' : 'flex gap-6'}>
          <div className={`space-y-4 ${viewMode === 'split' ? 'w-1/3' : 'contents'}`}>
            {[1, 2, 3].map(i => <DiscoverSkeletonCard key={i} />)}
          </div>
          {viewMode === 'split' && <div className="flex-1 h-64 bg-gray-100 rounded-xl animate-pulse" />}
        </div>
      ) : filteredJobs.length === 0 ? (
        /* Empty state */
        <DiscoverJobsEmptyState
          hasLocation={hasLocation}
          onExpandRadius={() => setSelectedRadius(r => Math.min(r * 2, 100))}
        />
      ) : viewMode === 'split' ? (
        /* Split: cards left, map right */
        <div className="flex gap-6">
          <div className="w-1/3 space-y-4 overflow-y-auto pr-1" style={{ maxHeight: '800px' }}>
            {filteredJobs.map(job => (
              <DiscoverJobCard key={job.id} {...cardProps(job)} />
            ))}
          </div>

          <div className="flex-1">
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 mb-4 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {filteredJobs.length} jobs near you
                {hasLocation && <span className="text-gray-400"> · within {selectedRadius}km</span>}
              </span>
              <span className="text-xs text-gray-400 ml-auto">Hover a card to focus the map</span>
            </div>
            <div
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              style={{ height: '740px' }}
            >
              <DynamicGoogleMap
                center={{ lat: contractorLocation?.latitude || 51.5074, lng: contractorLocation?.longitude || -0.1278 }}
                zoom={12}
                onMapLoad={map => { mapRef.current = map; runUpdateMarkers(); }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Cards grid view */
        <div className="grid grid-cols-2 gap-4">
          {filteredJobs.map(job => (
            <DiscoverJobCard key={job.id} {...cardProps(job)} />
          ))}
        </div>
      )}

      <LocationPromptModal
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onLocationSet={loc => {
          setContractorLocation(loc);
          toast.success('Location saved!');
          router.refresh();
        }}
        contractorId={contractorId}
      />
    </ContractorPageWrapper>
  );
}

export default ContractorDiscoverClient;
