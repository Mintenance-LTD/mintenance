/**
 * Property Database Types
 * Shared type definitions for property management
 */

/**
 * Property type classification
 */
export type PropertyType = 'residential' | 'commercial' | 'rental';

/**
 * Base property interface matching database schema
 */
export interface Property {
  id: string;
  owner_id: string;
  property_name: string;
  address: string;
  city: string | null;
  postcode: string | null;
  property_type: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  year_built: number | null;
  is_primary: boolean;
  photos: string[];  // Array of image URLs
  created_at: string;
  updated_at: string;
}

/**
 * Property with computed statistics
 * Used in property listing and detail views
 */
export interface PropertyWithStats extends Property {
  activeJobs: number;
  completedJobs: number;
  totalSpent: number;
  lastServiceDate: string | null;
  recentCategories: string[];
  is_favorited?: boolean;
}

/**
 * Property favorite record
 */
export interface PropertyFavorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

/**
 * Property create/update payload
 */
export interface PropertyInput {
  property_name: string;
  address: string;
  city?: string;
  postcode?: string;
  property_type: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  square_footage?: number;
  year_built?: number;
  is_primary?: boolean;
  photos?: string[];
}

/**
 * Property health score calculation result
 */
export interface PropertyHealthScore {
  score: number; // 0-100
  grade: 'excellent' | 'good' | 'needs_attention' | 'critical';
  color: string;
  recommendations: string[];
}
