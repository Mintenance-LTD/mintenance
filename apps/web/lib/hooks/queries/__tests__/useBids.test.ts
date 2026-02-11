// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
type Mock = ReturnType<typeof vi.fn>;
import { renderHook } from '@testing-library/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useJobBids, useContractorBids, useSubmitBid, useAcceptBid } from '../useBids';

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
}

describe('useJobBids', () => {
  beforeEach(resetMocks);

  it('should call useQuery with job bids key', () => {
    renderHook(() => useJobBids('job-123'));
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['jobs']),
      })
    );
  });

  it('should disable query when jobId is falsy', () => {
    renderHook(() => useJobBids(''));
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });
});

describe('useContractorBids', () => {
  beforeEach(resetMocks);

  it('should call useQuery', () => {
    renderHook(() => useContractorBids());
    expect(useQuery).toHaveBeenCalled();
  });

  it('should return query result', () => {
    const { result } = renderHook(() => useContractorBids());
    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useSubmitBid', () => {
  beforeEach(resetMocks);

  it('should call useMutation', () => {
    renderHook(() => useSubmitBid());
    expect(useMutation).toHaveBeenCalled();
  });

  it('should return mutation functions', () => {
    const { result } = renderHook(() => useSubmitBid());
    expect(result.current.mutate).toBeDefined();
  });
});

describe('useAcceptBid', () => {
  beforeEach(resetMocks);

  it('should call useMutation', () => {
    renderHook(() => useAcceptBid());
    expect(useMutation).toHaveBeenCalled();
  });
});

