import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { JobService } from '../services/JobService';
import { UserService } from '../services/UserService';
import { MessagingService } from '../services/MessagingService';
import { queryClient } from '../lib/queryClient';
import { HapticService } from '../utils/haptics';
import { useAuth } from '../contexts/AuthContext';

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
    list: (filters: string) =>
      [...queryKeys.contractors.lists(), filters] as const,
    details: () => [...queryKeys.contractors.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.contractors.details(), id] as const,
  },
  messages: {
    all: () => ['messages'] as const,
    conversations: () =>
      [...queryKeys.messages.all(), 'conversations'] as const,
    conversation: (id: string) =>
      [...queryKeys.messages.all(), 'conversation', id] as const,
  },
  feed: {
    all: () => ['feed'] as const,
    posts: (filters: string) =>
      [...queryKeys.feed.all(), 'posts', filters] as const,
  },
  search: {
    all: () => ['search'] as const,
    contractors: (query: string, filters: string) =>
      [...queryKeys.search.all(), 'contractors', query, filters] as const,
    jobs: (query: string, filters: string) =>
      [...queryKeys.search.all(), 'jobs', query, filters] as const,
  },
};

// Query Invalidation Helpers
export const invalidateQueries = {
  allJobs: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() }),
  jobDetails: (jobId: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) }),
  allContractors: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.contractors.all() }),
  contractorDetails: (contractorId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.contractors.detail(contractorId),
    }),
  allMessages: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.messages.all() }),
  feedPosts: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.feed.all() }),
};

// Job-related hooks
export const useJobs = (filters?: unknown, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.jobs.list(JSON.stringify(filters || {})),
    queryFn: () => JobService.getJobs(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useJobDetails = (jobId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId),
    queryFn: () => JobService.getJob(jobId),
    enabled: enabled && !!jobId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateJob = () => {
  return useMutation({
    mutationFn: (jobData: Parameters<typeof JobService.createJob>[0]) => JobService.createJob(jobData),
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
    mutationFn: ({
      jobId,
      status,
      contractorId,
    }: {
      jobId: string;
      status: 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
      contractorId?: string;
    }) => JobService.updateJobStatus(jobId, status, contractorId),
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
    // Soft-delete by marking as cancelled
    mutationFn: (jobId: string) =>
      JobService.updateJobStatus(jobId, 'cancelled'),
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
export const useContractors = (filters?: unknown, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.contractors.list(JSON.stringify(filters || {})),
    // Placeholder: implement actual list API; returning empty for now
    queryFn: () => Promise.resolve([] as unknown[]),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useContractorDetails = (contractorId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.contractors.detail(contractorId),
    queryFn: () => UserService.getUserProfile(contractorId),
    enabled: enabled && !!contractorId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useContractorsInfinite = (filters?: unknown) => {
  return useInfiniteQuery({
    queryKey: queryKeys.contractors.list(JSON.stringify(filters || {})),
    queryFn: async () => [],
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
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.messages.conversations(),
    queryFn: () =>
      user?.id
        ? MessagingService.getUserMessageThreads(user.id)
        : Promise.resolve([]),
    enabled: enabled && !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/** @deprecated Use useJobMessages from useMessaging.ts which uses real-time subscriptions */
export const useJobMessages = (jobId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.messages.conversation(jobId),
    queryFn: () => MessagingService.getJobMessages(jobId),
    enabled: enabled && !!jobId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSendMessage = () => {
  return useMutation({
    mutationFn: ({
      jobId,
      recipientId,
      message,
      senderId,
    }: {
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
export const useFeedPosts = (filters?: unknown, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.feed.posts(JSON.stringify(filters || {})),
    // TODO: Implement feed posts API when feed feature is built
    queryFn: () => Promise.resolve([] as unknown[]),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useToggleLike = () => {
  return useMutation({
    // TODO: Implement feed like API when feed feature is built
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      throw new Error('Feed feature not implemented');
    },
    onError: () => {
      HapticService.error();
    },
  });
};

export const useToggleSave = () => {
  return useMutation({
    // TODO: Implement feed save API when feed feature is built
    mutationFn: ({ postId, isSaved }: { postId: string; isSaved: boolean }) => {
      throw new Error('Feed feature not implemented');
    },
    onError: () => {
      HapticService.error();
    },
  });
};

// Search hooks
export const useSearchContractors = (
  query: string,
  filters?: unknown,
  enabled = true
) => {
  return useQuery({
    queryKey: queryKeys.search.contractors(
      query,
      JSON.stringify(filters || {})
    ),
    queryFn: () => Promise.resolve([] as unknown[]),
    enabled: enabled && query.length > 2, // Only search if query is 3+ characters
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSearchJobs = (query: string, filters?: unknown, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.search.jobs(query, JSON.stringify(filters || {})),
    queryFn: () => JobService.searchJobs(query, filters as Parameters<typeof JobService.searchJobs>[1]),
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
  queryKey: unknown[];
  updateFn: (oldData: T, variables: unknown) => T;
  mutationFn: (variables: unknown) => Promise<unknown>;
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
