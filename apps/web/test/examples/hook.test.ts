/**
 * Example: Custom Hook Testing with Vitest
 * Demonstrates testing React Query hooks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useJobs } from '@/hooks/useJobs';
import { mockJob, mockApiResponse } from '../utils';

// Create a wrapper with QueryClient for hooks
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useJobs Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Fetching', () => {
    it('should fetch jobs successfully', async () => {
      const mockJobs = [
        mockJob({ id: 'job-1', title: 'Fix leak' }),
        mockJob({ id: 'job-2', title: 'Paint wall' }),
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve(mockApiResponse.success({ jobs: mockJobs }))
      ) as any;

      const { result } = renderHook(() => useJobs(), {
        wrapper: createWrapper(),
      });

      // Initial loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.jobs).toBeUndefined();

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.jobs).toEqual(mockJobs);
      expect(result.current.error).toBeNull();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/jobs'),
        expect.any(Object)
      );
    });

    it('should handle fetch errors', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve(mockApiResponse.error('Failed to fetch jobs', 500))
      ) as any;

      const { result } = renderHook(() => useJobs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.jobs).toBeUndefined();
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as any;

      const { result } = renderHook(() => useJobs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Filtering', () => {
    it('should filter jobs by status', async () => {
      const mockJobs = [
        mockJob({ id: 'job-1', status: 'posted' }),
        mockJob({ id: 'job-2', status: 'completed' }),
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve(mockApiResponse.success({ jobs: mockJobs }))
      ) as any;

      const { result } = renderHook(
        () => useJobs({ status: 'posted' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=posted'),
        expect.any(Object)
      );
    });

    it('should filter jobs by category', async () => {
      const { result } = renderHook(
        () => useJobs({ category: 'plumbing' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=plumbing'),
        expect.any(Object)
      );
    });
  });

  describe('Refetching', () => {
    it('should refetch data when refetch is called', async () => {
      const mockJobs = [mockJob()];

      global.fetch = vi.fn(() =>
        Promise.resolve(mockApiResponse.success({ jobs: mockJobs }))
      ) as any;

      const { result } = renderHook(() => useJobs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstCallCount = (fetch as any).mock.calls.length;

      // Trigger refetch
      result.current.refetch();

      await waitFor(() => {
        expect((fetch as any).mock.calls.length).toBeGreaterThan(firstCallCount);
      });
    });
  });

  describe('Caching', () => {
    it('should use cached data on subsequent renders', async () => {
      const mockJobs = [mockJob()];

      global.fetch = vi.fn(() =>
        Promise.resolve(mockApiResponse.success({ jobs: mockJobs }))
      ) as any;

      const { result, rerender } = renderHook(() => useJobs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCount = (fetch as any).mock.calls.length;

      // Rerender shouldn't trigger new fetch (data is cached)
      rerender();

      expect((fetch as any).mock.calls.length).toBe(callCount);
      expect(result.current.jobs).toEqual(mockJobs);
    });
  });
});
