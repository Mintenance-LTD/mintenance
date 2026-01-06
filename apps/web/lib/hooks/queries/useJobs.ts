/**
 * React Query hooks for Jobs API
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Request deduplication
 * - Background refetching
 * - Optimistic updates
 * - Type-safe query keys
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query-client';
import type { Job, JobDetail, JobSummary } from '@mintenance/types';
import { logger } from '@mintenance/shared';

/**
 * Fetch jobs list with optional filters
 */
async function fetchJobs(filters?: {
  status?: string[];
  limit?: number;
  cursor?: string;
}): Promise<{ jobs: JobSummary[]; nextCursor?: string }> {
  const params = new URLSearchParams();

  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.cursor) params.set('cursor', filters.cursor);
  if (filters?.status) {
    filters.status.forEach(s => params.append('status', s));
  }

  const response = await fetch(`/api/jobs?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch jobs' }));
    throw new Error(error.error || 'Failed to fetch jobs');
  }

  return response.json();
}

/**
 * Fetch single job by ID
 */
async function fetchJob(jobId: string): Promise<JobDetail> {
  const response = await fetch(`/api/jobs/${jobId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch job' }));
    throw new Error(error.error || 'Failed to fetch job');
  }

  const data = await response.json();
  return data.job;
}

/**
 * Create a new job
 */
async function createJob(jobData: {
  title: string;
  description?: string;
  category?: string;
  budget?: number;
  location?: string;
  photoUrls?: string[];
  requiredSkills?: string[];
  property_id?: string;
}): Promise<JobDetail> {
  // Get CSRF token
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  const response = await fetch('/api/jobs', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
    body: JSON.stringify(jobData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create job' }));
    throw new Error(error.error || 'Failed to create job');
  }

  const data = await response.json();
  return data.job;
}

/**
 * Update an existing job
 */
async function updateJob(jobId: string, updates: Partial<{
  title: string;
  description: string;
  category: string;
  budget: number;
  location: string;
  status: string;
}>): Promise<JobDetail> {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  const response = await fetch(`/api/jobs/${jobId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update job' }));
    throw new Error(error.error || 'Failed to update job');
  }

  const data = await response.json();
  return data.job;
}

/**
 * Hook to fetch jobs list
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useJobs({ status: ['posted'] });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 *
 * return <JobList jobs={data.jobs} />;
 * ```
 */
export function useJobs(filters?: {
  status?: string[];
  limit?: number;
  cursor?: string;
}) {
  // Create unique query key based on filters
  const filterString = filters ? JSON.stringify(filters) : undefined;

  return useQuery({
    queryKey: queryKeys.jobs.list(filterString),
    queryFn: () => fetchJobs(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch single job
 *
 * @example
 * ```tsx
 * const { data: job, isLoading } = useJob(jobId);
 *
 * if (isLoading) return <Skeleton />;
 * if (!job) return <NotFound />;
 *
 * return <JobDetails job={job} />;
 * ```
 */
export function useJob(jobId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.jobs.details(jobId || ''),
    queryFn: () => fetchJob(jobId!),
    enabled: !!jobId, // Only run if jobId exists
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to create a new job
 *
 * @example
 * ```tsx
 * const createJobMutation = useCreateJob();
 *
 * const handleSubmit = async (data) => {
 *   try {
 *     const job = await createJobMutation.mutateAsync(data);
 *     router.push(`/jobs/${job.id}`);
 *   } catch (error) {
 *     toast.error(error.message);
 *   }
 * };
 * ```
 */
export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createJob,
    onSuccess: (newJob) => {
      // Invalidate jobs list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });

      // Optimistically add to cache
      queryClient.setQueryData(queryKeys.jobs.details(newJob.id), newJob);

      logger.info('Job created successfully', {
        service: 'jobs',
        jobId: newJob.id,
      });
    },
    onError: (error) => {
      logger.error('Failed to create job', error, {
        service: 'jobs',
      });
    },
  });
}

/**
 * Hook to update an existing job
 *
 * @example
 * ```tsx
 * const updateJobMutation = useUpdateJob(jobId);
 *
 * const handleUpdate = async (updates) => {
 *   await updateJobMutation.mutateAsync(updates);
 *   toast.success('Job updated successfully');
 * };
 * ```
 */
export function useUpdateJob(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Parameters<typeof updateJob>[1]) => updateJob(jobId, updates),
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.details(jobId) });

      // Snapshot previous value
      const previousJob = queryClient.getQueryData(queryKeys.jobs.details(jobId));

      // Optimistically update cache
      queryClient.setQueryData(queryKeys.jobs.details(jobId), (old: unknown) => ({
        ...old,
        ...updates,
      }));

      return { previousJob };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousJob) {
        queryClient.setQueryData(queryKeys.jobs.details(jobId), context.previousJob);
      }

      logger.error('Failed to update job', error, {
        service: 'jobs',
        jobId,
      });
    },
    onSuccess: (updatedJob) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
      queryClient.setQueryData(queryKeys.jobs.details(jobId), updatedJob);

      logger.info('Job updated successfully', {
        service: 'jobs',
        jobId,
      });
    },
  });
}

/**
 * Hook to prefetch a job (useful for hovering over links)
 *
 * @example
 * ```tsx
 * const prefetchJob = usePrefetchJob();
 *
 * <Link
 *   href={`/jobs/${jobId}`}
 *   onMouseEnter={() => prefetchJob(jobId)}
 * >
 *   View Job
 * </Link>
 * ```
 */
export function usePrefetchJob() {
  const queryClient = useQueryClient();

  return (jobId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.details(jobId),
      queryFn: () => fetchJob(jobId),
      staleTime: 5 * 60 * 1000,
    });
  };
}
