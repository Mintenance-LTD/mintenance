import { logger } from '@mintenance/shared';
import type {
  Job,
  JobApiResponse,
  JobsFilter,
  JobStats,
  SavedJobWithJob,
  ViewWithJob,
} from '../types';

/**
 * Data-fetch helpers for the contractor /jobs surface. Extracted
 * from `page.tsx` on 2026-05-09 (AUDIT_PUNCH_LIST P2 #42). Each
 * function is self-contained and returns shaped data the page just
 * stores in state.
 */

const ENDPOINT_BY_FILTER: Record<JobsFilter, string> = {
  viewed: '/api/contractor/job-views',
  saved: '/api/contractor/saved-jobs',
  bid: '/api/contractor/my-jobs?status=bid',
  completed: '/api/contractor/my-jobs?status=completed',
  active: '/api/contractor/my-jobs?status=active',
};

export async function fetchJobStats(): Promise<JobStats> {
  const response = await fetch('/api/contractor/my-jobs?status=all');
  if (!response.ok) throw new Error('Failed to fetch stats');

  const data = await response.json();
  const allJobs: JobApiResponse[] = data.jobs || [];

  const active = allJobs.filter(
    (j) => j.status === 'in_progress' || j.status === 'assigned'
  ).length;
  const pending = allJobs.filter(
    (j) => j.status === 'pending' || j.status === 'posted'
  ).length;
  const completed = allJobs.filter((j) => j.status === 'completed').length;
  const totalValue = allJobs.reduce((sum, j) => sum + (j.budget || 0), 0);

  return { active, pending, completed, totalValue };
}

export async function fetchJobsByFilter(
  filter: JobsFilter,
  categoryFilter: string
): Promise<Job[]> {
  const endpoint = ENDPOINT_BY_FILTER[filter];
  const response = await fetch(endpoint);

  if (!response.ok) {
    let errorMessage = 'Failed to fetch jobs';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.details || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  let jobsData: JobApiResponse[] = [];

  if (filter === 'viewed' && data.views) {
    jobsData = data.views.map((view: ViewWithJob) => view.job).filter(Boolean);
  } else if (filter === 'saved' && data.savedJobs) {
    jobsData = data.savedJobs
      .map((saved: SavedJobWithJob) => saved.job)
      .filter(Boolean);
  } else {
    jobsData = data.jobs || [];
  }

  if (categoryFilter && categoryFilter !== 'all') {
    jobsData = jobsData.filter(
      (job) => job.category?.toLowerCase() === categoryFilter.toLowerCase()
    );
  }

  return jobsData.map((job) => ({
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location,
    category: job.category || 'General',
    priority: job.priority || 'medium',
    budget: job.budget,
    status: job.status,
    photos: job.photos || [],
    created_at: job.created_at,
    homeowner: {
      id: job.homeowner_id,
      name: job.homeowner_name || 'Unknown',
      avatar: job.homeowner_avatar,
    },
    distance: job.distance,
    matchScore: job.match_score,
  }));
}

export function logFetchError(error: unknown, context: string): void {
  logger.error(`Failed to ${context}:`, error, { service: 'app' });
}
