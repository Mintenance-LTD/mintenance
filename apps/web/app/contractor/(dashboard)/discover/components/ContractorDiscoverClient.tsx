'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { DynamicGoogleMap } from '@/components/maps';
import { LocationPromptModal } from './LocationPromptModal';
import toast from 'react-hot-toast';
import { MapPin, LayoutGrid, Map } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { milesToKm } from '@mintenance/shared';
import { DISCOVER_RADII_MILES } from '../discover-radius';

import { resolveJobCoordsAndDistance } from './discoverUtils';
import { useDiscoverJobActions } from './useDiscoverJobActions';
import { DiscoverQuickStats } from './DiscoverQuickStats';
import { DiscoverJobCard, type DiscoverJob } from './DiscoverJobCard';
import { DiscoverFilters } from './DiscoverFilters';
import { DiscoverSkeletonCard } from './DiscoverSkeletonCard';
import { DiscoverJobsEmptyState } from './DiscoverJobsEmptyState';
import { updateMapMarkers } from './DiscoverMapMarkers';
import type {
  CoverageAreaForMap,
  MapJob,
  ContractorLocationForMap,
} from './DiscoverMapMarkers';
import { drawCoverageCircles } from './DiscoverMapMarkers';

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
  radiusSearchAvailable: boolean;
  /** Active service areas (primary first) — coverage overlay +
   * viewport fallback when no stored location exists. 2026-07-17. */
  coverageAreas?: CoverageAreaForMap[];
}

type JobWithCoords = DiscoverJob & { lat?: number; lng?: number };

