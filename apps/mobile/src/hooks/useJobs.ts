import { JobService } from '../services/JobService';
import { queryKeys } from '../lib/queryClient';
import { useOfflineQuery, useOfflineMutation } from './useOfflineQuery';
import { Job } from '@mintenance/types';
import { validateJobDraft, type JobDraft } from '@mintenance/api-contracts';

// Query hooks
const useJobs = (limit: number = 20, offset: number = 0) => {
  return useOfflineQuery({
    queryKey: queryKeys.jobs.list(`limit:${limit},offset:${offset}`),
    queryFn: () => JobService.getJobs(undefined, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

const useAvailableJobs = () => {
  return useOfflineQuery({
    queryKey: queryKeys.jobs.list('available'),
    queryFn: () => JobService.getAvailableJobs(),
    staleTime: 60 * 1000, // 1 minute for active jobs
  });
};

const useJobsByHomeowner = (homeownerId: string) => {
  return useOfflineQuery({
    queryKey: queryKeys.jobs.list(`homeowner:${homeownerId}`),
    queryFn: () => JobService.getJobsByHomeowner(homeownerId),
    enabled: !!homeownerId,
  });
};

const useJobsByStatus = (status: Job['status'], userId?: string) => {
  return useOfflineQuery({
    queryKey: queryKeys.jobs.list(`status:${status},user:${userId || 'all'}`),
    queryFn: () => JobService.getJobsByStatus(status, userId),
  });
};

export const useJob = (jobId: string) => {
  return useOfflineQuery({
    queryKey: queryKeys.jobs.details(jobId),
    queryFn: () => JobService.getJobById(jobId),
    enabled: !!jobId,
    staleTime: 30 * 1000, // 30 seconds for individual job details
    retry: 3,
    gcTime: 15 * 60 * 1000,
    placeholderData: (prev: Job | null | undefined) => prev,
  });
};

/**
 * 2026-05-23 audit: `enabled` is now caller-controlled. The bids
 * endpoint /api/jobs/:id/bids returns 403 for non-owners, but the
 * JobDetailsScreen used to fire this hook for everyone — every
 * contractor opening a job triggered a forbidden response + retry
 * storm. Callers (homeowner-side) pass enabled: isOwner so the
 * query only runs when the auth context allows it.
 */
export const useJobBids = (
  jobId: string,
  { enabled = true }: { enabled?: boolean } = {}
) => {
  return useOfflineQuery({
    queryKey: queryKeys.jobs.bids(jobId),
    queryFn: () => JobService.getBidsByJob(jobId),
    enabled: !!jobId && enabled,
    staleTime: 30 * 1000, // 30 seconds for bids
  });
};

const useSearchJobs = (query: string, limit: number = 20) => {
  return useOfflineQuery({
    queryKey: queryKeys.search.jobs(query),
    queryFn: () => JobService.searchJobs(query, {}, limit),
    enabled: query.length > 2, // Only search if query is meaningful
    staleTime: 5 * 60 * 1000, // 5 minutes for search results
  });
};

// Mutation hooks
export const useCreateJob = () => {
  return useOfflineMutation({
    mutationFn: async (jobData: {
      title: string;
      description: string;
      location: string;
      // 2026-05-22: budget is now optional. Contractors set their own
      // price on each bid. Kept here for legacy callers (e.g. seeded
      // demo data) but the homeowner forms no longer collect it.
      budget?: number;
      homeownerId: string;
      category?: string;
      subcategory?: string;
      urgency?: 'low' | 'medium' | 'high' | 'emergency';
      photos?: string[];
      // R6 #19 landlord / tenancy — optional forwarding to the server
      is_rental_property?: boolean;
      tenancy_metadata?: Record<string, unknown>;
      // 2026-05-22: per-job toggles persisted to jobs.requirements jsonb
      // (e.g. contractor_before_photos for no-upload flows).
      requirements?: Record<string, unknown>;
    }) => {
      // 2026-05-01 audit P1 close-out: replaced ad-hoc inline validation
      // (every length / range / required check that drifted from the
      // server-side schema over time) with `validateJobDraft` from
      // `@mintenance/api-contracts`. The shared schema is the SAME one
      // the server enforces, so client-side errors here mirror the
      // wire-level Zod errors exactly — no surprise 400s after the
      // user taps Submit. Legacy mutationFn shape kept so existing
      // entry-point callers don't break; internal mapping converts to
      // the canonical `JobDraft`.
      if (!jobData.homeownerId) {
        throw new Error('User authentication is required');
      }

      const draft: JobDraft = {
        title: jobData.title,
        description: jobData.description,
        location: jobData.location,
        category: jobData.category as JobDraft['category'],
        urgency: jobData.urgency,
        photoUrls: jobData.photos,
        isRentalProperty: jobData.is_rental_property,
        tenancyMetadata: jobData.tenancy_metadata,
      };
      if (jobData.budget !== undefined) {
        draft.budget = jobData.budget;
      }

      const validation = validateJobDraft(draft);
      if (!validation.ok) {
        // Surface the first error so the existing toast / inline UI
        // pipeline keeps working. Multiple errors are still in the
        // ServiceErrorHandler chain inside JobCRUDService.
        const first = validation.errors[0];
        const message = first?.message ?? 'Job draft failed validation';
        throw new Error(message);
      }

      return JobService.createJob({
        ...jobData,
        title: jobData.title.trim(),
        description: jobData.description.trim(),
        location: jobData.location.trim(),
      });
    },
    entity: 'job',
    actionType: 'CREATE',
    getQueryKey: (variables) =>
      queryKeys.jobs.list(`homeowner:${variables.homeownerId}`),
    optimisticUpdate: (variables) =>
      ({
        id: `temp_job_${Date.now()}`,
        title: variables.title.trim(),
        description: variables.description.trim(),
        location: variables.location.trim(),
        budget: variables.budget,
        homeownerId: variables.homeownerId,
        contractorId: null,
        category: variables.category || 'handyman',
        subcategory: variables.subcategory,
        urgency: variables.urgency || 'medium',
        status: 'posted' as const,
        photos: variables.photos || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bids: [],
      }) as unknown as Job,
  });
};

const useUpdateJobStatus = () => {
  return useOfflineMutation({
    mutationFn: ({
      jobId,
      status,
      contractorId,
    }: {
      jobId: string;
      status: Job['status'];
      contractorId?: string;
    }) => JobService.updateJobStatus(jobId, status, contractorId),
    entity: 'job',
    actionType: 'UPDATE',
    getQueryKey: (variables) => queryKeys.jobs.details(variables.jobId),
  });
};

const useStartJob = () => {
  return useOfflineMutation({
    mutationFn: (jobId: string) => JobService.startJob(jobId),
    entity: 'job',
    actionType: 'UPDATE',
    getQueryKey: (jobId) => queryKeys.jobs.details(jobId),
    optimisticUpdate: () => ({ status: 'in_progress' }),
  });
};

const useCompleteJob = () => {
  return useOfflineMutation({
    mutationFn: (jobId: string) => JobService.completeJob(jobId),
    entity: 'job',
    actionType: 'UPDATE',
    getQueryKey: (jobId) => queryKeys.jobs.details(jobId),
    optimisticUpdate: () => ({ status: 'completed' }),
  });
};

const useSubmitBid = () => {
  return useOfflineMutation({
    mutationFn: JobService.submitBid,
    entity: 'bid',
    actionType: 'CREATE',
    getQueryKey: (variables) => queryKeys.jobs.bids(variables.jobId),
    optimisticUpdate: (variables) => ({
      id: `temp_bid_${Date.now()}`,
      ...variables,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    }),
  });
};

/**
 * Audit step 11 (2026-04-29): the mutation now accepts an
 * `{ bidId, jobId }` payload so the BidService routes can be
 * addressed without a server-side lookup. ContractorAssignment
 * passes both — every other UI that wants to accept a bid has
 * `jobId` in scope.
 */
export const useAcceptBid = () => {
  return useOfflineMutation({
    mutationFn: ({ bidId, jobId }: { bidId: string; jobId: string }) =>
      JobService.acceptBid(bidId, jobId),
    entity: 'bid',
    actionType: 'UPDATE',
    onlineOnly: true, // Accepting bids should be done online for data consistency
  });
};
