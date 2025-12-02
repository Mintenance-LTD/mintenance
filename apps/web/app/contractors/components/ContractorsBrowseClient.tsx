'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { ContractorCard } from './ContractorCard';
import { ContractorMapView } from './ContractorMapView';
// import { ContractorListView } from './ContractorListView'; // Component not created yet
// import { ContractorSwipeView } from './ContractorSwipeView'; // Component not created yet
// import { ContractorFilters } from './ContractorFilters'; // Component not created yet
// import { ContractorComparison } from './ContractorComparison'; // Component not created yet
// import { a11yColors } from '@/lib/a11y'; // Module not found
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ContractorData {
  id: string;
  name: string;
  company?: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  completedJobs: number;
  location: string;
  avatar?: string;
  verified: boolean;
  bio?: string;
  responseTime?: string;
  portfolio?: string[];
  distance?: number;
  priceRange?: string;
  yearsExperience?: number;
}

interface ContractorsBrowseClientProps {
  contractors: ContractorData[];
}

export function ContractorsBrowseClient({
  contractors,
}: ContractorsBrowseClientProps) {
  return (
    <ErrorBoundary componentName="ContractorsBrowseClient">
      <ContractorsBrowseContent contractors={contractors} />
    </ErrorBoundary>
  );
}

type ViewMode = 'grid' | 'list' | 'map' | 'swipe';
type SortOption = 'recommended' | 'nearest' | 'rating' | 'reviews' | 'recent';

