'use client';

/**
 * Mint Editorial port of `/contractor/jobs-near-you`.
 *
 * Canonical primitives used (mint-editorial.css):
 *   - `.t-h1` + `.t-body` page header with city/country greeting
 *   - `.kpi` tile for the available-jobs count
 *   - `.chip` row for sort selection (Best match / Closest /
 *     Highest budget / Newest)
 *   - native `.field` selects for numeric filters (max distance,
 *     min skill match)
 *   - `MintEditorialEmptyState` for the no-jobs case
 *   - `.btn-secondary` for the map/list view toggle
 *
 * NearbyJobCard is reused as-is — its inline `theme.colors.*` usage
 * is a known visual leak but the card is functional and rebuilding
 * it canonically is a separate ~500-LOC port (`NearbyJobCard.tsx` is
 * already on the pre-commit over-cap allowlist at 511 LOC).
 *
 * DynamicGoogleMap is also reused as-is (Google Maps is theme-agnostic
 * — the map tiles + markers are rendered by Google's CDN, not by our
 * stylesheet).
 */

import React from 'react';
import { Map as MapIcon, List as ListIcon, MapPin, Star } from 'lucide-react';
import { DynamicGoogleMap } from '@/components/maps';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';
import { NearbyJobCard } from './NearbyJobCard';

interface ContractorLocation {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
}

interface JobWithDistance {
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
  distance?: number;
  coordinates?: { lat: number; lng: number };
  requiredSkills?: string[] | null;
  matchedSkills?: string[];
  skillMatchCount?: number;
  recommendationScore?: number;
  isSaved?: boolean;
}

type SortBy = 'distance' | 'budget' | 'newest' | 'skillMatch';
type ViewMode = 'map' | 'list';

interface FilterState {
  maxDistance: number;
  minBudget: number;
  maxBudget: number;
  minSkillMatch: number;
}

interface MintEditorialJobsNearYouViewProps {
  contractorLocation: ContractorLocation;
  contractorCoords: { lat: number; lng: number } | null;
  loading: boolean;
  filteredAndSortedJobs: JobWithDistance[];
  recommendations: JobWithDistance[];
  savedJobIds: Set<string>;
  savingJobId: string | null;
  sortBy: SortBy;
  setSortBy: (value: SortBy) => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onMapLoad: (map: google.maps.Map) => void;
  onSaveJob: (jobId: string, isSaved: boolean) => void;
  onJobClick: (jobId: string) => void;
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'skillMatch', label: 'Best match' },
  { value: 'distance', label: 'Closest' },
  { value: 'budget', label: 'Highest budget' },
  { value: 'newest', label: 'Newest' },
];

