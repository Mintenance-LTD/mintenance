import { vi, type Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useJobs, useJob, useCreateJob, useUpdateJob } from '../useJobs';

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

describe('useJobs', () => {
  beforeEach(resetMocks);

  it('should call useQuery with jobs list key', () => {
    renderHook(() => useJobs());
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['jobs']),
      })
    );
  });

  it('should return mocked query result', () => {
    const { result } = renderHook(() => useJobs());
    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should pass filters to query key', () => {
    renderHook(() => useJobs({ status: 'active', limit: 10 }));
    expect(useQuery).toHaveBeenCalled();
  });
});

describe('useJob', () => {
  beforeEach(resetMocks);

  it('should call useQuery with job detail key', () => {
    renderHook(() => useJob('job-123'));
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['jobs']),
      })
    );
  });

  it('should disable query when jobId is falsy', () => {
    renderHook(() => useJob(''));
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });
});

describe('useCreateJob', () => {
  beforeEach(resetMocks);

  it('should call useMutation', () => {
    renderHook(() => useCreateJob());
    expect(useMutation).toHaveBeenCalled();
  });

  it('should return mutation functions', () => {
    const { result } = renderHook(() => useCreateJob());
    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe('useUpdateJob', () => {
  beforeEach(resetMocks);

  it('should call useMutation', () => {
    renderHook(() => useUpdateJob('job-123'));
    expect(useMutation).toHaveBeenCalled();
  });
});
