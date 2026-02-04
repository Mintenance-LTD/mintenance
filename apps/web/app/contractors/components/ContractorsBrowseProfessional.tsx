'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  X,
  Star,
  MapPin,
  Shield,
  Grid3x3,
  List,
  ChevronDown,
  CheckCircle2,
  Award,
  Clock,
  TrendingUp,
  FileCheck,
  BadgeCheck,
  Users,
  Sparkles
} from 'lucide-react';

/* ==========================================
   TYPE DEFINITIONS
   ========================================== */

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
  years_experience?: number;
  distance?: number;
}

interface ContractorsBrowseProfessionalProps {
  contractors: ContractorData[];
  totalCount: number;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'recommended' | 'rating' | 'experience' | 'rate_low' | 'rate_high';

/* ==========================================
   MAIN COMPONENT
   ========================================== */

export function ContractorsBrowseProfessional({
  contractors,
  totalCount
}: ContractorsBrowseProfessionalProps) {
  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');

  // Filter States
  const [filters, setFilters] = useState({
    minRating: 0,
    verified: false,
    skills: [] as string[],
    maxRate: 0,
    minExperience: 0,
    location: ''
  });

  // Extract unique values for filters
  const allSkills = useMemo(() =>
    Array.from(new Set(contractors.flatMap(c => c.skills))).sort().slice(0, 12),
    [contractors]
  );

  const allLocations = useMemo(() =>
    Array.from(new Set(contractors.map(c => c.city).filter((city): city is string => Boolean(city)))).sort(),
    [contractors]
  );

  // Filter Contractors
  const filteredContractors = useMemo(() => {
    return contractors.filter(contractor => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchText = `${contractor.name} ${contractor.company_name} ${contractor.skills.join(' ')} ${contractor.city}`.toLowerCase();
        if (!searchText.includes(query)) return false;
      }

      // Rating filter
      if (filters.minRating > 0 && contractor.rating < filters.minRating) return false;

      // Verified filter
      if (filters.verified && !contractor.verified) return false;

      // Skills filter
      if (filters.skills.length > 0) {
        const hasSkill = filters.skills.some(skill => contractor.skills.includes(skill));
        if (!hasSkill) return false;
      }

      // Max rate filter
      if (filters.maxRate > 0 && contractor.hourly_rate && contractor.hourly_rate > filters.maxRate) {
        return false;
      }

      // Min experience filter
      if (filters.minExperience > 0 && (contractor.years_experience || 0) < filters.minExperience) {
        return false;
      }

      // Location filter
      if (filters.location && contractor.city !== filters.location) return false;

      return true;
    });
  }, [contractors, searchQuery, filters]);

  // Sort Contractors
  const sortedContractors = useMemo(() => {
    const sorted = [...filteredContractors];

    switch (sortBy) {
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'experience':
        return sorted.sort((a, b) => (b.years_experience || 0) - (a.years_experience || 0));
      case 'rate_low':
        return sorted.sort((a, b) => (a.hourly_rate || 999) - (b.hourly_rate || 999));
      case 'rate_high':
        return sorted.sort((a, b) => (b.hourly_rate || 0) - (a.hourly_rate || 0));
      case 'recommended':
      default:
        return sorted.sort((a, b) => {
          const scoreA = (a.rating * 0.4) + (Math.min(a.completed_jobs / 50, 1) * 0.3) + (a.verified ? 0.3 : 0);
          const scoreB = (b.rating * 0.4) + (Math.min(b.completed_jobs / 50, 1) * 0.3) + (b.verified ? 0.3 : 0);
          return scoreB - scoreA;
        });
    }
  }, [filteredContractors, sortBy]);

  // Event Handlers
  const toggleSkillFilter = useCallback((skill: string) => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      minRating: 0,
      verified: false,
      skills: [],
      maxRate: 0,
      minExperience: 0,
      location: ''
    });
    setSearchQuery('');
  }, []);

  const activeFiltersCount = [
    filters.minRating > 0,
    filters.verified,
    filters.skills.length > 0,
    filters.maxRate > 0,
    filters.minExperience > 0,
    filters.location,
    searchQuery
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(20, 184, 166, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(251, 191, 36, 0.2) 0%, transparent 50%)'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-6 h-6 text-amber-400" />
              <span className="text-amber-400 font-semibold text-sm tracking-wide uppercase">
                Premium Professionals
              </span>
            </div>

            <h1 className="text-5xl font-bold mb-4 leading-tight">
              Find Your Perfect
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                Contractor Match
              </span>
            </h1>

            <p className="text-xl text-gray-300 mb-8">
              {totalCount.toLocaleString()} verified professionals ready to bring your project to life
            </p>

            {/* Hero Search Bar */}
            <div className="bg-white rounded-2xl shadow-2xl p-2 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-3 px-4">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, skill, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 py-3 text-gray-900 placeholder-gray-400 focus:outline-none text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
              <button className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                Search
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300">
                <Shield className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-semibold text-white">Verified Professionals</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300">
                <BadgeCheck className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-semibold text-white">Insured & Licensed</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300">
                <FileCheck className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-semibold text-white">Background Checked</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-6 mt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-400">{totalCount.toLocaleString()}+</div>
                <div className="text-sm text-gray-400 mt-1">Verified Professionals</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-400">50,000+</div>
                <div className="text-sm text-gray-400 mt-1">Jobs Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-400">4.8</div>
                <div className="text-sm text-gray-400 mt-1">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-400">98%</div>
                <div className="text-sm text-gray-400 mt-1">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className={`
            ${showFilters ? 'block' : 'hidden'}
            lg:block w-full lg:w-80 flex-shrink-0
            fixed lg:sticky top-0 left-0 right-0 lg:top-8
            h-screen lg:h-auto overflow-y-auto
            bg-white lg:bg-transparent z-50 lg:z-auto
            p-6 lg:p-0
          `}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-8">
              {/* Filter Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-slate-900" />
                  <h2 className="text-lg font-bold text-slate-900">Filters</h2>
                  {activeFiltersCount > 0 && (
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold">
                      {activeFiltersCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-teal-600 hover:text-teal-700 font-semibold transition-colors"
                >
                  Clear all
                </button>
              </div>

              {/* Verified Only */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                    ${filters.verified
                      ? 'bg-teal-500 border-teal-500'
                      : 'border-gray-300 group-hover:border-teal-400'}
                  `}>
                    {filters.verified && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.verified}
                    onChange={(e) => setFilters(prev => ({ ...prev, verified: e.target.checked }))}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-semibold text-slate-900">Verified Only</span>
                  </div>
                </label>
              </div>

              {/* Minimum Rating */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <label className="block text-sm font-bold text-slate-900 mb-3">
                  Minimum Rating
                </label>
                <div className="space-y-2">
                  {[5, 4.5, 4.0, 3.5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        minRating: prev.minRating === rating ? 0 : rating
                      }))}
                      className={`
                        w-full px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all
                        flex items-center justify-between
                        ${filters.minRating === rating
                          ? 'bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border-2 border-teal-200'
                          : 'hover:bg-gray-50 text-gray-700 border-2 border-transparent'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{rating}+ stars</span>
                      </div>
                      {filters.minRating === rating && (
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills Filter */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <label className="block text-sm font-bold text-slate-900 mb-3">
                  Skills & Specialties
                </label>
                <div className="flex flex-wrap gap-2">
                  {allSkills.map(skill => (
                    <button
                      key={skill}
                      onClick={() => toggleSkillFilter(skill)}
                      className={`
                        px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                        ${filters.skills.includes(skill)
                          ? 'bg-teal-500 text-white shadow-md scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                      `}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              {allLocations.length > 0 && (
                <div className="mb-6 pb-6 border-b border-gray-100">
                  <label className="block text-sm font-bold text-slate-900 mb-3">
                    Location
                  </label>
                  <select
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-teal-500 transition-colors"
                  >
                    <option value="">All Locations</option>
                    {allLocations.map(location => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Max Hourly Rate */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <label className="block text-sm font-bold text-slate-900 mb-3">
                  Max Hourly Rate
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={filters.maxRate}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxRate: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-semibold text-slate-900">
                    {filters.maxRate === 0 ? 'Any rate' : `£${filters.maxRate}/hr`}
                  </span>
                  {filters.maxRate > 0 && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, maxRate: 0 }))}
                      className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Experience Filter */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-3">
                  Minimum Experience
                </label>
                <div className="space-y-2">
                  {[
                    { years: 0, label: 'Any experience' },
                    { years: 2, label: '2+ years' },
                    { years: 5, label: '5+ years' },
                    { years: 10, label: '10+ years' }
                  ].map(({ years, label }) => (
                    <button
                      key={years}
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        minExperience: prev.minExperience === years ? 0 : years
                      }))}
                      className={`
                        w-full px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all
                        ${filters.minExperience === years
                          ? 'bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border-2 border-teal-200'
                          : 'hover:bg-gray-50 text-gray-700 border-2 border-transparent'}
                      `}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Close Button */}
              <button
                onClick={() => setShowFilters(false)}
                className="lg:hidden mt-6 w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
              >
                View {sortedContractors.length} Results
              </button>
            </div>
          </aside>

          {/* Main Results */}
          <main className="flex-1">
            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Results Count */}
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {sortedContractors.length} {sortedContractors.length === 1 ? 'Contractor' : 'Contractors'}
                  </h2>
                  {activeFiltersCount > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Filtered from {totalCount.toLocaleString()} total
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="pl-4 pr-10 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500 appearance-none cursor-pointer transition-colors"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="rating">Highest Rated</option>
                      <option value="experience">Most Experience</option>
                      <option value="rate_low">Price: Low to High</option>
                      <option value="rate_high">Price: High to Low</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === 'grid'
                          ? 'bg-white text-teal-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      aria-label="Grid view"
                    >
                      <Grid3x3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === 'list'
                          ? 'bg-white text-teal-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      aria-label="List view"
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Mobile Filter Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-800 transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span className="px-2 py-0.5 bg-teal-500 rounded-full text-xs">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Contractors Grid/List */}
            {sortedContractors.length === 0 ? (
              <EmptyState onClearFilters={clearAllFilters} />
            ) : (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {sortedContractors.map((contractor) => (
                  viewMode === 'grid' ? (
                    <ContractorGridCard key={contractor.id} contractor={contractor} />
                  ) : (
                    <ContractorListCard key={contractor.id} contractor={contractor} />
                  )
                ))}
              </div>
            )}

            {/* Load More */}
            {sortedContractors.length > 0 && sortedContractors.length < totalCount && (
              <div className="mt-8 text-center">
                <button className="px-8 py-4 bg-white text-slate-900 border-2 border-slate-900 rounded-xl font-semibold hover:bg-slate-900 hover:text-white transition-all duration-200 shadow-sm hover:shadow-lg">
                  Load More Contractors
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Backdrop */}
      {showFilters && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setShowFilters(false)}
        />
      )}

      {/* Trust Section */}
      <TrustSection />

      {/* CTA Section */}
      <CTASection />
    </div>
  );
}

/* ==========================================
   SKELETON LOADER
   ========================================== */

function SkeletonGridCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      {/* Image Skeleton */}
      <div className="h-56 bg-gray-200" />

      {/* Content Skeleton */}
      <div className="p-6">
        <div className="h-6 bg-gray-200 rounded-lg mb-2 w-3/4" />
        <div className="h-4 bg-gray-200 rounded-lg mb-4 w-1/2" />

        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded-lg w-20" />
          <div className="h-4 bg-gray-200 rounded-lg w-16" />
        </div>

        <div className="flex gap-2 mb-4">
          <div className="h-6 bg-gray-200 rounded-full w-20" />
          <div className="h-6 bg-gray-200 rounded-full w-24" />
          <div className="h-6 bg-gray-200 rounded-full w-16" />
        </div>

        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
          <div className="h-4 bg-gray-200 rounded-lg w-16" />
          <div className="h-4 bg-gray-200 rounded-lg w-20" />
        </div>

        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded-lg w-24" />
          <div className="h-10 bg-gray-200 rounded-xl w-32" />
        </div>
      </div>
    </div>
  );
}

function SkeletonListCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
      <div className="flex gap-6">
        <div className="w-32 h-32 bg-gray-200 rounded-xl flex-shrink-0" />
        <div className="flex-1">
          <div className="h-7 bg-gray-200 rounded-lg mb-2 w-1/3" />
          <div className="h-5 bg-gray-200 rounded-lg mb-4 w-1/4" />
          <div className="flex gap-6 mb-4">
            <div className="h-4 bg-gray-200 rounded-lg w-24" />
            <div className="h-4 bg-gray-200 rounded-lg w-20" />
            <div className="h-4 bg-gray-200 rounded-lg w-28" />
          </div>
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-gray-200 rounded-full w-20" />
            <div className="h-6 bg-gray-200 rounded-full w-24" />
            <div className="h-6 bg-gray-200 rounded-full w-20" />
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="h-8 bg-gray-200 rounded-lg w-28" />
            <div className="h-11 bg-gray-200 rounded-xl w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   CONTRACTOR GRID CARD
   ========================================== */

function ContractorGridCard({ contractor }: { contractor: ContractorData }) {
  const imageUrl = contractor.profile_image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(contractor.name)}&background=14b8a6&color=fff&size=400`;

  return (
    <div
      className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:border-teal-500 hover:shadow-2xl transition-all duration-300 group cursor-pointer relative"
      onClick={() => window.location.href = `/contractors/${contractor.id}`}
    >
      {/* Gradient Border Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

      {/* Image Section */}
      <div className="relative h-56 overflow-hidden">
        <Image
          src={imageUrl}
          alt={contractor.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />

        {/* Overlay Gradient on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Verified Badge */}
        {contractor.verified && (
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full flex items-center gap-1.5 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Shield className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-slate-900">Verified</span>
          </div>
        )}

        {/* Premium Badge */}
        {contractor.rating >= 4.8 && (
          <div className="absolute top-4 right-4 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center gap-1.5 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Award className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">Top Rated</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-teal-600 transition-colors">
            {contractor.name}
          </h3>
          <p className="text-sm text-gray-600 font-medium">
            {contractor.company_name || 'Independent Contractor'}
          </p>
        </div>

        {/* Rating & Location */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-slate-900">{contractor.rating.toFixed(1)}</span>
            <span className="text-sm text-gray-500">({contractor.review_count})</span>
          </div>
          {contractor.city && (
            <div className="flex items-center gap-1 text-gray-600">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{contractor.city}</span>
            </div>
          )}
        </div>

        {/* Skills */}
        {contractor.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {contractor.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold"
              >
                {skill}
              </span>
            ))}
            {contractor.skills.length > 3 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                +{contractor.skills.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-600">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-medium">{contractor.completed_jobs} jobs</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Clock className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-medium">{contractor.response_time}</span>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between">
          {contractor.hourly_rate ? (
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                £{contractor.hourly_rate}
              </span>
              <span className="text-sm text-gray-600 ml-1">/hr</span>
            </div>
          ) : (
            <span className="text-sm text-gray-600 font-medium">Contact for pricing</span>
          )}
          <button className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95">
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   CONTRACTOR LIST CARD
   ========================================== */

function ContractorListCard({ contractor }: { contractor: ContractorData }) {
  const imageUrl = contractor.profile_image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(contractor.name)}&background=14b8a6&color=fff&size=200`;

  return (
    <div
      className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-teal-500 hover:shadow-2xl transition-all duration-300 group cursor-pointer relative"
      onClick={() => window.location.href = `/contractors/${contractor.id}`}
    >
      {/* Gradient Border Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 rounded-2xl" />
      <div className="flex gap-6">
        {/* Image */}
        <div className="relative w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden">
          <Image
            src={imageUrl}
            alt={contractor.name}
            fill
            sizes="128px"
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {contractor.verified && (
            <div className="absolute top-2 left-2 p-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg">
              <Shield className="w-4 h-4 text-teal-600" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                {contractor.name}
              </h3>
              <p className="text-gray-600 font-medium">
                {contractor.company_name || 'Independent Contractor'}
              </p>
            </div>
            {contractor.rating >= 4.8 && (
              <div className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center gap-1.5">
                <Award className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white">Top Rated</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-slate-900">{contractor.rating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">({contractor.review_count} reviews)</span>
            </div>
            {contractor.city && (
              <div className="flex items-center gap-1 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">{contractor.city}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium">{contractor.completed_jobs} jobs completed</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium">{contractor.response_time} response</span>
            </div>
          </div>

          {/* Skills */}
          {contractor.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {contractor.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Price & CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {contractor.hourly_rate ? (
              <div>
                <span className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  £{contractor.hourly_rate}
                </span>
                <span className="text-gray-600 ml-2">/hour</span>
              </div>
            ) : (
              <span className="text-gray-600 font-medium">Contact for pricing</span>
            )}
            <button className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95">
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   EMPTY STATE
   ========================================== */

function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Search className="w-10 h-10 text-teal-600" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">No contractors found</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        We couldn't find any contractors matching your criteria. Try adjusting your filters or search terms.
      </p>
      <button
        onClick={onClearFilters}
        className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
      >
        Clear All Filters
      </button>
    </div>
  );
}

/* ==========================================
   TRUST SECTION
   ========================================== */

function TrustSection() {
  const trustFeatures = [
    {
      icon: Shield,
      title: 'Background Checks',
      description: 'Every contractor undergoes thorough background verification before joining our platform.',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      icon: BadgeCheck,
      title: 'Insurance Verified',
      description: 'All professionals carry valid insurance and licensing for your peace of mind.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Users,
      title: 'Review System',
      description: 'Read authentic reviews from real homeowners to make informed decisions.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: FileCheck,
      title: 'Payment Protection',
      description: 'Secure escrow system ensures your payment is protected until work is complete.',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  return (
    <section className="bg-gradient-to-br from-gray-50 to-gray-100 py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-semibold text-teal-700">Your Safety First</span>
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Why Choose Verified Contractors?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We take the guesswork out of hiring. Every contractor on our platform is vetted, verified, and trusted by thousands of homeowners.
          </p>
        </div>

        {/* Trust Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`w-14 h-14 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Stats Bar */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                100%
              </div>
              <div className="text-sm text-gray-600 font-medium">Verified Professionals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                £2M+
              </div>
              <div className="text-sm text-gray-600 font-medium">Protected Payments</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                24/7
              </div>
              <div className="text-sm text-gray-600 font-medium">Customer Support</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                98%
              </div>
              <div className="text-sm text-gray-600 font-medium">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================
   CTA SECTION
   ========================================== */

function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(20, 184, 166, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.3) 0%, transparent 50%)'
        }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        {/* Heading */}
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Need Help Choosing the Right Contractor?
        </h2>

        {/* Description */}
        <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          Post your job and let verified contractors come to you. Get competitive quotes, compare portfolios, and hire with confidence.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/jobs/create"
            className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-emerald-600 transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 flex items-center gap-2 group"
          >
            <span>Post Your Job Free</span>
            <TrendingUp className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/how-it-works"
            className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200"
          >
            Learn How It Works
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            <span>Free to post jobs</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            <span>Get quotes in 24 hours</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            <span>Payment protection included</span>
          </div>
        </div>
      </div>
    </section>
  );
}
