import { useState, useCallback, useEffect, useRef } from 'react';
import { logger } from '../utils/logger';
import { AdvancedSearchService } from '../services/AdvancedSearchService';
import {
  SearchFilters,
  SearchQuery,
  SearchResult,
  ContractorSearchResult,
  JobSearchResult,
  SearchSuggestion,
  SearchState,
  DEFAULT_SEARCH_CONFIG,
} from '../types/search';

interface UseAdvancedSearchProps {
  searchType: 'contractors' | 'jobs';
  initialFilters?: Partial<SearchFilters>;
  autoSearch?: boolean;
  debounceMs?: number;
}

interface UseAdvancedSearchReturn {
  // Search state
  searchState: SearchState;

  // Search actions
  search: (query: string, filters?: Partial<SearchFilters>) => Promise<void>;
  applyFilters: (filters: SearchFilters) => Promise<void>;
  clearSearch: () => void;
  loadMore: () => Promise<void>;

  // Filter management
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  resetFilters: () => void;

  // Suggestions
  getSuggestions: (input: string) => Promise<SearchSuggestion[]>;

  // Search persistence
  saveSearch: (name: string) => Promise<void>;
  loadSavedSearch: (searchId: string) => Promise<void>;
}

const DEFAULT_FILTERS: SearchFilters = {
  location: {
    radius: 25,
    unit: 'miles',
    coordinates: null,
  },
  priceRange: {
    min: 50,
    max: 500,
    hourly: true,
  },
  skills: [],
  rating: 0,
  availability: 'this_month',
  projectType: [],
  sortBy: 'relevance',
  verified: false,
  hasReviews: false,
};

