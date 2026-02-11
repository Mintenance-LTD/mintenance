// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
type Mock = ReturnType<typeof vi.fn>;
import { renderHook } from '@testing-library/react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useConversations, useMessages, useSendMessage, useMarkAsRead } from '../useMessages';

function resetMocks() {
  vi.clearAllMocks();
  (useQuery as Mock).mockReturnValue({
    data: [], isLoading: false, isError: false, error: null,
    refetch: vi.fn(), isSuccess: true, isFetching: false, status: 'success',
  });
  (useMutation as Mock).mockReturnValue({
    mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}),
    isLoading: false, isPending: false, isError: false, error: null,
    isSuccess: false, status: 'idle', reset: vi.fn(),
  });
  (useQueryClient as Mock).mockReturnValue({
    invalidateQueries: vi.fn(), setQueryData: vi.fn(),
    getQueryData: vi.fn().mockReturnValue([]), cancelQueries: vi.fn(),
  });
  (useInfiniteQuery as Mock).mockReturnValue({
    data: { pages: [], pageParams: [] }, isLoading: false, isError: false,
    error: null, refetch: vi.fn(), isSuccess: true, isFetching: false,
    status: 'success', fetchNextPage: vi.fn(), hasNextPage: false,
    isFetchingNextPage: false,
  });
}

describe('useConversations', () => {
  beforeEach(resetMocks);

  it('should call useQuery with conversations key', () => {
    renderHook(() => useConversations());
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['messages']),
      })
    );
  });

  it('should return query result', () => {
    const { result } = renderHook(() => useConversations());
    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useMessages', () => {
  beforeEach(resetMocks);

  it('should call useInfiniteQuery with conversation key', () => {
    renderHook(() => useMessages('conv-123'));
    expect(useInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['messages']),
        enabled: true,
      })
    );
  });

  it('should disable query when conversationId is falsy', () => {
    renderHook(() => useMessages(''));
    expect(useInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });
});

describe('useSendMessage', () => {
  beforeEach(resetMocks);

  it('should call useMutation', () => {
    renderHook(() => useSendMessage());
    expect(useMutation).toHaveBeenCalled();
  });

  it('should return mutation result', () => {
    const { result } = renderHook(() => useSendMessage());
    expect(result.current.mutate).toBeDefined();
  });
});

describe('useMarkAsRead', () => {
  beforeEach(resetMocks);

  it('should call useMutation', () => {
    renderHook(() => useMarkAsRead());
    expect(useMutation).toHaveBeenCalled();
  });
});
