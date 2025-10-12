import type { JobDetail as Job, JobSummary } from '@mintenance/types/src/contracts';
import { logger } from '@/lib/logger';

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

const mapSummaryToJob = (summary: JobSummary): Job => ({
  id: summary.id,
  title: summary.title,
  status: summary.status,
  createdAt: summary.createdAt,
  updatedAt: summary.updatedAt,
});

export class JobService {
  static async getAvailableJobs(): Promise<Job[]> {
    try {
      const params = new URLSearchParams({ limit: '20', status: 'posted' });
      const { jobs } = await api<{ jobs: JobSummary[] }>(`/api/jobs?${params.toString()}`);
      return jobs.map(mapSummaryToJob);
    } catch (error) {
      logger.error('Job service error', error);
      return this.getMockJobs();
    }
  }

  static async getJobsByHomeowner(_homeownerId: string): Promise<Job[]> {
    try {
      const { jobs } = await api<{ jobs: JobSummary[] }>(`/api/jobs?limit=50`);
      return jobs.map(mapSummaryToJob);
    } catch (error) {
      logger.error('Job service error', error);
      return this.getMockJobs();
    }
  }

  static async getJobById(jobId: string): Promise<Job | null> {
    try {
      const { job } = await api<{ job: Job }>(`/api/jobs/${encodeURIComponent(jobId)}`);
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
      const { job } = await api<{ job: Job }>(`/api/jobs/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
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
        description: 'Kitchen faucet is leaking and needs immediate attention. The drip is constant and wasting water.',
        status: 'posted',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        location: 'Downtown Seattle, WA',
      },
    ];
  }
}