// ── Component ─────────────────────────────────────────────────────────────────
export function ContractorDiscoverClient({
  jobs,
  contractorId,
  contractorLocation: initialLocation,
  radiusSearchAvailable,
  coverageAreas = [],
}: ContractorDiscoverClientProps) {
  const router = useRouter();

  // Core state
  const {
    savedJobIds,
    skippedJobIds,
    actionLoadingId,
    loadingSavedJobs,
    handleSaveToggle,
    handleSkip,
    resetReviewed,
  } = useDiscoverJobActions();
  const [jobsWithCoords, setJobsWithCoords] = useState<JobWithCoords[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [contractorLocation, setContractorLocation] = useState(initialLocation);

  // Filter state
  // Default radius in MILES. Was 10km (~6mi); 10 mi aligns Discover with the
  // vocabulary Service Areas already uses (Standard 6 mi / Extended 10 mi) and
  // widens the default net slightly, which is contractor-friendly.
  const [selectedRadius, setSelectedRadius] = useState(10);
  const nextRadius = DISCOVER_RADII_MILES.find(
    (radius) => radius > selectedRadius
  );
  const expandRadius =
    radiusSearchAvailable && nextRadius != null
      ? () => setSelectedRadius(nextRadius)
      : undefined;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [minBudget, setMinBudget] = useState(0);
  const [aiAssessedOnly, setAiAssessedOnly] = useState(false);

  // UI state
  const [viewMode, setViewMode] = useState<'split' | 'cards'>('split');
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const mapPanelRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const coverageCirclesRef = useRef<google.maps.Circle[]>([]);

  // Hydration-safe theme detection — same pattern used across the
  // contractor Phase-4 ports. Lives near the other state hooks so
  // it's well above any early return.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  // Location prompt
  const hasLocation =
    contractorLocation?.latitude != null &&
    contractorLocation?.longitude != null;
  useEffect(() => {
    if (
      !hasLocation &&
      localStorage.getItem('location-prompt-dismissed') !== 'true'
    ) {
      const t = setTimeout(() => setShowLocationPrompt(true), 1000);
      return () => clearTimeout(t);
    }
  }, [hasLocation]);

  // Available jobs (skip filter)
  const availableJobs = useMemo(
    () => jobs.filter((j) => !skippedJobIds.has(j.id)),
    [jobs, skippedJobIds]
  );

  // Resolve coords + distance (PostGIS serverDistanceKm preferred —
  // see resolveJobCoordsAndDistance in discoverUtils).
  useEffect(() => {
    const withCoords = availableJobs.map((job) => {
      const j = job as DiscoverJob & {
        latitude?: number;
        longitude?: number;
        serverDistanceKm?: number | null;
      };
      return {
        ...job,
        ...resolveJobCoordsAndDistance(j, contractorLocation),
      } as JobWithCoords & { distance?: number };
    });
    setJobsWithCoords(withCoords);
    setIsGeocoding(false);
  }, [availableJobs, contractorLocation]);

  // Apply all filters
  const filteredJobs = useMemo(() => {
    return (
      jobsWithCoords
        // Include jobs without coordinates (they just won't appear on map)
        // Only apply distance filter to jobs that have coordinates
        // `selectedRadius` is in MILES (the chips are authored in miles);
        // `j.distance` is in km, as stored and queried. Convert at the
        // comparison rather than converting every job's distance.
        .filter(
          (j) =>
            !radiusSearchAvailable ||
            (j.distance != null && j.distance <= milesToKm(selectedRadius))
        )
        .filter((j) => !selectedCategory || j.category === selectedCategory)
        .filter((j) => j.budget >= minBudget)
        .filter(
          (j) => !aiAssessedOnly || (j.building_assessments?.length ?? 0) > 0
        )
    );
  }, [
    jobsWithCoords,
    selectedRadius,
    selectedCategory,
    minBudget,
    aiAssessedOnly,
    radiusSearchAvailable,
  ]);

  const pinJobId = hoveredJobId ?? focusedJobId;
  useEffect(() => {
    if (viewMode !== 'split' || !pinJobId || !mapRef.current) return;
    const job = filteredJobs.find((j) => j.id === pinJobId) as
      | (JobWithCoords & { lat?: number; lng?: number })
      | undefined;
    if (job?.lat != null && job?.lng != null)
      mapRef.current.panTo({ lat: job.lat, lng: job.lng });
  }, [pinJobId, filteredJobs, viewMode]);

  // Update map markers when filtered jobs change
  const runUpdateMarkers = () => {
    if (!mapRef.current) return;
    const mapJobs: MapJob[] = (
      filteredJobs as (JobWithCoords & {
        lat?: number;
        lng?: number;
        distance?: number;
      })[]
    ).map((j) => ({
      id: j.id,
      title: j.title,
      description: j.description,
      category: j.category,
      budget: j.budget,
      priority: j.priority,
      property: j.property ?? null,
      building_assessments:
        j.building_assessments as MapJob['building_assessments'],
      lat: j.lat,
      lng: j.lng,
      distance: j.distance,
    }));
    markersRef.current = updateMapMarkers(
      mapRef.current,
      markersRef.current,
      mapJobs,
      contractorLocation as ContractorLocationForMap,
      (id) => router.push(`/contractor/bid/${encodeURIComponent(id)}/details`)
    );
  };

  useEffect(() => {
    if (mapRef.current && !isGeocoding) runUpdateMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredJobs, isGeocoding]);

  // Save/skip handlers

  // Derived values
  const searchCentre = [contractorLocation?.city, contractorLocation?.postcode]
    .filter(Boolean)
    .join(' · ');
  const categories = useMemo(
    () => [...new Set(jobs.map((j) => j.category).filter(Boolean))] as string[],
    [jobs]
  );
  const isInitialLoading = isGeocoding || loadingSavedJobs;

  const cardProps = (job: JobWithCoords) => {
    const { lat, lng } = job;
    return {
      job,
      isSaved: savedJobIds.has(job.id),
      isLoading: actionLoadingId === job.id,
      onSaveToggle: handleSaveToggle,
      onSkip: handleSkip,
      onNavigate: (id: string) => router.push(`/contractor/bid/${id}/details`),
      onHover: setHoveredJobId,
      onFocusPin:
        viewMode === 'split' && lat != null && lng != null
          ? () => {
              setFocusedJobId(job.id);
              mapRef.current?.panTo({ lat, lng });
              if (window.innerWidth < 1024)
                mapPanelRef.current?.scrollIntoView({ block: 'nearest' });
            }
          : undefined,
      pinFocused: job.id === focusedJobId,
    };
  };

  return (
    <ContractorPageWrapper>
      {isMintEditorial ? (
        <div className='col' style={{ gap: 4, marginBottom: 16 }}>
          <h1 className='t-h1'>Discover</h1>
          <p className='t-body'>
            Find your next local project. Explore the map, compare jobs and save
            the ones that fit your trade.
          </p>
        </div>
      ) : null}

      <DiscoverQuickStats
        filteredJobCount={filteredJobs.length}
        savedJobCount={savedJobIds.size}
        selectedRadius={selectedRadius}
        hasContractorLocation={radiusSearchAvailable}
        totalJobCount={jobs.length}
        onReviewAgain={resetReviewed}
      />

      <p className='mb-3 text-sm' style={{ color: 'var(--me-ink-2)' }}>
        {hasLocation
          ? `Search centre · Saved location${searchCentre ? ` (${searchCentre})` : ''}`
          : 'No saved search centre. Set a location to search by distance.'}
      </p>
      {/* Header: count + view toggle + filter chips */}
      <div className='mb-4'>
        <div className='flex items-center justify-between mb-2'>
          <h3
            className={isMintEditorial ? 't-h3' : 'text-base font-semibold'}
            style={isMintEditorial ? undefined : { color: 'var(--me-ink)' }}
          >
            Available jobs ({filteredJobs.length})
            {radiusSearchAvailable && (
              <>
                {' '}
                <span
                  className={isMintEditorial ? 't-meta' : 'text-sm font-normal'}
                  style={
                    isMintEditorial ? undefined : { color: 'var(--me-ink-3)' }
                  }
                >
                  within {selectedRadius} mi
                </span>
              </>
            )}
          </h3>

          {/* View mode toggle */}
          <div
            className='flex items-center gap-1 rounded-lg p-1'
            style={{ background: 'var(--me-bg-2)' }}
          >
            <button
              onClick={() => setViewMode('split')}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors'
              style={
                viewMode === 'split'
                  ? {
                      background: 'var(--me-surface)',
                      color: 'var(--me-ink)',
                      boxShadow: 'var(--me-shadow-btn)',
                    }
                  : { color: 'var(--me-ink-3)' }
              }
            >
              <Map className='w-3.5 h-3.5' /> Map
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors'
              style={
                viewMode === 'cards'
                  ? {
                      background: 'var(--me-surface)',
                      color: 'var(--me-ink)',
                      boxShadow: 'var(--me-shadow-btn)',
                    }
                  : { color: 'var(--me-ink-3)' }
              }
            >
              <LayoutGrid className='w-3.5 h-3.5' /> Cards
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
          onAiAssessedToggle={() => setAiAssessedOnly((v) => !v)}
          hasLocation={radiusSearchAvailable}
        />
      </div>

      {/* Content */}
      {isInitialLoading ? (
        /* Skeleton loading */
        <div
          className={
            viewMode === 'cards' ? 'grid grid-cols-2 gap-4' : 'flex gap-6'
          }
        >
          <div
            className={`space-y-4 ${viewMode === 'split' ? 'w-1/3' : 'contents'}`}
          >
            {[1, 2, 3].map((i) => (
              <DiscoverSkeletonCard key={i} />
            ))}
          </div>
          {viewMode === 'split' && (
            <div
              className='flex-1 h-64 rounded-xl animate-pulse'
              style={{ background: 'var(--me-bg-2)' }}
            />
          )}
        </div>
      ) : filteredJobs.length === 0 && viewMode !== 'split' ? (
        /* Empty state */
        <DiscoverJobsEmptyState
          hasLocation={hasLocation}
          radiusSearchAvailable={radiusSearchAvailable}
          onExpandRadius={expandRadius}
        />
      ) : viewMode === 'split' ? (
        /* Split: cards left, map right */
        <div className='flex flex-col-reverse gap-5 lg:flex-row'>
          <div
            className='w-full lg:w-1/3 space-y-4 overflow-y-auto pr-1'
            style={{ maxHeight: '680px' }}
          >
            {filteredJobs.length === 0 && (
              <DiscoverJobsEmptyState
                hasLocation={hasLocation}
                radiusSearchAvailable={radiusSearchAvailable}
                onExpandRadius={expandRadius}
              />
            )}
            {filteredJobs.map((job) => (
              <DiscoverJobCard key={job.id} {...cardProps(job)} />
            ))}
          </div>

          <div ref={mapPanelRef} className='flex-1'>
            <div
              className='rounded-xl px-5 py-3 mb-4 flex items-center gap-3'
              style={{
                background: 'var(--me-surface)',
                border: '1px solid var(--me-line)',
              }}
            >
              <MapPin
                className='w-4 h-4 flex-shrink-0'
                style={{ color: 'var(--me-brand)' }}
              />
              <span className='text-sm' style={{ color: 'var(--me-ink-2)' }}>
                {filteredJobs.length
                  ? `${filteredJobs.length} ${filteredJobs.length === 1 ? 'job' : 'jobs'} found`
                  : 'No available jobs match these filters'}
                {radiusSearchAvailable && (
                  <span style={{ color: 'var(--me-ink-3)' }}>
                    {' '}
                    · within {selectedRadius} mi
                  </span>
                )}
              </span>
              {filteredJobs.some(
                (job) => job.lat != null && job.lng != null
              ) && (
                <span
                  className='text-xs ml-auto'
                  style={{ color: 'var(--me-ink-3)' }}
                >
                  Select a card to focus its map pin
                </span>
              )}
            </div>
            <div
              className='rounded-xl overflow-hidden'
              style={{
                background: 'var(--me-surface)',
                border: '1px solid var(--me-line)',
                height: 'clamp(360px, 65vh, 640px)',
              }}
            >
              <DynamicGoogleMap
                center={{
                  // Stored location → primary service area → London.
                  lat:
                    contractorLocation?.latitude ??
                    coverageAreas[0]?.lat ??
                    51.5074,
                  lng:
                    contractorLocation?.longitude ??
                    coverageAreas[0]?.lng ??
                    -0.1278,
                }}
                zoom={12}
                onMapLoad={(map) => {
                  mapRef.current = map;
                  coverageCirclesRef.current = drawCoverageCircles(
                    map,
                    coverageCirclesRef.current,
                    coverageAreas
                  );
                  runUpdateMarkers();
                }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Cards grid view */
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {filteredJobs.map((job) => (
            <DiscoverJobCard key={job.id} {...cardProps(job)} />
          ))}
        </div>
      )}

      <LocationPromptModal
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onLocationSet={(loc) => {
          setContractorLocation(loc);
          toast.success('Location saved!');
          router.refresh();
        }}
        contractorId={contractorId}
      />
    </ContractorPageWrapper>
  );
}
