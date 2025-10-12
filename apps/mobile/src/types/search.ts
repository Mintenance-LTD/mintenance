/**
 * Advanced Search & Filtering Types
 * Comprehensive type definitions for the enhanced search functionality
 */

export interface LocationRadius {
  radius: number;
  unit: 'miles' | 'kilometers';
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
}

export interface PriceRange {
  min: number;
  max: number;
  hourly: boolean; // true for hourly rate, false for project price
}

export type ProjectType =
  | 'emergency'
  | 'maintenance'
  | 'installation'
  | 'repair'
  | 'renovation'
  | 'inspection'
  | 'consultation'
  | 'other';

export type AvailabilityFilter =
  | 'immediate'
  | 'this_week'
  | 'this_month';

export type SortOption =
  | 'relevance'
  | 'rating'
  | 'price_low'
  | 'price_high'
  | 'distance'
  | 'reviews';

export interface SearchFilters {
  location: LocationRadius;
  priceRange: PriceRange;
  skills: string[];
  rating: number; // minimum rating (0-5)
  availability: AvailabilityFilter;
  projectType: ProjectType[];
  sortBy: SortOption;
  verified: boolean; // only verified contractors
  hasReviews: boolean; // only contractors with reviews
}

export interface SearchQuery {
  text: string;
  filters: SearchFilters;
  suggestions?: string[];
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  facets: SearchFacets;
  query: SearchQuery;
  executionTime: number;
}

export interface SearchFacets {
  skills: { skill: string; count: number }[];
  projectTypes: { type: ProjectType; count: number }[];
  priceRanges: { range: string; count: number }[];
  ratings: { rating: number; count: number }[];
  locations: { city: string; count: number }[];
}

export interface ContractorSearchResult {
  id: string;
  name: string;
  profileImage?: string;
  skills: string[];
  rating: number;
  reviewCount: number;
  hourlyRate?: number;
  projectRate?: number;
  location: {
    city: string;
    state: string;
    distance: number;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  availability: {
    immediate: boolean;
    thisWeek: boolean;
    thisMonth: boolean;
  };
  verified: boolean;
  description: string;
  completedJobs: number;
  responseTime: string; // e.g., "Usually responds within 2 hours"
  matchScore: number; // 0-100 relevance score
}

export interface JobSearchResult {
  id: string;
  title: string;
  description: string;
  budget: {
    min?: number;
    max?: number;
    type: 'hourly' | 'fixed';
  };
  location: {
    city: string;
    state: string;
    distance: number;
  };
  postedDate: string;
  urgency: 'low' | 'medium' | 'high';
  skills: string[];
  projectType: ProjectType;
  homeowner: {
    name: string;
    rating: number;
    reviewCount: number;
  };
  matchScore: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  alerts: boolean; // email/push notifications for new matches
  createdAt: string;
  lastRun: string;
  resultCount: number;
}

export interface SearchHistory {
  id: string;
  query: string;
  filters: Partial<SearchFilters>;
  timestamp: string;
  resultCount: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'skill' | 'location' | 'project' | 'contractor';
  icon?: string;
  metadata?: {
    count?: number;
    category?: string;
  };
}

// Search Analytics Types
export interface SearchAnalytics {
  popularSkills: { skill: string; searches: number }[];
  popularLocations: { location: string; searches: number }[];
  averageFilterUsage: Record<keyof SearchFilters, number>;
  conversionRate: number; // percentage of searches that lead to contact
  bounceRate: number; // percentage of searches with no results clicked
}

// Real-time Search Types
export interface SearchFiltersUpdate {
  field: keyof SearchFilters;
  value: any;
  timestamp: number;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  loading: boolean;
  results: ContractorSearchResult[] | JobSearchResult[];
  total: number;
  page: number;
  hasMore: boolean;
  error: string | null;
  suggestions: SearchSuggestion[];
  facets: SearchFacets | null;
}

// Smart Search Features
export interface SmartSearchRecommendation {
  type: 'skill' | 'filter' | 'location' | 'price';
  title: string;
  description: string;
  action: {
    type: 'add_filter' | 'modify_filter' | 'search_query';
    payload: any;
  };
  confidence: number; // 0-1 confidence score
}

export interface SearchPersonalization {
  userId: string;
  preferredSkills: string[];
  preferredPriceRange: PriceRange;
  preferredLocation: LocationRadius;
  searchHistory: SearchHistory[];
  bookmarkedContractors: string[];
  contactedContractors: string[];
}

// Advanced Filter Presets
export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: Partial<SearchFilters>;
  icon: string;
  category: 'emergency' | 'budget' | 'premium' | 'local' | 'custom';
  popularity: number;
}

export const DEFAULT_FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'emergency',
    name: 'Emergency Services',
    description: 'Available immediately, verified contractors',
    filters: {
      availability: 'immediate',
      verified: true,
      rating: 4,
    },
    icon: 'flash',
    category: 'emergency',
    popularity: 85,
  },
  {
    id: 'budget_friendly',
    name: 'Budget Friendly',
    description: 'Affordable rates, good reviews',
    filters: {
      priceRange: { min: 25, max: 100, hourly: true },
      rating: 3,
      hasReviews: true,
    },
    icon: 'wallet',
    category: 'budget',
    popularity: 72,
  },
  {
    id: 'premium',
    name: 'Premium Contractors',
    description: 'Top-rated, verified professionals',
    filters: {
      rating: 4.5,
      verified: true,
      hasReviews: true,
    },
    icon: 'star',
    category: 'premium',
    popularity: 68,
  },
  {
    id: 'local',
    name: 'Local Contractors',
    description: 'Within 10 miles of your location',
    filters: {
      location: { radius: 10, unit: 'miles', coordinates: null },
    },
    icon: 'location',
    category: 'local',
    popularity: 55,
  },
];

// Search Performance Metrics
export interface SearchPerformanceMetrics {
  queryExecutionTime: number;
  resultsReturned: number;
  filtersApplied: number;
  cacheHitRate: number;
  indexUsage: string[];
  apiCalls: number;
}

export interface SearchConfig {
  maxResults: number;
  debounceMs: number;
  suggestionCount: number;
  facetLimits: Record<string, number>;
  cacheTimeout: number;
  enableAnalytics: boolean;
  enablePersonalization: boolean;
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  maxResults: 50,
  debounceMs: 300,
  suggestionCount: 5,
  facetLimits: {
    skills: 10,
    locations: 5,
    projectTypes: 8,
  },
  cacheTimeout: 300000, // 5 minutes
  enableAnalytics: true,
  enablePersonalization: true,
};