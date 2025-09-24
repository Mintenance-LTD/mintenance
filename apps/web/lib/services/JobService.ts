import type { JobDetail as Job, JobSummary } from '@mintenance/types/src/contracts';

async function api<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init && init.headers ? (init.headers as Record<string, string>) : {}),
    },
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`API ${input} failed: ${res.status} ${msg}`);
  }
  return (await res.json()) as T;
}

export class JobService {
  static async getAvailableJobs(): Promise<Job[]> {
    try {
      const params = new URLSearchParams({ limit: '20', status: 'posted' });
      const { jobs } = await api<{ jobs: JobSummary[] }>(`/api/jobs?${params.toString()}`);
      return jobs.map(j => ({
        id: j.id,
        title: j.title,
        status: j.status,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })) as unknown as Job[];
    } catch (error) {
      console.error('Job service error:', error);
      return this.getMockJobs();
    }
  }

  static async getJobsByHomeowner(_homeownerId: string): Promise<Job[]> {
    try {
      const { jobs } = await api<{ jobs: JobSummary[] }>(`/api/jobs?limit=50`);
      return jobs.map(j => ({
        id: j.id,
        title: j.title,
        status: j.status,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })) as unknown as Job[];
    } catch (error) {
      console.error('Job service error:', error);
      return this.getMockJobs();
    }
  }

  static async getJobById(jobId: string): Promise<Job | null> {
    try {
      const { job } = await api<{ job: Job }>(`/api/jobs/${encodeURIComponent(jobId)}`);
      return job;
    } catch (error) {
      console.error('Job service error:', error);
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
      console.error('Job service error:', error);
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
      console.error('Job service error:', error);
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
        location: 'Downtown Seattle, WA' as any,
        // @ts-expect-error legacy fields retained for compatibility
        homeowner_id: 'user1',
        status: 'posted',
        // @ts-expect-error legacy fields retained for compatibility
        budget: 150,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        // @ts-expect-error legacy
        category: 'plumbing',
        // @ts-expect-error legacy
        priority: 'medium',
        // @ts-expect-error legacy
        photos: ['https://via.placeholder.com/300x200/3B82F6/FFFFFF?text=Kitchen+Faucet'],
      } as unknown as Job,
    ];
  }
}
