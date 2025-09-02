import { JobService } from '../services/JobService';
import { queryKeys } from '../lib/queryClient';
import { useOfflineQuery, useOfflineMutation } from './useOfflineQuery';
import { Job } from '../types';

// Query hooks
export const useJobs = (limit: number = 20, offset: number = 0) => {
  return useOfflineQuery({
    queryKey: queryKeys.jobs.list(`limit:${limit},offset:${offset}`),
    queryFn: () => JobService.getJobs(limit, offset),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAvailableJobs = () => {
  return useOfflineQuery({
    queryKey: queryKeys.jobs.list('available'),
    queryFn: () => JobService.getAvailableJobs(),
    staleTime: 60 * 1000, // 1 minute for active jobs
  });
};

export const useJobsByHomeowner = (homeownerId: string) => {
  return useOfflineQuery({
    queryKey: queryKeys.jobs.list(`homeowner:${homeownerId}`),
    queryFn: () => JobService.getJobsByHomeowner(homeownerId),
    enabled: !!homeownerId,
  });
};

export const useJobsByStatus = (status: Job['status'], userId?: string) => {
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
  });
};

export const useJobBids = (jobId: string) => {
  return useOfflineQuery({
    queryKey: queryKeys.jobs.bids(jobId),
    queryFn: () => JobService.getBidsByJob(jobId),
    enabled: !!jobId,
    staleTime: 30 * 1000, // 30 seconds for bids
  });
};

export const useSearchJobs = (query: string, limit: number = 20) => {
  return useOfflineQuery({
    queryKey: queryKeys.search.jobs(query),
    queryFn: () => JobService.searchJobs(query, limit),
    enabled: query.length > 2, // Only search if query is meaningful
    staleTime: 5 * 60 * 1000, // 5 minutes for search results
  });
};

// Mutation hooks
export const useCreateJob = () => {
  return useOfflineMutation({
    mutationFn: JobService.createJob,
    entity: 'job',
    actionType: 'CREATE',
    getQueryKey: () => queryKeys.jobs.all,
    optimisticUpdate: (variables) => ({
      id: `temp_${Date.now()}`,
      ...variables,
      status: 'posted' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  });
};

export const useUpdateJobStatus = () => {
  return useOfflineMutation({
    mutationFn: ({ jobId, status, contractorId }: {
      jobId: string;
      status: Job['status'];
      contractorId?: string;
    }) => JobService.updateJobStatus(jobId, status, contractorId),
    entity: 'job',
    actionType: 'UPDATE',
    getQueryKey: (variables) => queryKeys.jobs.details(variables.jobId),
  });
};

export const useStartJob = () => {
  return useOfflineMutation({
    mutationFn: (jobId: string) => JobService.startJob(jobId),
    entity: 'job',
    actionType: 'UPDATE',
    getQueryKey: (jobId) => queryKeys.jobs.details(jobId),
    optimisticUpdate: () => ({ status: 'in_progress' }),
  });
};

export const useCompleteJob = () => {
  return useOfflineMutation({
    mutationFn: (jobId: string) => JobService.completeJob(jobId),
    entity: 'job',
    actionType: 'UPDATE',
    getQueryKey: (jobId) => queryKeys.jobs.details(jobId),
    optimisticUpdate: () => ({ status: 'completed' }),
  });
};

export const useSubmitBid = () => {
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

export const useAcceptBid = () => {
  return useOfflineMutation({
    mutationFn: (bidId: string) => JobService.acceptBid(bidId),
    entity: 'bid',
    actionType: 'UPDATE',
    onlineOnly: true, // Accepting bids should be done online for data consistency
  });
};