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
    mutationFn: async (jobData: {
      title: string;
      description: string;
      location: string;
      budget: number;
      homeownerId: string;
      category?: string;
      subcategory?: string;
      priority?: 'low' | 'medium' | 'high';
      photos?: string[];
    }) => {
      // Server-side validation (backup for client validation)
      if (!jobData.title.trim()) {
        throw new Error('Job title is required');
      }
      if (jobData.title.trim().length < 10) {
        throw new Error('Job title must be at least 10 characters long');
      }
      if (jobData.title.trim().length > 100) {
        throw new Error('Job title cannot exceed 100 characters');
      }

      if (!jobData.description.trim()) {
        throw new Error('Job description is required');
      }
      if (jobData.description.trim().length < 20) {
        throw new Error('Job description must be at least 20 characters long');
      }
      if (jobData.description.trim().length > 500) {
        throw new Error('Job description cannot exceed 500 characters');
      }

      if (!jobData.location.trim()) {
        throw new Error('Job location is required');
      }
      if (jobData.location.trim().length < 5) {
        throw new Error('Please provide a more specific location');
      }

      if (!jobData.budget || jobData.budget <= 0) {
        throw new Error('Budget must be greater than 0');
      }
      if (jobData.budget > 50000) {
        throw new Error('Budget cannot exceed £50,000');
      }

      if (!jobData.homeownerId) {
        throw new Error('User authentication is required');
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
    getQueryKey: (variables) => queryKeys.jobs.list(`homeowner:${variables.homeownerId}`),
    optimisticUpdate: (variables) => ({
      id: `temp_job_${Date.now()}`,
      title: variables.title.trim(),
      description: variables.description.trim(),
      location: variables.location.trim(),
      budget: variables.budget,
      homeownerId: variables.homeownerId,
      contractorId: null,
      category: variables.category || 'handyman',
      subcategory: variables.subcategory,
      priority: variables.priority || 'medium',
      status: 'posted' as const,
      photos: variables.photos || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bids: [],
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