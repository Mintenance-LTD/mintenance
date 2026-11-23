import type {
  JobDetail as Job,
  JobSummary,
} from '@mintenance/types/src/contracts';
import { logger } from '@/lib/logger';
import type { JobWorkspaceStatus } from '@/lib/jobs/workspace-status';

async function api<T>(input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`API ${input} failed: ${res.status} ${msg}`);
  }
  return (await res.json()) as T;
}

type JobListSummary = JobSummary & {
  photos?: string[];
  location?: string;
  budget?: number;
  description?: string;
  category?: string;
  homeownerName?: string;
  contractorName?: string;
  archived_at?: string | null;
  propertyLabel?: string;
  propertyName?: string;
  propertyTown?: string;
  propertyPostcode?: string;
  workspaceStatus?: JobWorkspaceStatus;
  homeowner_id?: string;
  contractor_id?: string;
  view_count?: number;
};

const mapSummaryToJob = (
  summary: JobListSummary
): Job & {
  photos?: string[];
  location?: string;
  budget?: number;
  description?: string;
  category?: string;
  homeownerName?: string;
  contractorName?: string;
  archived_at?: string | null;
  propertyLabel?: string;
  propertyName?: string;
  propertyTown?: string;
  propertyPostcode?: string;
  workspaceStatus?: JobWorkspaceStatus;
  homeowner_id?: string;
  contractor_id?: string;
  view_count?: number;
} => ({
  id: summary.id,
  title: summary.title,
  status: summary.status,
  createdAt: summary.createdAt,
  updatedAt: summary.updatedAt,
  photos: summary.photos,
  location: summary.location,
  budget: summary.budget,
  description: summary.description,
  category: summary.category,
  homeownerName: summary.homeownerName,
  contractorName: summary.contractorName,
  archived_at: summary.archived_at ?? null,
  propertyLabel: summary.propertyLabel,
  propertyName: summary.propertyName,
  propertyTown: summary.propertyTown,
  propertyPostcode: summary.propertyPostcode,
  workspaceStatus: summary.workspaceStatus,
  homeowner_id: summary.homeowner_id,
  contractor_id: summary.contractor_id,
  view_count: summary.view_count,
});

export class JobService {
  static async getAvailableJobs(): Promise<
    (Job & {
      photos?: string[];
      location?: string;
      budget?: number;
      description?: string;
      category?: string;
      homeownerName?: string;
      contractorName?: string;
    })[]
  > {
    try {
      const params = new URLSearchParams({ limit: '20', status: 'posted' });
      const { jobs } = await api<{
        jobs: (JobSummary & {
          photos?: string[];
          location?: string;
          budget?: number;
          description?: string;
          category?: string;
          homeownerName?: string;
          contractorName?: string;
        })[];
      }>(`/api/jobs?${params.toString()}`);
      return jobs.map(mapSummaryToJob) as (Job & {
        photos?: string[];
        location?: string;
        budget?: number;
        description?: string;
        category?: string;
        homeownerName?: string;
        contractorName?: string;
      })[];
    } catch (error) {
      logger.error('Job service error fetching available jobs', error);
      return [];
    }
  }

  static async getJobsByHomeowner(
    _homeownerId: string,
    filters: {
      propertyId?: string;
      category?: string;
      workspace?: boolean;
    } = {}
  ): Promise<ReturnType<typeof mapSummaryToJob>[]> {
    try {
      const collected: JobListSummary[] = [];
      let cursor: string | undefined;
      const seen = new Set<string>();
      do {
        const params = new URLSearchParams({ limit: '50' });
        if (filters.workspace) params.set('workspace', '1');
        if (filters.propertyId) params.set('propertyId', filters.propertyId);
        if (filters.category) params.set('category', filters.category);
        if (cursor) params.set('cursor', cursor);
        const { jobs, nextCursor } = await api<{
          nextCursor?: string;
          jobs: JobListSummary[];
        }>(`/api/jobs?${params.toString()}`);
        collected.push(...jobs);
        if (nextCursor && seen.has(nextCursor))
          throw new Error('Job pagination did not advance');
        if (nextCursor) seen.add(nextCursor);
        cursor = nextCursor;
      } while (cursor);
      return collected.map(mapSummaryToJob);
    } catch (error) {
      logger.error('Job service error fetching homeowner jobs', error);
      throw error;
    }
  }

  static async getJobById(jobId: string): Promise<Job | null> {
    try {
      const { job } = await api<{ job: Job }>(
        `/api/jobs/${encodeURIComponent(jobId)}`
      );
      return job;
    } catch (error) {
      logger.error('Job service error', error);
      return null;
    }
  }

  static async createJob(input: Partial<Job>): Promise<Job | null> {
    try {
      const { job } = await api<{ job: Job }>(`/api/jobs`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return job;
    } catch (error) {
      logger.error('Job service error', error);
      return null;
    }
  }

  static async updateJob(id: string, input: Partial<Job>): Promise<Job | null> {
    try {
      const { job } = await api<{ job: Job }>(
        `/api/jobs/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        }
      );
      return job;
    } catch (error) {
      logger.error('Job service error', error);
      return null;
    }
  }

  // Mock data for development when API is not available
  private static getMockJobs(): Job[] {
    return [
      {
        id: '1',
        title: 'Kitchen Faucet Repair',
        description:
          'Kitchen faucet is leaking and needs immediate attention. The drip is constant and wasting water.',
        status: 'posted',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        location: 'Downtown Seattle, WA',
      },
    ];
  }
}
