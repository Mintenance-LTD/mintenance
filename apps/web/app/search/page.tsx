'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { AdvancedSearchService } from '@/lib/services/AdvancedSearchService';
import { logger } from '@/lib/logger';
import type {
  User,
  Job,
  ContractorProfile,
  AdvancedSearchFilters,
  SavedSearch,
  SearchResult
} from '@mintenance/types';
import dynamicImport from 'next/dynamic';
import { SearchControls } from './components/SearchControls';
import { SearchResultsArea } from './components/SearchResultsArea';

// Dynamic imports for code splitting
const AdvancedSearchFiltersComponent = dynamicImport(() => import('@/components/search/AdvancedSearchFilters').then(mod => ({ default: mod.AdvancedSearchFiltersComponent })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
  ssr: false
});

// Disable static optimization for this page
export const dynamic = 'force-dynamic';

type SearchType = 'jobs' | 'contractors';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [searchType, setSearchType] = useState<SearchType>('jobs');
  const [query, setQuery] = useState(searchParams?.get('q') || '');
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    skills: [],
    projectTypes: [],
    availability: 'flexible'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult<Job | ContractorProfile>>({
    items: [],
    totalCount: 0,
    hasMore: false
  });
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        try {
          const saved = await AdvancedSearchService.getSavedSearches(currentUser.id);
          setSavedSearches(saved);
        } catch (error) {
          logger.error('Error loading saved searches', error);
        }
      }
    };
    loadUser();
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Boolean(filters.priceRange) ||
           filters.skills.length > 0 ||
           filters.projectTypes.length > 0 ||
           filters.availability !== 'flexible' ||
           Boolean(filters.urgency) ||
           Boolean(filters.projectComplexity) ||
           Boolean(filters.hasInsurance) ||
           Boolean(filters.isBackgroundChecked) ||
           Boolean(filters.hasPortfolio);
  }, [filters]);

  const performSearch = useCallback(async () => {
    if (!query.trim() && !hasActiveFilters) {
      return;
    }

    setLoading(true);
    try {
      let searchResults: SearchResult<Job | ContractorProfile>;

      if (searchType === 'jobs') {
        searchResults = await AdvancedSearchService.searchJobs(query, filters);
      } else {
        searchResults = await AdvancedSearchService.searchContractors(query, filters);
      }

      setResults(searchResults);

      if (user) {
        await AdvancedSearchService.trackSearchAnalytics(
          user.id,
          query,
          filters,
          searchResults.totalCount,
          `session_${Date.now()}`
        );
      }
    } catch (error) {
      logger.error('Search error', error);
    } finally {
      setLoading(false);
    }
  }, [filters, hasActiveFilters, query, searchType, user]);

  useEffect(() => {
    if (!query && !hasActiveFilters) {
      return;
    }

    void performSearch();
  }, [hasActiveFilters, performSearch, query]);

  const handleSaveSearch = async () => {
    const trimmedQuery = query.trim();
    if (!user || !trimmedQuery) {
      return;
    }

    const defaultName = `Search: ${trimmedQuery}`;
    const nameInput = prompt('Name for saved search:', defaultName)?.trim() ?? '';
    const name = nameInput.length > 0 ? nameInput : defaultName;

    if (savedSearches.some(saved => saved.name.trim().toLowerCase() === name.toLowerCase())) {
      alert('You already have a saved search with this name.');
      return;
    }

    try {
      await AdvancedSearchService.saveSearch(user.id, name, filters, false);
      alert('Search saved successfully!');

      const saved = await AdvancedSearchService.getSavedSearches(user.id);
      setSavedSearches(saved);
    } catch (error) {
      logger.error('Error saving search', error);
      alert('Failed to save search');
    }
  };

  const clearAllFilters = () => {
    setFilters({
      skills: [],
      projectTypes: [],
      availability: 'flexible'
    });
    setQuery('');
    setResults({ items: [], totalCount: 0, hasMore: false });
  };

  const handleNavigateToJob = (jobId: string) => {
    router.push(`/jobs/${jobId}`);
  };

  const handleNavigateToContractor = (contractorId: string) => {
    router.push(`/contractors/${contractorId}`);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <SearchControls
        query={query}
        onQueryChange={setQuery}
        searchType={searchType}
        onSearchTypeChange={setSearchType}
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        resultsCount={results.totalCount}
        isLoggedIn={Boolean(user)}
        onShowFilters={() => setShowFilters(true)}
        onSaveSearch={handleSaveSearch}
        onClearAllFilters={clearAllFilters}
      />

      <SearchResultsArea
        loading={loading}
        searchType={searchType}
        query={query}
        results={results}
        onQueryChange={setQuery}
        onNavigateToJob={handleNavigateToJob}
        onNavigateToContractor={handleNavigateToContractor}
      />

      {/* Advanced Search Filters Modal */}
      <AdvancedSearchFiltersComponent
        filters={filters}
        onChange={setFilters}
        onApply={() => setShowFilters(false)}
        onClear={clearAllFilters}
        isVisible={showFilters}
        onClose={() => setShowFilters(false)}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
