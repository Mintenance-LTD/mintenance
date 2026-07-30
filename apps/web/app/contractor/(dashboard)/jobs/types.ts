/**
 * Shared types for the contractor /jobs surface. Extracted from
 * `contractor/jobs/page.tsx` on 2026-05-09 (AUDIT_PUNCH_LIST P2 #42).
 */

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  priority: string;
  /** Legacy field (may be 0 for jobs posted under the open-bidding
   * model from 2026-05-22+). Prefer `total_amount` for "what is this
   * job worth?". */
  budget: number;
  /** Best-known committed amount — released escrow → accepted bid →
   * budget → null. Null when nothing is committed yet. */
  total_amount?: number | null;
  status: string;
  photos: string[];
  created_at: string;
  homeowner: {
    id: string;
    name: string;
    avatar?: string;
  };
  distance?: number;
  matchScore?: number;
}

export interface JobApiResponse {
  id: string;
  title: string;
  description: string;
  location: string;
  category?: string;
  priority?: string;
  budget: number;
  total_amount?: number | null;
  status: string;
  photos?: string[];
  created_at: string;
  homeowner_id: string;
  homeowner_name?: string;
  homeowner_avatar?: string;
  distance?: number;
  match_score?: number;
}

export interface ViewWithJob {
  job: JobApiResponse;
}

export interface SavedJobWithJob {
  job: JobApiResponse;
}

export type JobsFilter = 'active' | 'viewed' | 'saved' | 'bid' | 'completed';

export interface JobStats {
  active: number;
  pending: number;
  completed: number;
  totalValue: number;
}
