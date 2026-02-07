
import { useState, useCallback, useEffect, useRef } from 'react';

interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
}

export const useInfiniteScroll = <T = unknown>(fetchFn: (page: number) => Promise<PaginatedResult<T>>) => {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const loadingMoreRef = useRef(false);

  const loadData = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);
      else {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      }

      const result = await fetchFn(pageNum);

      if (isRefresh || pageNum === 1) {
        setData(result.data);
      } else {
        setData(prev => [...prev, ...result.data]);
      }

      setHasMore(result.hasMore);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      loadingMoreRef.current = false;
    }
  }, [fetchFn]);

  useEffect(() => {
    loadData(1);
  }, []);

  const loadMore = useCallback(() => {
    if (!loadingMoreRef.current && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadData(nextPage);
    }
  }, [loadingMore, hasMore, page, loadData]);

  const refresh = useCallback(() => {
    setPage(1);
    loadData(1, true);
  }, [loadData]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  return {
    data,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    page,
    loadMore,
    refresh,
    reset,
  };
};
