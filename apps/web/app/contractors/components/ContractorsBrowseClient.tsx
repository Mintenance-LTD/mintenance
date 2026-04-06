'use client';

import React, { useState, useId } from 'react';
import { theme } from '@/lib/theme';
import { ContractorCard } from './ContractorCard';
import { ContractorMapView } from './ContractorMapView';
import { ContractorListView } from './ContractorListView';
import { ContractorSwipeView } from './ContractorSwipeView';
import { ContractorFilters } from './ContractorFilters';
// import { ContractorComparison } from './ContractorComparison'; // Component not created yet
// import { a11yColors } from '@/lib/a11y'; // Module not found
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BrowseHero } from './ContractorsBrowse/BrowseHero';
import { BrowseToolbar, type ViewMode, type SortOption } from './ContractorsBrowse/BrowseToolbar';
import { BrowseEmptyState } from './ContractorsBrowse/BrowseEmptyState';

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

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('all');
    setSelectedLocation('all');
    setMinRating(0);
    setVerifiedOnly(false);
    setAvailableOnly(false);
    setPriceRange('all');
    setMinExperience(0);
    setHasPortfolio(false);
  };

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

      <BrowseHero
        searchInputId={searchInputId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        resultsCount={sortedContractors.length}
      />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 4rem' }}>
        <BrowseToolbar
          viewMode={viewMode}
          setViewMode={setViewMode}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          activeFiltersCount={activeFiltersCount}
          sortBy={sortBy}
          setSortBy={setSortBy}
          compareListCount={compareList.length}
          onShowComparison={() => setShowComparison(true)}
          savedCount={savedContractors.size}
        />

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
            onClearAll={clearAllFilters}
          />
        )}

        {/* Comparison Modal - TODO: Implement ContractorComparison component */}
        {/* {showComparison && compareList.length > 0 && (
          <ContractorComparison
            contractors={sortedContractors.filter(c => compareList.includes(c.id))}
            onClose={() => setShowComparison(false)}
          />
        )} */}

        {/* Results */}
        <div id={resultsRegionId} aria-live="polite" aria-atomic="false">
          {viewMode === 'grid' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.5rem',
            }}>
              {sortedContractors.map((contractor) => {
                // Transform ContractorData to ContractorCardData format
                const [firstName, ...lastNameParts] = contractor.name.split(' ');
                const cardData = {
                  id: contractor.id,
                  first_name: firstName,
                  last_name: lastNameParts.join(' '),
                  profile_image_url: contractor.avatar,
                  city: contractor.location,
                  bio: contractor.bio,
                  rating: contractor.rating,
                  total_jobs_completed: contractor.completedJobs,
                  admin_verified: contractor.verified,
                  contractor_skills: contractor.specialties.map(s => ({ skill_name: s })),
                  company_name: contractor.company,
                };

                return (
                  <ContractorCard
                    key={contractor.id}
                    contractor={cardData}
                  />
                );
              })}
            </div>
          )}

          {viewMode === 'list' && (
            <ContractorListView
              contractors={sortedContractors}
              savedContractors={Array.from(savedContractors)}
              compareList={compareList}
              onToggleSave={toggleSave}
              onToggleCompare={toggleCompare}
            />
          )}

          {viewMode === 'map' && (
            <ContractorMapView
              contractors={sortedContractors.map(contractor => {
                const [firstName, ...lastNameParts] = contractor.name.split(' ');
                return {
                  id: contractor.id,
                  first_name: firstName,
                  last_name: lastNameParts.join(' '),
                  latitude: 0, // Would need to be fetched from actual location data
                  longitude: 0, // Would need to be fetched from actual location data
                  is_visible_on_map: true,
                  rating: contractor.rating,
                  profile_image_url: contractor.avatar,
                  city: contractor.location,
                  contractor_skills: contractor.specialties.map(s => ({ skill_name: s })),
                };
              })}
            />
          )}

          {viewMode === 'swipe' && (
            <ContractorSwipeView
              contractors={sortedContractors}
              savedContractors={Array.from(savedContractors)}
              onToggleSave={toggleSave}
            />
          )}

          {sortedContractors.length === 0 && (
            <BrowseEmptyState onClearAll={clearAllFilters} />
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
