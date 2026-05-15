/**
 * Shared types for the contractor public profile page (`/contractor/[id]`).
 * Extracted on 2026-05-09 (AUDIT_PUNCH_LIST P2 #43) when the page was
 * split from a 671-line monolith into a slim orchestrator + components.
 */

export interface Contractor {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  email_verified?: boolean | null;
  is_available?: boolean | null;
  rating?: number | null;
  total_jobs_completed?: number | null;
  contractor_skills?: Array<{ skill_name: string }> | null;
}

export interface Review {
  id: string;
  rating: number;
  review_text?: string | null;
  comment?: string | null;
  /**
   * 2026-05-13 audit: the `would_recommend` column was added by
   * `20260509155315_reviews_would_recommend_column` and populated by
   * `POST /api/jobs/[id]/review`, but never surfaced on the contractor
   * public profile. Now read and rendered as a "Would recommend" /
   * "Wouldn't recommend" pill on each review card, plus an aggregate
   * "X% recommend" stat at the section header.
   */
  would_recommend?: boolean | null;
  created_at: string;
  reviewer?: {
    first_name?: string | null;
    last_name?: string | null;
    profile_image_url?: string | null;
  } | null;
  job?: {
    title: string;
    category?: string | null;
  } | null;
}

export interface CompletedJob {
  id: string;
  title?: string | null;
  category?: string | null;
  photos?: string[] | null;
  completed_at?: string | null;
}

export interface PortfolioPost {
  id: string;
  title?: string | null;
  images?: string[] | null;
  post_type?: string | null;
  project_duration?: string | null;
  project_cost?: number | null;
}

export interface ContractorProfileData {
  contractor: Contractor;
  reviews: Review[];
  completedJobs: CompletedJob[];
  posts: PortfolioPost[];
  avgRating: number;
}