function ContractorsBrowseContent({
  contractors,
}: ContractorsBrowseClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [minExperience, setMinExperience] = useState<number>(0);
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [savedContractors, setSavedContractors] = useState<Set<string>>(new Set());
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Generate unique IDs for accessibility
  const searchInputId = useId();
  const resultsRegionId = useId();

  // Extract unique skills and cities from contractors
  const uniqueSkills = Array.from(
    new Set(contractors.flatMap(c => c.specialties))
  ).sort();

  const uniqueCities = Array.from(
    new Set(contractors.map(c => c.location).filter(Boolean))
  ).sort();

  // Toggle save/favorite contractor
  const toggleSave = (contractorId: string) => {
    setSavedContractors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contractorId)) {
        newSet.delete(contractorId);
      } else {
        newSet.add(contractorId);
      }
      return newSet;
    });
  };

  // Toggle contractor in comparison list
  const toggleCompare = (contractorId: string) => {
    setCompareList(prev => {
      if (prev.includes(contractorId)) {
        return prev.filter(id => id !== contractorId);
      }
      if (prev.length >= 4) {
        return prev; // Max 4 contractors
      }
      return [...prev, contractorId];
    });
  };

  // Filter contractors based on search query and filters
  const filteredContractors = contractors.filter((contractor) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = contractor.name.toLowerCase();
      const company = contractor.company?.toLowerCase() || '';
      const skills = contractor.specialties.join(' ').toLowerCase();
      const location = contractor.location.toLowerCase();

      if (!name.includes(query) && !company.includes(query) && !skills.includes(query) && !location.includes(query)) {
        return false;
      }
    }

    // Specialty filter
    if (selectedSpecialty !== 'all' && !contractor.specialties.some(s => s === selectedSpecialty)) {
      return false;
    }

    // Location filter
    if (selectedLocation !== 'all' && contractor.location !== selectedLocation) {
      return false;
    }

    // Rating filter
    if (minRating > 0 && contractor.rating < minRating) {
      return false;
    }

    // Verified only filter
    if (verifiedOnly && !contractor.verified) {
      return false;
    }

    // Distance filter
    if (contractor.distance && contractor.distance > maxDistance) {
      return false;
    }

    // Price range filter
    if (priceRange !== 'all' && contractor.priceRange !== priceRange) {
      return false;
    }

    // Experience filter
    if (minExperience > 0 && (contractor.yearsExperience || 0) < minExperience) {
      return false;
    }

    // Portfolio filter
    if (hasPortfolio && (!contractor.portfolio || contractor.portfolio.length === 0)) {
      return false;
    }

    return true;
  });

  // Sort contractors
  const sortedContractors = [...filteredContractors].sort((a, b) => {
    switch (sortBy) {
      case 'nearest':
        return (a.distance || 999) - (b.distance || 999);
      case 'rating':
        return b.rating - a.rating;
      case 'reviews':
        return b.reviewCount - a.reviewCount;
      case 'recent':
        return 0; // Would need createdAt field
      case 'recommended':
      default:
        // Weighted score: rating (40%) + jobs (30%) + verified (30%)
        const scoreA = (a.rating * 0.4) + (Math.min(a.completedJobs / 100, 1) * 0.3) + (a.verified ? 0.3 : 0);
        const scoreB = (b.rating * 0.4) + (Math.min(b.completedJobs / 100, 1) * 0.3) + (b.verified ? 0.3 : 0);
        return scoreB - scoreA;
    }
  });

  const activeFiltersCount = [
    selectedSpecialty !== 'all',
    selectedLocation !== 'all',
    minRating > 0,
    verifiedOnly,
    availableOnly,
    priceRange !== 'all',
    minExperience > 0,
    hasPortfolio,
  ].filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      {/* Skip Link for Keyboard Navigation */}
      <a
        href={`#${resultsRegionId}`}
        className="skip-link"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          zIndex: 999,
          padding: '1rem 1.5rem',
          backgroundColor: '#0066CC',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '0 0 0.375rem 0.375rem',
          fontWeight: 600,
        }}
      >
        Skip to contractor results
      </a>

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0066CC 0%, #004C99 100%)',
        color: 'white',
        padding: '3rem 2rem',
        marginBottom: '2rem',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '800',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}>
            Find Trusted Contractors
          </h1>
          <p style={{
            fontSize: '1.25rem',
            opacity: 0.95,
            marginBottom: '2rem',
          }}
            aria-live="polite"
            aria-atomic="true"
          >
            Browse {sortedContractors.length} verified contractor{sortedContractors.length !== 1 ? 's' : ''} ready to help with your project
          </p>

          {/* Search Bar */}
          <div style={{
            maxWidth: '800px',
            position: 'relative',
          }}>
            <Icon name="search" size={20} color="#9CA3AF" aria-hidden="true" style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
            }} />
            <input
              id={searchInputId}
              type="search"
              placeholder="Search contractors by name, skills, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-describedby={searchQuery ? `${searchInputId}-results` : undefined}
              className="search-input"
              style={{
                width: '100%',
                padding: '1rem 3rem',
                fontSize: '1rem',
                borderRadius: '12px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                color: '#111827',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 4rem' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          {/* Left: View Modes & Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* View Toggle Buttons */}
            <div
              role="group"
              aria-label="View mode toggle"
              style={{
                display: 'flex',
                gap: '0.25rem',
                backgroundColor: 'white',
                padding: '0.25rem',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Switch to grid view"
                aria-pressed={viewMode === 'grid'}
                className="view-toggle-btn"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: viewMode === 'grid' ? '#0066CC' : 'transparent',
                  color: viewMode === 'grid' ? 'white' : '#6B7280',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Icon name="dashboard" size={16} color={viewMode === 'grid' ? 'white' : '#6B7280'} aria-hidden="true" />
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="Switch to list view"
                aria-pressed={viewMode === 'list'}
                className="view-toggle-btn"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: viewMode === 'list' ? '#0066CC' : 'transparent',
                  color: viewMode === 'list' ? 'white' : '#6B7280',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Icon name="list" size={16} color={viewMode === 'list' ? 'white' : '#6B7280'} aria-hidden="true" />
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                aria-label="Switch to map view"
                aria-pressed={viewMode === 'map'}
                className="view-toggle-btn"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: viewMode === 'map' ? '#0066CC' : 'transparent',
                  color: viewMode === 'map' ? 'white' : '#6B7280',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Icon name="map" size={16} color={viewMode === 'map' ? 'white' : '#6B7280'} aria-hidden="true" />
                Map
              </button>
              <button
                onClick={() => setViewMode('swipe')}
                aria-label="Switch to swipe view"
                aria-pressed={viewMode === 'swipe'}
                className="view-toggle-btn"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: viewMode === 'swipe' ? '#0066CC' : 'transparent',
                  color: viewMode === 'swipe' ? 'white' : '#6B7280',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Icon name="heart" size={16} color={viewMode === 'swipe' ? 'white' : '#6B7280'} aria-hidden="true" />
                Swipe
              </button>
            </div>

            {/* Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <Icon name="filter" size={16} color="#374151" aria-hidden="true" />
              Filters
              {activeFiltersCount > 0 && (
                <span style={{
                  backgroundColor: '#0066CC',
                  color: 'white',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Right: Sort & Compare */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                padding: '0.5rem 2.5rem 0.5rem 1rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <option value="recommended">Recommended</option>
              <option value="nearest">Nearest to Me</option>
              <option value="rating">Highest Rated</option>
              <option value="reviews">Most Reviews</option>
              <option value="recent">Recently Joined</option>
            </select>

            {/* Compare Button */}
            {compareList.length > 0 && (
              <button
                onClick={() => setShowComparison(true)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                Compare ({compareList.length})
              </button>
            )}

            {/* Saved Count */}
            {savedContractors.size > 0 && (
              <div style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <Icon name="heart" size={16} color="#92400E" aria-hidden="true" />
                {savedContractors.size} saved
              </div>
            )}
          </div>
        </div>

        {/* Filters Drawer */}
        {showFilters && (
          <ContractorFilters
            selectedSpecialty={selectedSpecialty}
            setSelectedSpecialty={setSelectedSpecialty}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            minRating={minRating}
            setMinRating={setMinRating}
            verifiedOnly={verifiedOnly}
            setVerifiedOnly={setVerifiedOnly}
            availableOnly={availableOnly}
            setAvailableOnly={setAvailableOnly}
            maxDistance={maxDistance}
            setMaxDistance={setMaxDistance}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            minExperience={minExperience}
            setMinExperience={setMinExperience}
            hasPortfolio={hasPortfolio}
            setHasPortfolio={setHasPortfolio}
            uniqueSkills={uniqueSkills}
            uniqueCities={uniqueCities}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Comparison Modal */}
        {showComparison && compareList.length > 0 && (
          <ContractorComparison
            contractors={sortedContractors.filter(c => compareList.includes(c.id))}
            onClose={() => setShowComparison(false)}
          />
        )}

        {/* Results */}
        <div id={resultsRegionId} aria-live="polite" aria-atomic="false">
          {viewMode === 'grid' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.5rem',
            }}>
              {sortedContractors.map((contractor) => (
                <ContractorCard
                  key={contractor.id}
                  contractor={contractor}
                  isSaved={savedContractors.has(contractor.id)}
                  isComparing={compareList.includes(contractor.id)}
                  onToggleSave={() => toggleSave(contractor.id)}
                  onToggleCompare={() => toggleCompare(contractor.id)}
                />
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <ContractorListView
              contractors={sortedContractors}
              savedContractors={savedContractors}
              compareList={compareList}
              onToggleSave={toggleSave}
              onToggleCompare={toggleCompare}
            />
          )}

          {viewMode === 'map' && (
            <ContractorMapView contractors={sortedContractors} />
          )}

          {viewMode === 'swipe' && (
            <ContractorSwipeView
              contractors={sortedContractors}
              savedContractors={savedContractors}
              onToggleSave={toggleSave}
            />
          )}

          {sortedContractors.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              backgroundColor: 'white',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
              }}>
                🔍
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '0.5rem',
              }}>
                No contractors found
              </h3>
              <p style={{
                fontSize: '1rem',
                color: '#6B7280',
                marginBottom: '1.5rem',
              }}>
                Try adjusting your filters or search criteria
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSpecialty('all');
                  setSelectedLocation('all');
                  setMinRating(0);
                  setVerifiedOnly(false);
                  setAvailableOnly(false);
                  setPriceRange('all');
                  setMinExperience(0);
                  setHasPortfolio(false);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0066CC',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Styles with Focus States */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Skip Link Focus */
          .skip-link:focus {
            left: 0.5rem;
            outline: none;
            box-shadow: 0 0 0 2px white, 0 0 0 4px ${theme.colors.primary};
          }

          /* Screen Reader Only */
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
          }

          /* Search Input Focus - WCAG Compliant */
          .search-input:focus {
            outline: none;
            border-color: ${theme.colors.primary} !important;
            box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
          }

          /* Filter Select Focus - WCAG Compliant */
          .filter-select:focus {
            outline: none;
            border-color: ${theme.colors.primary} !important;
            box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
          }

          /* Button Focus States - WCAG 2.1 Compliant */
          .view-toggle-btn:focus {
            outline: none;
            box-shadow: 0 0 0 2px white, 0 0 0 4px ${theme.colors.primary};
          }

          .clear-search-icon-btn:focus {
            outline: none;
            box-shadow: 0 0 0 2px ${theme.colors.primary};
            border-radius: 4px;
          }

          .clear-filters-button:focus {
            outline: none;
            box-shadow: 0 0 0 2px ${theme.colors.primary};
          }

          .clear-search-button:focus {
            outline: none;
            box-shadow: 0 0 0 2px white, 0 0 0 4px ${theme.colors.primary};
          }

          /* Hover States */
          .clear-filters-button:hover {
            background-color: ${theme.colors.primary} !important;
            color: white !important;
          }

          .clear-search-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }

          .view-toggle-btn:hover {
            opacity: 0.9;
          }

          /* High Contrast Mode Support */
          @media (prefers-contrast: high) {
            .search-input,
            .filter-select {
              border-width: 2px;
            }

            .view-toggle-btn:focus,
            .clear-filters-button:focus,
            .clear-search-button:focus {
              outline: 2px solid currentColor;
              outline-offset: 2px;
            }
          }

          /* Reduced Motion Support */
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `
      }} />
    </div>
  );
}
