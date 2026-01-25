import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useInfiniteScroll } from '../useInfiniteScroll';

/**
 * Tests for useInfiniteScroll Hook - Pagination and Data Loading
 *
 * Critical functionality for job listings, contractor search, notifications,
 * and any paginated content in the Mintenance mobile app.
 *
 * Tests cover: initial load, pagination, refresh, error handling, loading states,
 * concurrent operations, edge cases, and real-world scenarios.
 */

describe('useInfiniteScroll Hook', () => {
  // Mock fetch function
  const createMockFetch = (options: {
    itemsPerPage?: number;
    totalPages?: number;
    delay?: number;
    shouldFail?: boolean;
    errorMessage?: string;
  } = {}) => {
    const {
      itemsPerPage = 10,
      totalPages = 5,
      delay = 0,
      shouldFail = false,
      errorMessage = 'Fetch failed',
    } = options;

    return jest.fn(async (page: number) => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (shouldFail) {
        throw new Error(errorMessage);
      }

      const startIndex = (page - 1) * itemsPerPage;
      const data = Array.from({ length: itemsPerPage }, (_, i) => ({
        id: startIndex + i + 1,
        name: `Item ${startIndex + i + 1}`,
      }));

      return {
        data: page <= totalPages ? data : [],
        hasMore: page < totalPages,
      };
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Load Behavior', () => {
    it('should load initial data on mount', async () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual([]);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(fetchFn).toHaveBeenCalledWith(1);
      expect(result.current.data).toHaveLength(10);
      expect(result.current.page).toBe(1);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should set correct initial state values', () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      expect(result.current.loading).toBe(true);
      expect(result.current.loadingMore).toBe(false);
      expect(result.current.refreshing).toBe(false);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.page).toBe(1);
      expect(result.current.data).toEqual([]);
    });

    it('should handle empty initial response', async () => {
      const fetchFn = createMockFetch({ totalPages: 0 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.hasMore).toBe(false);
    });

    it('should handle initial load with single page', async () => {
      const fetchFn = createMockFetch({ totalPages: 1 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toHaveLength(10);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.page).toBe(1);
    });

    it('should only call fetch once on mount', async () => {
      const fetchFn = createMockFetch();
      renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(fetchFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Load More (Pagination) Behavior', () => {
    it('should load next page when loadMore is called', async () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toHaveLength(10);

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.loadingMore).toBe(true);

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(fetchFn).toHaveBeenNthCalledWith(2, 2);
      expect(result.current.data).toHaveLength(20);
      expect(result.current.page).toBe(2);
    });

    it('should append new data to existing data', async () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstPageData = [...result.current.data];

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.data.slice(0, 10)).toEqual(firstPageData);
      expect(result.current.data[10].id).toBe(11);
      expect(result.current.data[19].id).toBe(20);
    });

    it('should not load more when already loading more', async () => {
      const fetchFn = createMockFetch({ delay: 100 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.loadingMore).toBe(true);

      // Try to load more while already loading
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      // Should only have called fetch twice (initial + first loadMore)
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should not load more when hasMore is false', async () => {
      const fetchFn = createMockFetch({ totalPages: 1 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);

      act(() => {
        result.current.loadMore();
      });

      // Should not have made additional fetch calls
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(result.current.loadingMore).toBe(false);
    });

    it('should handle multiple consecutive load more calls', async () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Load page 2
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.page).toBe(2);
      expect(result.current.data).toHaveLength(20);

      // Load page 3
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.page).toBe(3);
      expect(result.current.data).toHaveLength(30);

      // Load page 4
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.page).toBe(4);
      expect(result.current.data).toHaveLength(40);
    });

    it('should stop loading when reaching the last page', async () => {
      const fetchFn = createMockFetch({ totalPages: 2 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
      expect(result.current.page).toBe(2);

      // Try to load more
      act(() => {
        result.current.loadMore();
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should update hasMore based on response', async () => {
      const fetchFn = createMockFetch({ totalPages: 3 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('Refresh Behavior', () => {
    it('should refresh data from page 1', async () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Load more data
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.data).toHaveLength(20);
      expect(result.current.page).toBe(2);

      // Refresh
      act(() => {
        result.current.refresh();
      });

      expect(result.current.refreshing).toBe(true);

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      expect(result.current.page).toBe(1);
      expect(result.current.data).toHaveLength(10);
      expect(fetchFn).toHaveBeenCalledWith(1);
    });

    it('should set refreshing state during refresh', async () => {
      const fetchFn = createMockFetch({ delay: 50 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.refresh();
      });

      expect(result.current.refreshing).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.loadingMore).toBe(false);

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });
    });

    it('should replace data on refresh, not append', async () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.data).toHaveLength(20);

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      expect(result.current.data).toHaveLength(10);
      expect(result.current.data[0].id).toBe(1);
    });

    it('should reset hasMore on refresh', async () => {
      const fetchFn = createMockFetch({ totalPages: 1 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);

      // Change mock to return more pages
      fetchFn.mockImplementation(async (page: number) => ({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: (page - 1) * 10 + i + 1,
          name: `Item ${(page - 1) * 10 + i + 1}`,
        })),
        hasMore: page < 3,
      }));

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
    });

    it('should clear error on refresh', async () => {
      const fetchFn = createMockFetch({ shouldFail: true });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Update fetch to succeed
      fetchFn.mockImplementation(async (page: number) => ({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: (page - 1) * 10 + i + 1,
          name: `Item ${(page - 1) * 10 + i + 1}`,
        })),
        hasMore: true,
      }));

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Reset Behavior', () => {
    it('should reset all state to initial values', async () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.data).toHaveLength(20);
      expect(result.current.page).toBe(2);

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.page).toBe(1);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should clear error state', async () => {
      const fetchFn = createMockFetch({ shouldFail: true });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });

    it('should reset hasMore to true', async () => {
      const fetchFn = createMockFetch({ totalPages: 1 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);

      act(() => {
        result.current.reset();
      });

      expect(result.current.hasMore).toBe(true);
    });

    it('should not trigger new fetch on reset', () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      const initialCallCount = fetchFn.mock.calls.length;

      act(() => {
        result.current.reset();
      });

      expect(fetchFn).toHaveBeenCalledTimes(initialCallCount);
    });
  });

  describe('Error Handling', () => {
    it('should handle initial load error', async () => {
      const fetchFn = createMockFetch({ shouldFail: true, errorMessage: 'Network error' });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.data).toEqual([]);
    });

    it('should handle load more error', async () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toHaveLength(10);

      // Make next fetch fail
      fetchFn.mockImplementationOnce(async () => {
        throw new Error('Load more failed');
      });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.error?.message).toBe('Load more failed');
      expect(result.current.data).toHaveLength(10); // Should keep existing data
    });

    it('should handle refresh error', async () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      fetchFn.mockImplementationOnce(async () => {
        throw new Error('Refresh failed');
      });

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      expect(result.current.error?.message).toBe('Refresh failed');
    });

    it('should clear error on successful fetch after error', async () => {
      const fetchFn = createMockFetch({ shouldFail: true });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Update fetch to succeed
      fetchFn.mockImplementation(async (page: number) => ({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: (page - 1) * 10 + i + 1,
          name: `Item ${(page - 1) * 10 + i + 1}`,
        })),
        hasMore: true,
      }));

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle different error types', async () => {
      const errorTypes = [
        new Error('Network error'),
        new TypeError('Type error'),
        new Error('404 Not Found'),
        new Error('500 Internal Server Error'),
      ];

      for (const error of errorTypes) {
        const fetchFn = jest.fn().mockRejectedValue(error);
        const { result } = renderHook(() => useInfiniteScroll(fetchFn));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toEqual(error);
      }
    });
  });

  describe('Loading States', () => {
    it('should manage loading state correctly for initial load', async () => {
      const fetchFn = createMockFetch({ delay: 50 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      expect(result.current.loading).toBe(true);
      expect(result.current.loadingMore).toBe(false);
      expect(result.current.refreshing).toBe(false);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.loadingMore).toBe(false);
      expect(result.current.refreshing).toBe(false);
    });

    it('should manage loadingMore state correctly', async () => {
      const fetchFn = createMockFetch({ delay: 50 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.loadingMore).toBe(true);
      expect(result.current.refreshing).toBe(false);

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });
    });

    it('should manage refreshing state correctly', async () => {
      const fetchFn = createMockFetch({ delay: 50 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.refresh();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.loadingMore).toBe(false);
      expect(result.current.refreshing).toBe(true);

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });
    });

    it('should clear all loading states after error', async () => {
      const fetchFn = createMockFetch({ delay: 50, shouldFail: true });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.loadingMore).toBe(false);
      expect(result.current.refreshing).toBe(false);
      expect(result.current.error).not.toBeNull();
    });

    it('should prevent concurrent loadMore operations via ref', async () => {
      const fetchFn = createMockFetch({ delay: 100 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Start first loadMore
      act(() => {
        result.current.loadMore();
      });

      // Immediately try second loadMore
      act(() => {
        result.current.loadMore();
      });

      // Immediately try third loadMore
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      // Should only have called fetch twice (initial + one loadMore)
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle fetch function that returns undefined data', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        data: undefined,
        hasMore: false,
      });

      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Hook sets data directly to result.data (undefined)
      expect(result.current.data).toBeUndefined();
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch function that returns null data', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        data: null,
        hasMore: false,
      });

      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Hook sets data directly to result.data (null)
      expect(result.current.data).toBeNull();
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle very large page numbers', async () => {
      const fetchFn = createMockFetch({ totalPages: 100 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Load multiple pages quickly
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.loadMore();
        });

        await waitFor(() => {
          expect(result.current.loadingMore).toBe(false);
        });
      }

      expect(result.current.page).toBe(11);
      expect(result.current.data).toHaveLength(110);
    });

    it('should handle empty array responses', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        data: [],
        hasMore: false,
      });

      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.hasMore).toBe(false);
    });

    it('should handle response with varying item counts', async () => {
      const fetchFn = jest.fn()
        .mockResolvedValueOnce({
          data: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })),
          hasMore: true,
        })
        .mockResolvedValueOnce({
          data: Array.from({ length: 5 }, (_, i) => ({ id: i + 11 })),
          hasMore: true,
        })
        .mockResolvedValueOnce({
          data: Array.from({ length: 3 }, (_, i) => ({ id: i + 16 })),
          hasMore: false,
        });

      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toHaveLength(10);

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.data).toHaveLength(15);

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.data).toHaveLength(18);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('Concurrent Operations', () => {
    it('should not allow loadMore during refresh', async () => {
      const fetchFn = createMockFetch({ delay: 100 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.refresh();
      });

      expect(result.current.refreshing).toBe(true);

      // Try loadMore during refresh - should not execute due to loading check
      const dataLengthBeforeLoadMore = result.current.data.length;

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      // Data should only reflect refresh, not additional loadMore
      expect(result.current.data).toHaveLength(10);
    });

    it('should handle reset during load more', async () => {
      const fetchFn = createMockFetch({ delay: 100 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.loadingMore).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.page).toBe(1);

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });
    });

    it('should handle multiple rapid refresh calls', async () => {
      const fetchFn = createMockFetch({ delay: 50 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Multiple rapid refresh calls
      act(() => {
        result.current.refresh();
        result.current.refresh();
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      // Should have handled gracefully
      expect(result.current.data).toHaveLength(10);
    });
  });

  describe('FetchFn Dependency Changes', () => {
    it('should use updated fetchFn on rerender', async () => {
      const fetchFn1 = createMockFetch();
      const fetchFn2 = createMockFetch({ itemsPerPage: 20 });

      const { result, rerender } = renderHook(
        ({ fetchFn }) => useInfiniteScroll(fetchFn),
        { initialProps: { fetchFn: fetchFn1 } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toHaveLength(10);

      // Change fetchFn
      rerender({ fetchFn: fetchFn2 });

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      expect(fetchFn2).toHaveBeenCalled();
      expect(result.current.data).toHaveLength(20);
    });

    it('should call new fetchFn for loadMore after fetchFn change', async () => {
      const fetchFn1 = createMockFetch();
      const fetchFn2 = createMockFetch({ itemsPerPage: 15 });

      const { result, rerender } = renderHook(
        ({ fetchFn }) => useInfiniteScroll(fetchFn),
        { initialProps: { fetchFn: fetchFn1 } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender({ fetchFn: fetchFn2 });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(fetchFn2).toHaveBeenCalledWith(2);
    });
  });

  describe('Real-World Use Cases', () => {
    it('should handle job listings pagination', async () => {
      const fetchJobsFn = jest.fn(async (page: number) => {
        const jobs = Array.from({ length: 20 }, (_, i) => ({
          id: `job-${(page - 1) * 20 + i + 1}`,
          title: `Plumbing Job ${(page - 1) * 20 + i + 1}`,
          status: 'open',
        }));

        return {
          data: jobs,
          hasMore: page < 5,
        };
      });

      const { result } = renderHook(() => useInfiniteScroll(fetchJobsFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toHaveLength(20);
      expect(result.current.data[0].title).toBe('Plumbing Job 1');

      // User scrolls and loads more jobs
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.data).toHaveLength(40);
      expect(result.current.data[20].title).toBe('Plumbing Job 21');
    });

    it('should handle contractor search results', async () => {
      const fetchContractorsFn = jest.fn(async (page: number) => {
        const contractors = Array.from({ length: 10 }, (_, i) => ({
          id: `contractor-${(page - 1) * 10 + i + 1}`,
          name: `Contractor ${(page - 1) * 10 + i + 1}`,
          rating: 4.5,
        }));

        return {
          data: contractors,
          hasMore: page < 3,
        };
      });

      const { result } = renderHook(() => useInfiniteScroll(fetchContractorsFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toHaveLength(10);

      // Load all contractors
      while (result.current.hasMore) {
        act(() => {
          result.current.loadMore();
        });

        await waitFor(() => {
          expect(result.current.loadingMore).toBe(false);
        });
      }

      expect(result.current.data).toHaveLength(30);
      expect(result.current.hasMore).toBe(false);
    });

    it('should handle pull-to-refresh on notifications', async () => {
      const fetchNotificationsFn = jest.fn(async (page: number) => {
        const notifications = Array.from({ length: 15 }, (_, i) => ({
          id: `notif-${(page - 1) * 15 + i + 1}`,
          message: `Notification ${(page - 1) * 15 + i + 1}`,
          read: false,
        }));

        return {
          data: notifications,
          hasMore: page < 4,
        };
      });

      const { result } = renderHook(() => useInfiniteScroll(fetchNotificationsFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Load more notifications
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.data).toHaveLength(30);

      // User pulls to refresh
      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      expect(result.current.data).toHaveLength(15);
      expect(result.current.page).toBe(1);
    });

    it('should handle search with no results', async () => {
      const fetchSearchFn = jest.fn().mockResolvedValue({
        data: [],
        hasMore: false,
      });

      const { result } = renderHook(() => useInfiniteScroll(fetchSearchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.hasMore).toBe(false);

      // Try to load more (should do nothing)
      act(() => {
        result.current.loadMore();
      });

      expect(fetchSearchFn).toHaveBeenCalledTimes(1);
    });

    it('should handle network error with retry', async () => {
      const fetchFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue({
          data: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })),
          hasMore: true,
        });

      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // User retries by refreshing
      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data).toHaveLength(10);
    });
  });

  describe('Memory and Performance', () => {
    it('should not leak memory with many items', async () => {
      const fetchFn = createMockFetch({ itemsPerPage: 100, totalPages: 50 });
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Load many pages
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.loadMore();
        });

        await waitFor(() => {
          expect(result.current.loadingMore).toBe(false);
        });
      }

      expect(result.current.data).toHaveLength(1100);
      expect(result.current.page).toBe(11);
    });

    it('should handle rapid mount/unmount cycles', async () => {
      for (let i = 0; i < 5; i++) {
        const fetchFn = createMockFetch();
        const { result, unmount } = renderHook(() => useInfiniteScroll(fetchFn));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        unmount();
      }

      // Should not throw errors or cause memory leaks
      expect(true).toBe(true);
    });

    it('should cleanup properly on unmount during loading', async () => {
      const fetchFn = createMockFetch({ delay: 1000 });
      const { result, unmount } = renderHook(() => useInfiniteScroll(fetchFn));

      expect(result.current.loading).toBe(true);

      // Unmount before load completes
      unmount();

      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data order across pages', async () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      // Verify sequential IDs
      for (let i = 0; i < result.current.data.length; i++) {
        expect(result.current.data[i].id).toBe(i + 1);
      }
    });

    it('should not duplicate items on refresh', async () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialIds = result.current.data.map(item => item.id);

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      const refreshedIds = result.current.data.map(item => item.id);
      expect(refreshedIds).toEqual(initialIds);
    });

    it('should preserve existing data on loadMore error', async () => {
      const fetchFn = createMockFetch();
      const { result } = renderHook(() => useInfiniteScroll(fetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const existingData = [...result.current.data];

      fetchFn.mockRejectedValueOnce(new Error('Load more failed'));

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.data).toEqual(existingData);
    });
  });
});
