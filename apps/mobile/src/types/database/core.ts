/**
 * Core Database Types
 * 
 * This file contains the fundamental database types and interfaces
 * that are shared across the application.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: Tables
    Views: Views
    Functions: Functions
    Enums: Enums
    CompositeTypes: CompositeTypes
  }
}

// Re-export all table types from their respective modules
export type Tables = 
  & AuthTables
  & JobTables
  & ContractorTables
  & PaymentTables
  & LocationTables
  & SocialTables
  & AnalyticsTables
  & SystemTables

export type Views = {
  v_job_photos: {
    Row: {
      id: string | null
      job_id: string | null
      photo_url: string | null
      caption: string | null
      created_at: string | null
    }
    Relationships: []
  }
  v_users: {
    Row: {
      id: string | null
      email: string | null
      first_name: string | null
      last_name: string | null
      role: string | null
      created_at: string | null
      updated_at: string | null
    }
    Relationships: []
  }
}

export type Functions = {
  calculate_distance_km: {
    Args: {
      lat1: number
      lon1: number
      lat2: number
      lon2: number
    }
    Returns: number
  }
  find_contractors_for_location: {
    Args: {
      lat: number
      lon: number
      radius_km: number
    }
    Returns: {
      id: string
      first_name: string
      last_name: string
      distance_km: number
    }[]
  }
  get_user_integration_secret: {
    Args: {
      user_id: string
      integration_type: string
    }
    Returns: string
  }
  is_location_in_service_area: {
    Args: {
      lat: number
      lon: number
      service_area_id: string
    }
    Returns: boolean
  }
  purge_old_email_history: {
    Args: {
      days_to_keep: number
    }
    Returns: number
  }
  purge_old_quote_interactions: {
    Args: {
      days_to_keep: number
    }
    Returns: number
  }
  set_user_integration_secret: {
    Args: {
      user_id: string
      integration_type: string
      secret_value: string
    }
    Returns: boolean
  }
}

export type Enums = {
  contractor_availability: "immediate" | "this_week" | "this_month" | "busy"
  job_priority: "low" | "medium" | "high" | "urgent"
  job_status: "posted" | "assigned" | "in_progress" | "completed" | "cancelled"
  payment_status: "pending" | "processing" | "completed" | "failed" | "refunded"
  review_rating: "1" | "2" | "3" | "4" | "5"
}

export type CompositeTypes = {
  box: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
  bytea: string
  geography: string
  geometry: string
  json: Json
  jsonb: Json
  path: {
    open: boolean
    points: {
      x: number
      y: number
    }[]
  }
  point: {
    x: number
    y: number
  }
  polygon: {
    points: {
      x: number
      y: number
    }[]
  }
  text: string
}

// Import all table types
import type { AuthTables } from './auth'
import type { JobTables } from './jobs'
import type { ContractorTables } from './contractors'
import type { PaymentTables } from './payments'
import type { LocationTables } from './locations'
import type { SocialTables } from './social'
import type { AnalyticsTables } from './analytics'
import type { SystemTables } from './system'

// Individual table type exports for convenience
export type UsersTable = Tables['users']
export type ProfilesTable = Tables['profiles']
export type JobsTable = Tables['jobs']
export type JobsPhotosTable = Tables['jobs_photos']
export type JobMilestonesTable = Tables['job_milestones']
export type JobProgressTable = Tables['job_progress']
export type BidsTable = Tables['bids']
export type ContractorSkillsTable = Tables['contractor_skills']
export type ContractorMatchesTable = Tables['contractor_matches']
export type ContractorPayoutAccountsTable = Tables['contractor_payout_accounts']
export type ContractorExpertiseEndorsementsTable = Tables['contractor_expertise_endorsements']
export type EscrowTransactionsTable = Tables['escrow_transactions']
export type HomeownerExpensesTable = Tables['homeowner_expenses']
export type HomeInvestmentsTable = Tables['home_investments']
export type MonthlyBudgetsTable = Tables['monthly_budgets']
export type ServiceAreasTable = Tables['service_areas']
export type ServiceAreaCoverageTable = Tables['service_area_coverage']
export type AreaLandmarksTable = Tables['area_landmarks']
export type ServiceRoutesTable = Tables['service_routes']
export type ContractorPostsTable = Tables['contractor_posts']
export type ContractorPostLikesTable = Tables['contractor_post_likes']
export type ContractorPostCommentsTable = Tables['contractor_post_comments']
export type ContractorFollowsTable = Tables['contractor_follows']
export type ReviewsTable = Tables['reviews']
export type HomeownerTestimonialsTable = Tables['homeowner_testimonials']
export type CommunityRecommendationsTable = Tables['community_recommendations']
export type SuccessStoriesTable = Tables['success_stories']
export type AreaPerformanceTable = Tables['area_performance']
export type ServiceCategoriesTable = Tables['service_categories']
export type ServiceSubcategoriesTable = Tables['service_subcategories']
