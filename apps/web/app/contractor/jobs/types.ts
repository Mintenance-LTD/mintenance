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
  budget: number;
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