export const useAdvancedSearch = ({
  searchType,
  initialFilters = {},
  autoSearch = false,
  debounceMs = DEFAULT_SEARCH_CONFIG.debounceMs,
}: UseAdvancedSearchProps): UseAdvancedSearchReturn => {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    filters: { ...DEFAULT_FILTERS, ...initialFilters },
    loading: false,
    results: [],
    total: 0,
    page: 1,
    hasMore: false,
    error: null,
    suggestions: [],
    facets: null,
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchAbortController = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }
    };
  }, []);

  // Auto-search when filters change
  useEffect(() => {
    if (autoSearch && searchState.query.trim()) {
      performSearch(searchState.query, searchState.filters, 1);
    }
  }, [searchState.filters, autoSearch]);

  const performSearch = useCallback(
    async (
      query: string,
      filters: SearchFilters,
      page: number = 1,
      append: boolean = false
    ) => {
      // Cancel previous search
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }

      // Create new abort controller
      searchAbortController.current = new AbortController();

      try {
        setSearchState((prev) => ({
          ...prev,
          loading: true,
          error: null,
          ...(page === 1 && !append ? { results: [] } : {}),
        }));

        const searchQuery: SearchQuery = {
          text: query,
          filters,
        };

        let searchResult: SearchResult<any>;

        if (searchType === 'contractors') {
          searchResult = await AdvancedSearchService.searchContractors(
            searchQuery,
            page,
            DEFAULT_SEARCH_CONFIG.maxResults
          );
        } else {
          searchResult = await AdvancedSearchService.searchJobs(
            searchQuery,
            page,
            DEFAULT_SEARCH_CONFIG.maxResults
          );
        }

        // Check if request was aborted
        if (searchAbortController.current?.signal.aborted) {
          return;
        }

        setSearchState((prev) => ({
          ...prev,
          results: append ? [...prev.results, ...searchResult.items] : searchResult.items,
          total: searchResult.total,
          page: searchResult.page,
          hasMore: searchResult.hasMore,
          facets: searchResult.facets,
          loading: false,
          error: null,
        }));

        logger.info('Search completed successfully', {
          searchType,
          query: query.substring(0, 50),
          resultsCount: searchResult.items.length,
          totalResults: searchResult.total,
          executionTime: searchResult.executionTime,
        });
      } catch (error: any) {
        // Don't update state if request was aborted
        if (searchAbortController.current?.signal.aborted) {
          return;
        }

        const errorMessage = error.message || 'Search failed. Please try again.';

        setSearchState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));

        logger.error('Search failed:', {
          error: errorMessage,
          searchType,
          query: query.substring(0, 50),
        });
      }
    },
    [searchType]
  );

  const search = useCallback(
    async (query: string, filters?: Partial<SearchFilters>) => {
      const mergedFilters = filters
        ? { ...searchState.filters, ...filters }
        : searchState.filters;

      setSearchState((prev) => ({
        ...prev,
        query,
        filters: mergedFilters,
        page: 1,
      }));

      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce search
      debounceRef.current = setTimeout(() => {
        if (query.trim() || Object.values(mergedFilters).some(v =>
          Array.isArray(v) ? v.length > 0 : v !== DEFAULT_FILTERS[Object.keys(DEFAULT_FILTERS).find(k => DEFAULT_FILTERS[k as keyof SearchFilters] === v) as keyof SearchFilters]
        )) {
          performSearch(query, mergedFilters, 1);
        } else {
          setSearchState((prev) => ({
            ...prev,
            results: [],
            total: 0,
            hasMore: false,
            facets: null,
          }));
        }
      }, debounceMs);
    },
    [searchState.filters, debounceMs, performSearch]
  );

  const applyFilters = useCallback(
    async (filters: SearchFilters) => {
      setSearchState((prev) => ({
        ...prev,
        filters,
        page: 1,
      }));

      if (searchState.query.trim()) {
        await performSearch(searchState.query, filters, 1);
      }
    },
    [searchState.query, performSearch]
  );

  const clearSearch = useCallback(() => {
    // Cancel any pending search
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setSearchState({
      query: '',
      filters: DEFAULT_FILTERS,
      loading: false,
      results: [],
      total: 0,
      page: 1,
      hasMore: false,
      error: null,
      suggestions: [],
      facets: null,
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (searchState.loading || !searchState.hasMore) {
      return;
    }

    const nextPage = searchState.page + 1;
    await performSearch(searchState.query, searchState.filters, nextPage, true);
  }, [searchState.loading, searchState.hasMore, searchState.page, searchState.query, searchState.filters, performSearch]);

  const updateFilter = useCallback(
    <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
      setSearchState((prev) => ({
        ...prev,
        filters: {
          ...prev.filters,
          [key]: value,
        },
        page: 1,
      }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setSearchState((prev) => ({
      ...prev,
      filters: DEFAULT_FILTERS,
      page: 1,
    }));
  }, []);

  const getSuggestions = useCallback(
    async (input: string): Promise<SearchSuggestion[]> => {
      try {
        const suggestions = await AdvancedSearchService.getSearchSuggestions(
          input,
          searchType,
          DEFAULT_SEARCH_CONFIG.suggestionCount
        );

        setSearchState((prev) => ({
          ...prev,
          suggestions,
        }));

        return suggestions;
      } catch (error) {
        logger.error('Failed to get search suggestions:', error);
        return [];
      }
    },
    [searchType]
  );

  const saveSearch = useCallback(
    async (name: string) => {
      try {
        // This would save the search to the user's saved searches
        logger.info('Saving search', { name, query: searchState.query });
        // Implementation would depend on your saved searches system
      } catch (error) {
        logger.error('Failed to save search:', error);
        throw error;
      }
    },
    [searchState.query, searchState.filters]
  );

  const loadSavedSearch = useCallback(
    async (searchId: string) => {
      try {
        // This would load a saved search
        logger.info('Loading saved search', { searchId });
        // Implementation would depend on your saved searches system
      } catch (error) {
        logger.error('Failed to load saved search:', error);
        throw error;
      }
    },
    []
  );

  return {
    searchState,
    search,
    applyFilters,
    clearSearch,
    loadMore,
    updateFilter,
    resetFilters,
    getSuggestions,
    saveSearch,
    loadSavedSearch,
  };
};

export default useAdvancedSearch;