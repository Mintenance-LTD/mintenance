import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';

describe('useInfiniteScroll Hook - Comprehensive', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      data: Array(10).fill(null).map((_, i) => ({ id: i, name: `Item ${i}` })),
      hasMore: true,
    });
  });

  it('should load initial data', async () => {
    const { result } = renderHook(() => useInfiniteScroll(mockFetch));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toHaveLength(10);
    expect(mockFetch).toHaveBeenCalledWith(1);
  });

  it('should load more data on scroll', async () => {
    const { result } = renderHook(() => useInfiniteScroll(mockFetch));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.loadingMore).toBe(false);
    });

    expect(result.current.data).toHaveLength(20);
    expect(mockFetch).toHaveBeenCalledWith(2);
  });

  it('should handle end of data', async () => {
    mockFetch.mockResolvedValueOnce({
      data: Array(5).fill(null).map((_, i) => ({ id: i })),
      hasMore: false,
    });

    const { result } = renderHook(() => useInfiniteScroll(mockFetch));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(false);

    await act(async () => {
      result.current.loadMore();
    });

    // Should not fetch more
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useInfiniteScroll(mockFetch));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toEqual([]);
  });

  it('should support pull to refresh', async () => {
    const { result } = renderHook(() => useInfiniteScroll(mockFetch));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.refreshing).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(1);
  });

  it('should prevent duplicate requests', async () => {
    const { result } = renderHook(() => useInfiniteScroll(mockFetch));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.loadMore();
      result.current.loadMore();
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.loadingMore).toBe(false);
    });

    // Should only call once despite multiple loadMore calls
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should reset data', async () => {
    const { result } = renderHook(() => useInfiniteScroll(mockFetch));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toHaveLength(10);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.page).toBe(1);
  });
});
