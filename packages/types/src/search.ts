// Advanced Search Types
export interface LocationRadius {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  address?: string;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: 'USD';
}

export interface SkillLevel {
  skill: string;
  level: 'beginner' | 'intermediate' | 'expert';
  yearsExperience?: number;
}

export interface AdvancedSearchFilters {
  // Location-based filtering
  location?: LocationRadius;
  // Price-based filtering
  priceRange?: PriceRange;
  // Skill-based filtering
  skills: string[];
  skillLevels?: SkillLevel[];
  // Rating and experience
  minRating?: number;
  minJobsCompleted?: number;
  // Availability filtering
  availability: 'immediate' | 'this_week' | 'this_month' | 'flexible';
  // Project type filtering
  projectTypes: string[];
  projectComplexity?: 'simple' | 'medium' | 'complex';
  // Time-based filtering
  urgency?: 'emergency' | 'urgent' | 'normal' | 'flexible';
  estimatedDuration?: number; // in hours
  // Additional filters
  hasInsurance?: boolean;
  isBackgroundChecked?: boolean;
  hasPortfolio?: boolean;
  responseTimeHours?: number;
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  facets?: SearchFacets;
  suggestions?: string[];
}

export interface SearchFacets {
  skills: { [key: string]: number };
  priceRanges: { [key: string]: number };
  ratings: { [key: string]: number };
  locations: { [key: string]: number };
  availability: { [key: string]: number };
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: AdvancedSearchFilters;
  alertEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchAnalytics {
  userId: string;
  searchQuery: string;
  filters: AdvancedSearchFilters;
  resultsCount: number;
  clickedResults: string[];
  timestamp: string;
  sessionId: string;
}