export function MintEditorialJobsNearYouView({
  contractorLocation,
  contractorCoords,
  loading,
  filteredAndSortedJobs,
  recommendations,
  savedJobIds,
  savingJobId,
  sortBy,
  setSortBy,
  filters,
  setFilters,
  viewMode,
  setViewMode,
  onMapLoad,
  onSaveJob,
  onJobClick,
}: MintEditorialJobsNearYouViewProps) {
  const center = contractorCoords || { lat: 51.5074, lng: -0.1278 };
  const locationLabel = [contractorLocation.city, contractorLocation.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className='col' style={{ gap: 20 }}>
      {/* Header */}
      <div className='between' style={{ alignItems: 'flex-start' }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Discover jobs</h1>
          <p className='t-body'>
            {locationLabel
              ? `Find your next project near ${locationLabel}.`
              : 'Find your next project opportunity.'}
            {' Filter by distance, budget, or skill match.'}
          </p>
        </div>
        <div className='row' style={{ gap: 12, alignItems: 'center' }}>
          {filteredAndSortedJobs.length > 0 ? (
            <div
              className='kpi'
              style={{ minWidth: 120, padding: '12px 16px' }}
            >
              <div className='label'>Available</div>
              <div className='num' style={{ fontSize: 24 }}>
                {filteredAndSortedJobs.length}
              </div>
            </div>
          ) : null}
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
          >
            {viewMode === 'map' ? (
              <>
                <ListIcon size={14} strokeWidth={1.75} />
                List view
              </>
            ) : (
              <>
                <MapIcon size={14} strokeWidth={1.75} />
                Map view
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className='card' style={{ padding: 14 }}>
        <div className='col' style={{ gap: 12 }}>
          {/* Sort chips */}
          <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type='button'
                className={`chip ${sortBy === opt.value ? 'on' : ''}`}
                onClick={() => setSortBy(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Numeric filters */}
          <div
            className='row'
            style={{ gap: 16, flexWrap: 'wrap', alignItems: 'center' }}
          >
            <label className='row' style={{ gap: 8, alignItems: 'center' }}>
              <span className='t-meta' style={{ fontWeight: 600 }}>
                Max distance
              </span>
              <select
                className='field'
                value={filters.maxDistance}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    maxDistance: Number(e.target.value),
                  })
                }
                style={{
                  padding: '6px 10px',
                  fontSize: 13,
                  width: 'auto',
                  minWidth: 110,
                  fontFamily: 'inherit',
                }}
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
                <option value={500}>500+ km</option>
              </select>
            </label>

            <label className='row' style={{ gap: 8, alignItems: 'center' }}>
              <span className='t-meta' style={{ fontWeight: 600 }}>
                Min skill match
              </span>
              <select
                className='field'
                value={filters.minSkillMatch}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minSkillMatch: Number(e.target.value),
                  })
                }
                style={{
                  padding: '6px 10px',
                  fontSize: 13,
                  width: 'auto',
                  minWidth: 130,
                  fontFamily: 'inherit',
                }}
              >
                <option value={0}>Any</option>
                <option value={1}>1+ skills</option>
                <option value={2}>2+ skills</option>
                <option value={3}>3+ skills</option>
                <option value={4}>4+ skills</option>
                <option value={5}>All skills</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Map + list grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'list' ? '1fr' : '2fr 1fr',
          gap: 16,
          height: viewMode === 'list' ? 'auto' : 'calc(100vh - 420px)',
          minHeight: viewMode === 'list' ? 'auto' : 600,
        }}
      >
        {viewMode === 'map' ? (
          <div
            className='card'
            style={{
              padding: 0,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--me-ink-3)',
                  fontSize: 13,
                }}
              >
                Loading map…
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
                  padding: 32,
                  textAlign: 'center',
                  color: 'var(--me-ink-3)',
                  gap: 8,
                }}
              >
                <MapPin
                  size={36}
                  strokeWidth={1.5}
                  style={{ color: 'var(--me-ink-3)' }}
                />
                <p
                  className='t-h3'
                  style={{ marginTop: 8, color: 'var(--me-ink)' }}
                >
                  Location not available
                </p>
                <p className='t-body' style={{ maxWidth: 360 }}>
                  Please update your profile location to see jobs near you.
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* Jobs list */}
        <div
          className='col'
          style={{
            gap: 12,
            overflowY: viewMode === 'list' ? 'visible' : 'auto',
            paddingRight: viewMode === 'list' ? 0 : 4,
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
                color: 'var(--me-ink-3)',
                fontSize: 13,
              }}
            >
              Loading jobs…
            </div>
          ) : filteredAndSortedJobs.length === 0 ? (
            <MintEditorialEmptyState
              icon={MapPin}
              title='No jobs found'
              body='Try widening your distance filter or lowering the minimum skill match to see more opportunities.'
            />
          ) : (
            <>
              <div
                className='t-meta'
                style={{ fontWeight: 600, marginBottom: 4 }}
              >
                Showing {filteredAndSortedJobs.length}{' '}
                {filteredAndSortedJobs.length === 1 ? 'job' : 'jobs'}
              </div>
              {filteredAndSortedJobs.map((job) => (
                <NearbyJobCard
                  key={job.id}
                  job={job}
                  savedJobIds={savedJobIds}
                  savingJobId={savingJobId}
                  onSave={onSaveJob}
                  onClick={onJobClick}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Recommended */}
      {recommendations.length > 0 ? (
        <div className='col' style={{ gap: 12, marginTop: 8 }}>
          <div className='row' style={{ gap: 10, alignItems: 'center' }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--me-brand-soft)',
                color: 'var(--me-brand)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Star size={16} strokeWidth={1.75} />
            </span>
            <h2 className='t-h2'>Recommended for you</h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {recommendations.map((job) => (
              <NearbyJobCard
                key={job.id}
                job={job}
                isRecommended={true}
                savedJobIds={savedJobIds}
                savingJobId={savingJobId}
                onSave={onSaveJob}
                onClick={onJobClick}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
