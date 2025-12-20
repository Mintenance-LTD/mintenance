/**
 * Discovery and card stack types for swipe-based matching
 */

import type { Job, ContractorProfile, User } from '@mintenance/types';

/**
 * Discovery card for job or contractor
 */
export interface DiscoveryCard<T = Job | ContractorProfile> {
  id: string;
  type: 'job' | 'contractor';
  data: T;
  match_score: number;
  match_reasons: MatchReason[];
  distance_km?: number;
  is_sponsored: boolean;
  is_boosted: boolean;
  viewed_at?: string;
}

/**
 * Reason for match recommendation
 */
export interface MatchReason {
  factor: string;
  score: number;
  description: string;
}

/**
 * Swipe action on a card (extended version with analytics)
 */
export interface SwipeActionAnalytics {
  id: string;
  user_id: string;
  card_id: string;
  card_type: 'job' | 'contractor';
  action: 'like' | 'pass' | 'super_like' | 'save';
  timestamp: string;
  time_spent_ms: number;
  swipe_velocity?: number;
}

/**
 * Card stack state
 */
export interface CardStackState {
  cards: DiscoveryCard[];
  current_index: number;
  total_available: number;
  has_more: boolean;
  last_fetched_at: string;
  filters: DiscoveryFilters;
}

/**
 * Discovery filters
 */
export interface DiscoveryFilters {
  // Location
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  location_name?: string;
  
  // Job filters
  categories?: string[];
  min_budget?: number;
  max_budget?: number;
  urgency?: ('low' | 'medium' | 'high' | 'urgent')[];
  posted_within_days?: number;
  
  // Contractor filters
  skills?: string[];
  min_rating?: number;
  min_jobs_completed?: number;
  availability?: ('immediate' | 'this_week' | 'this_month' | 'flexible')[];
  verified_only?: boolean;
  
  // General
  sort_by?: 'relevance' | 'distance' | 'newest' | 'budget_high' | 'budget_low' | 'rating';
}

/**
 * Match between homeowner and contractor
 */
export interface Match {
  id: string;
  homeowner_id: string;
  contractor_id: string;
  job_id?: string;
  status: 'pending' | 'matched' | 'connected' | 'expired';
  homeowner_action: 'like' | 'pass' | 'super_like' | 'save';
  contractor_action?: 'like' | 'pass' | 'super_like' | 'save';
  matched_at?: string;
  connected_at?: string;
  expires_at: string;
  created_at: string;
  // Populated fields
  homeowner?: User;
  contractor?: ContractorProfile;
  job?: Job;
}

/**
 * Discovery session analytics
 */
export interface DiscoverySession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  cards_viewed: number;
  likes: number;
  passes: number;
  super_likes: number;
  saves: number;
  matches: number;
  avg_time_per_card_ms: number;
  filters_used: DiscoveryFilters;
}

/**
 * Card interaction event
 */
export interface CardInteraction {
  id: string;
  session_id: string;
  card_id: string;
  interaction_type: 'view' | 'expand' | 'swipe' | 'tap_photo' | 'tap_profile' | 'save';
  timestamp: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Recommendation request
 */
export interface RecommendationRequest {
  user_id: string;
  type: 'jobs' | 'contractors';
  filters?: DiscoveryFilters;
  limit?: number;
  exclude_ids?: string[];
  context?: {
    recent_searches?: string[];
    recent_views?: string[];
    preferences?: Record<string, unknown>;
  };
}

/**
 * Recommendation response
 */
export interface RecommendationResponse {
  cards: DiscoveryCard[];
  total_available: number;
  recommendation_id: string;
  algorithm_version: string;
  generated_at: string;
}

/**
 * Saved card for later
 */
export interface SavedCard {
  id: string;
  user_id: string;
  card_type: 'job' | 'contractor';
  card_id: string;
  notes?: string;
  folder?: string;
  saved_at: string;
  // Populated fields
  job?: Job;
  contractor?: ContractorProfile;
}

/**
 * Discovery preferences
 */
export interface DiscoveryPreferences {
  id: string;
  user_id: string;
  default_radius_km: number;
  preferred_categories: string[];
  min_budget: number;
  max_budget: number;
  availability_preference: string[];
  verified_only: boolean;
  notifications_enabled: boolean;
  match_notifications: boolean;
  daily_recommendations: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Boost for card visibility
 */
export interface CardBoost {
  id: string;
  card_type: 'job' | 'contractor';
  card_id: string;
  user_id: string;
  boost_type: 'standard' | 'premium' | 'super';
  impressions_target: number;
  impressions_delivered: number;
  clicks: number;
  started_at: string;
  expires_at: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  cost: number;
  currency: string;
}

/**
 * Card animation configuration
 */
export interface CardAnimationConfig {
  swipe_threshold: number;
  rotation_factor: number;
  scale_on_drag: number;
  opacity_on_swipe: number;
  spring_config: {
    tension: number;
    friction: number;
  };
  exit_duration_ms: number;
}

/**
 * Neighborhood recommendation
 */
export interface NeighborhoodRecommendation {
  id: string;
  user_id: string;
  contractor_id: string;
  score: number;
  reasons: string[];
  distance_km: number;
  jobs_in_area: number;
  avg_rating: number;
  created_at: string;
  // Populated fields
  contractor?: ContractorProfile;
}

/**
 * Map view data for contractors
 */
export interface ContractorMapData {
  contractors: ContractorMapMarker[];
  center: {
    latitude: number;
    longitude: number;
  };
  zoom: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface ContractorMapMarker {
  id: string;
  contractor_id: string;
  latitude: number;
  longitude: number;
  name: string;
  avatar_url?: string;
  rating: number;
  jobs_completed: number;
  skills: string[];
  availability: string;
  is_verified: boolean;
}

