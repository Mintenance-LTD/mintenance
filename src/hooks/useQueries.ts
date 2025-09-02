import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { JobService } from '../services/JobService';
import { UserService } from '../services/UserService';
import { MessagingService } from '../services/MessagingService';
import { queryClient } from '../lib/queryClient';
import { HapticService } from '../utils/haptics';

// Query Keys Factory
export const queryKeys = {
  jobs: {
    all: () => ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all(), 'list'] as const,
    list: (filters: string) => [...queryKeys.jobs.lists(), filters] as const,
    details: () => [...queryKeys.jobs.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
  },
  contractors: {
    all: () => ['contractors'] as const,
    lists: () => [...queryKeys.contractors.all(), 'list'] as const,
    list: (filters: string) => [...queryKeys.contractors.lists(), filters] as const,
    details: () => [...queryKeys.contractors.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.contractors.details(), id] as const,
  },
  messages: {
    all: () => ['messages'] as const,
    conversations: () => [...queryKeys.messages.all(), 'conversations'] as const,
    conversation: (id: string) => [...queryKeys.messages.all(), 'conversation', id] as const,
  },
  feed: {
    all: () => ['feed'] as const,
    posts: (filters: string) => [...queryKeys.feed.all(), 'posts', filters] as const,
  },
  search: {
    all: () => ['search'] as const,
    contractors: (query: string, filters: string) => [...queryKeys.search.all(), 'contractors', query, filters] as const,
    jobs: (query: string, filters: string) => [...queryKeys.search.all(), 'jobs', query, filters] as const,
  },
};

// Query Invalidation Helpers
export const invalidateQueries = {
  allJobs: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() }),
  jobDetails: (jobId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) }),
  allContractors: () => queryClient.invalidateQueries({ queryKey: queryKeys.contractors.all() }),
  contractorDetails: (contractorId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.contractors.detail(contractorId) }),
  allMessages: () => queryClient.invalidateQueries({ queryKey: queryKeys.messages.all() }),
  feedPosts: () => queryClient.invalidateQueries({ queryKey: queryKeys.feed.all() }),
};

// Job-related hooks
export const useJobs = (filters?: any, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.jobs.list(JSON.stringify(filters || {})),
    queryFn: () => JobService.getJobs(filters),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useJobDetails = (jobId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId),
    queryFn: () => JobService.getJobDetails(jobId),
    enabled: enabled && !!jobId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateJob = () => {
  return useMutation({
    mutationFn: (jobData: any) => JobService.createJob(jobData),
    onSuccess: () => {
      // Invalidate jobs list to show new job
      invalidateQueries.allJobs();
      HapticService.jobPosted();
    },
    onError: () => {
      HapticService.error();
    },
  });
};

export const useUpdateJob = () => {
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: any }) => 
      JobService.updateJob(jobId, data),
    onSuccess: (data, variables) => {
      // Invalidate specific job details
      invalidateQueries.jobDetails(variables.jobId);
      // Invalidate jobs list
      invalidateQueries.allJobs();
      HapticService.success();
    },
    onError: () => {
      HapticService.error();
    },
  });
};

export const useDeleteJob = () => {
  return useMutation({
    mutationFn: (jobId: string) => JobService.deleteJob(jobId),
    onSuccess: () => {
      invalidateQueries.allJobs();
      HapticService.success();
    },
    onError: () => {
      HapticService.error();
    },
  });
};

// Contractor-related hooks
export const useContractors = (filters?: any, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.contractors.list(JSON.stringify(filters || {})),
    queryFn: () => UserService.getContractors(filters),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useContractorDetails = (contractorId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.contractors.detail(contractorId),
    queryFn: () => UserService.getContractorDetails(contractorId),
    enabled: enabled && !!contractorId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useContractorsInfinite = (filters?: any) => {
  return useInfiniteQuery({
    queryKey: queryKeys.contractors.list(JSON.stringify(filters || {})),
    queryFn: ({ pageParam = 0 }) => UserService.getContractorsPaginated(pageParam, filters),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
    staleTime: 10 * 60 * 1000,
  });
};

// Message-related hooks
export const useConversations = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.messages.conversations(),
    queryFn: () => MessagingService.getConversations(),
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useJobMessages = (jobId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.messages.conversation(jobId),
    queryFn: () => MessagingService.getJobMessages(jobId),
    enabled: enabled && !!jobId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useSendMessage = () => {
  return useMutation({
    mutationFn: ({ jobId, recipientId, message, senderId }: {
      jobId: string;
      recipientId: string;
      message: string;
      senderId: string;
    }) => MessagingService.sendMessage(jobId, recipientId, message, senderId),
    onSuccess: (data, variables) => {
      // Invalidate messages for this job
      invalidateQueries.allMessages();
      HapticService.messageSent();
    },
    onError: () => {
      HapticService.error();
    },
  });
};

// Feed/Social hooks
export const useFeedPosts = (filters?: any, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.feed.posts(JSON.stringify(filters || {})),
    queryFn: () => {
      // Mock feed posts - replace with actual service call
      return Promise.resolve([
        {
          id: '1',
          contractorName: 'Mike Johnson',
          role: 'Plumber',
          verified: true,
          timestamp: '2h ago',
          content: 'Just finished a challenging bathroom renovation!',
          hashtags: ['#plumbing', '#renovation'],
          likes: 24,
          comments: 5,
          shares: 2,
          liked: false,
          saved: false,
        },
      ]);
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useToggleLike = () => {
  return useMutation({
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      // Mock like toggle - replace with actual service call
      return Promise.resolve({ postId, liked: !isLiked });
    },
    onSuccess: () => {
      invalidateQueries.feedPosts();
      HapticService.likePost();
    },
    onError: () => {
      HapticService.error();
    },
  });
};

export const useToggleSave = () => {
  return useMutation({
    mutationFn: ({ postId, isSaved }: { postId: string; isSaved: boolean }) => {
      // Mock save toggle - replace with actual service call
      return Promise.resolve({ postId, saved: !isSaved });
    },
    onSuccess: () => {
      invalidateQueries.feedPosts();
      HapticService.savePost();
    },
    onError: () => {
      HapticService.error();
    },
  });
};

// Search hooks
export const useSearchContractors = (query: string, filters?: any, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.search.contractors(query, JSON.stringify(filters || {})),
    queryFn: () => UserService.searchContractors(query, filters),
    enabled: enabled && query.length > 2, // Only search if query is 3+ characters
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSearchJobs = (query: string, filters?: any, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.search.jobs(query, JSON.stringify(filters || {})),
    queryFn: () => JobService.searchJobs(query, filters),
    enabled: enabled && query.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Optimistic updates helper
export const useOptimisticUpdate = <T>({
  queryKey,
  updateFn,
  mutationFn,
}: {
  queryKey: any[];
  updateFn: (oldData: T, variables: any) => T;
  mutationFn: (variables: any) => Promise<any>;
}) => {
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);
      
      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: T) => updateFn(old, variables));
      
      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      HapticService.error();
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey });
    },
  });
};