/**
 * React Query Client Configuration
 * Provides optimized caching and request management for the web app
 */

import { QueryClient } from '@tanstack/react-query';
import type { Job } from '@mintenance/types';

/**
 * Configure React Query client with production-ready settings
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // How long data stays in cache when not used (garbage collection)
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      
      // Retry configuration with smart error handling
      retry: (failureCount: number, error: Error | { status?: number; name?: string; message?: string }) => {
        // Don't retry 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) return false;
        
        // Don't retry network errors immediately
        if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
          return failureCount < 2;
        }
        
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => 
        Math.min(1000 * Math.pow(2, attemptIndex), 30000),
      
      // Refetch configuration for optimal UX
      refetchOnWindowFocus: false, // Disabled to prevent excessive refetches
      refetchOnReconnect: true,    // Refetch when coming back online
      refetchOnMount: true,        // Always refetch on component mount
      
      // Prevent infinite loading loops
      refetchInterval: false,
      refetchIntervalInBackground: false,
      
      // Network mode for better offline handling
      networkMode: 'online',
    },
    
    mutations: {
      // Don't retry mutations by default (user should retry manually)
      retry: false,
      
      // Network mode for mutations
      networkMode: 'online',
      
      // Optimistic updates can be configured per mutation
      onMutate: undefined,
      onError: undefined,
      onSettled: undefined,
    },
  },
});

/**
 * Query key factory for type-safe query keys
 */
export const queryKeys = {
  // User-related queries
  user: {
    profile: (userId: string) => ['user', 'profile', userId] as const,
    stats: (userId: string) => ['user', 'stats', userId] as const,
    preferences: (userId: string) => ['user', 'preferences', userId] as const,
    contractors: (userId: string) => ['user', 'contractors', userId] as const,
  },

  // Job-related queries
  jobs: {
    all: ['jobs'] as const,
    lists: () => ['jobs', 'list'] as const,
    list: (filters?: string) => ['jobs', 'list', filters] as const,
    details: (jobId: string) => ['jobs', 'detail', jobId] as const,
    bids: (jobId: string) => ['jobs', 'bids', jobId] as const,
    payments: (jobId: string) => ['jobs', 'payments', jobId] as const,
  },

  // Contractor-related queries
  contractors: {
    all: ['contractors'] as const,
    lists: () => ['contractors', 'list'] as const,
    list: (filters?: string) => ['contractors', 'list', filters] as const,
    details: (contractorId: string) => ['contractors', 'detail', contractorId] as const,
    reviews: (contractorId: string) => ['contractors', 'reviews', contractorId] as const,
    gallery: (contractorId: string) => ['contractors', 'gallery', contractorId] as const,
  },

  // Message-related queries
  messages: {
    all: ['messages'] as const,
    conversations: () => ['messages', 'conversations'] as const,
    conversation: (jobId: string) => ['messages', 'conversation', jobId] as const,
    thread: (threadId: string) => ['messages', 'thread', threadId] as const,
  },

  // Payment-related queries
  payments: {
    all: ['payments'] as const,
    intents: (userId: string) => ['payments', 'intents', userId] as const,
    methods: (userId: string) => ['payments', 'methods', userId] as const,
    transactions: (userId: string) => ['payments', 'transactions', userId] as const,
  },

  // Search queries
  search: {
    all: ['search'] as const,
    contractors: (query: string, filters?: string) => 
      ['search', 'contractors', query, filters] as const,
    jobs: (query: string, filters?: string) => 
      ['search', 'jobs', query, filters] as const,
    services: (query: string) => ['search', 'services', query] as const,
  },

  // Analytics queries
  analytics: {
    all: ['analytics'] as const,
    dashboard: (userId: string) => ['analytics', 'dashboard', userId] as const,
    revenue: (userId: string, period?: string) => 
      ['analytics', 'revenue', userId, period] as const,
    performance: (userId: string) => ['analytics', 'performance', userId] as const,
  },
} as const;

/**
 * Utility functions for common query operations
 */
export const queryUtils = {
  /**
   * Invalidate user-related queries
   */
  invalidateUser: (userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.user.stats(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.user.preferences(userId) });
  },

  /**
   * Invalidate job-related queries
   */
  invalidateJobs: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
  },

  /**
   * Invalidate contractor-related queries
   */
  invalidateContractors: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.contractors.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.contractors.lists() });
  },

  /**
   * Invalidate payment-related queries
   */
  invalidatePayments: (userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.payments.intents(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.payments.methods(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.payments.transactions(userId) });
  },

  /**
   * Invalidate all queries (use sparingly)
   */
  invalidateAll: () => {
    queryClient.invalidateQueries();
  },

  /**
   * Prefetch data for better UX
   */
  prefetchUserProfile: async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.user.profile(userId),
      queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json()),
      staleTime: 5 * 60 * 1000,
    });
  },

  /**
   * Set query data optimistically
   */
  setJobData: (jobId: string, data: Job) => {
    queryClient.setQueryData(queryKeys.jobs.details(jobId), data);
  },
};

export default queryClient;
