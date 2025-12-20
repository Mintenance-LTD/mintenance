'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { SearchBar, ContractorCard, Badge, Button } from '@/components/airbnb-system';
import { MapPin, SlidersHorizontal, Grid, List, Check } from 'lucide-react';

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

interface ContractorData {
  id: string;
  name: string;
  company_name: string | null;
  city: string | null;
  profile_image: string | null;
  hourly_rate: number | null;
  rating: number;
  review_count: number;
  verified: boolean;
  skills: string[];
  completed_jobs: number;
  response_time: string;
}

interface ContractorsBrowseAirbnbProps {
  contractors: ContractorData[];
  totalCount: number;
}

// Memoized contractor card component to prevent unnecessary re-renders
const MemoizedContractorCard = React.memo(ContractorCard, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.rating === nextProps.rating &&
    prevProps.reviewCount === nextProps.reviewCount &&
    prevProps.hourlyRate === nextProps.hourlyRate
  );
});
MemoizedContractorCard.displayName = 'MemoizedContractorCard';

export const ContractorsBrowseAirbnb = React.memo(function ContractorsBrowseAirbnb({
  contractors,
  totalCount
}: ContractorsBrowseAirbnbProps) {
  const [searchParams, setSearchParams] = useState({
    service: '',
    location: '',
    date: ''
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minRating: 0,
    verified: false,
    maxRate: 0,
    skills: [] as string[]
  });

  // Debounce search params to avoid excessive filtering
  const debouncedSearchParams = useDebounce(searchParams, 300);

  // Memoize expensive computations - extract unique skills and locations
  const allSkills = useMemo(() =>
    Array.from(new Set(contractors.flatMap(c => c.skills))).slice(0, 10),
    [contractors]
  );

  const allCities = useMemo(() =>
    Array.from(new Set(contractors.map(c => c.city).filter(Boolean))),
    [contractors]
  );

  // Memoize filtered contractors to avoid re-filtering on every render
  const filteredContractors = useMemo(() => {
    return contractors.filter(contractor => {
      // Apply rating filter
      if (filters.minRating > 0 && contractor.rating < filters.minRating) return false;

      // Apply verified filter
      if (filters.verified && !contractor.verified) return false;

      // Apply max rate filter
      if (filters.maxRate > 0 && contractor.hourly_rate && contractor.hourly_rate > filters.maxRate) return false;

      // Apply skills filter
      if (filters.skills.length > 0) {
        const hasSkill = filters.skills.some(skill => contractor.skills.includes(skill));
        if (!hasSkill) return false;
      }

      return true;
    });
  }, [contractors, filters]);

  // Memoized event handlers to prevent child re-renders
  const handleSearch = useCallback((params: { service?: string; location?: string; date?: string }) => {
    setSearchParams(prev => ({ ...prev, ...params }));
    // In real implementation, this would trigger a server-side search
    // console.log('Search:', params);
  }, []);

  const toggleSkillFilter = useCallback((skill: string) => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({ minRating: 0, verified: false, maxRate: 0, skills: [] });
  }, []);

  const handleVerifiedToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, verified: e.target.checked }));
  }, []);

  const handleMinRatingChange = useCallback((rating: number) => {
    setFilters(prev => ({ ...prev, minRating: prev.minRating === rating ? 0 : rating }));
  }, []);

  const handleMaxRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, maxRate: parseInt(e.target.value) }));
  }, []);

  const clearMaxRate = useCallback(() => {
    setFilters(prev => ({ ...prev, maxRate: 0 }));
  }, []);

  const toggleViewMode = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
  }, []);

  const toggleFiltersPanel = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  // Memoized contractor click handler
  const handleContractorClick = useCallback((id: string) => {
    window.location.href = `/contractors/${id}`;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Search Section */}
      <section className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Trusted Contractors</h1>
            <p className="text-gray-600">
              {totalCount.toLocaleString()} verified professionals ready to help
            </p>
          </div>

          <SearchBar
            onSearch={handleSearch}
            variant="inline"
          />
        </div>
      </section>

      {/* Filters and Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="card-airbnb p-6 sticky top-32">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Clear all
                </button>
              </div>

              {/* Verified Only */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    filters.verified
                      ? 'bg-teal-500 border-teal-500'
                      : 'border-gray-300 group-hover:border-teal-400'
                  }`}>
                    {filters.verified && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.verified}
                    onChange={handleVerifiedToggle}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-gray-700">Verified only</span>
                </label>
              </div>

              {/* Minimum Rating */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Minimum Rating
                </label>
                <div className="space-y-2">
                  {[4.5, 4.0, 3.5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleMinRatingChange(rating)}
                      className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        filters.minRating === rating
                          ? 'bg-teal-50 text-teal-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {rating}+ stars
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Skills
                </label>
                <div className="flex flex-wrap gap-2">
                  {allSkills.map(skill => (
                    <button
                      key={skill}
                      onClick={() => toggleSkillFilter(skill)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        filters.skills.includes(skill)
                          ? 'bg-teal-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Hourly Rate */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Max Hourly Rate
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={filters.maxRate}
                  onChange={handleMaxRateChange}
                  className="w-full accent-teal-500"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-600">
                    {filters.maxRate === 0 ? 'Any' : `£${filters.maxRate}/hr`}
                  </span>
                  {filters.maxRate > 0 && (
                    <button
                      onClick={clearMaxRate}
                      className="text-xs text-teal-600 hover:text-teal-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {filteredContractors.length} {filteredContractors.length === 1 ? 'Contractor' : 'Contractors'}
                </h2>
                {filters.skills.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-gray-600">Filtered by:</span>
                    {filters.skills.map(skill => (
                      <Badge key={skill} variant="info" size="sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => toggleViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-teal-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => toggleViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-teal-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contractors Grid/List */}
            {filteredContractors.length === 0 ? (
              <div className="card-airbnb p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SlidersHorizontal className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No contractors found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your filters to see more results</p>
                <Button
                  variant="primary"
                  onClick={clearAllFilters}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 stagger-children'
                  : 'space-y-4'
              }>
                {filteredContractors.map((contractor, idx) => (
                  <div
                    key={contractor.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <MemoizedContractorCard
                      id={contractor.id}
                      name={contractor.name}
                      image={contractor.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(contractor.name)}&background=14b8a6&color=fff&size=200`}
                      category={contractor.company_name || 'General Contractor'}
                      rating={contractor.rating}
                      reviewCount={contractor.review_count}
                      hourlyRate={`£${contractor.hourly_rate || 50}`}
                      location={contractor.city || 'Location not specified'}
                      isVerified={contractor.verified}
                      skills={contractor.skills.slice(0, 3)}
                      onClick={handleContractorClick}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {filteredContractors.length > 0 && filteredContractors.length < totalCount && (
              <div className="mt-12 text-center">
                <Button variant="outline" size="lg">
                  Load More Contractors
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Button */}
      <button
        onClick={toggleFiltersPanel}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-teal-500 text-white rounded-full shadow-2xl flex items-center justify-center z-40 hover:bg-teal-600 transition-colors"
        aria-label="Toggle filters"
      >
        <SlidersHorizontal className="w-6 h-6" />
      </button>
    </div>
  );
});
