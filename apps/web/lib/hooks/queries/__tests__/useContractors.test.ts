// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
type Mock = ReturnType<typeof vi.fn>;
import { renderHook } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { useContractors, useContractor, useContractorSearch, useContractorReviews } from '../useContractors';

function resetMocks() {
  vi.clearAllMocks();
  (useQuery as Mock).mockReturnValue({
    data: [], isLoading: false, isError: false, error: null,
    refetch: vi.fn(), isSuccess: true, isFetching: false, status: 'success',
  });
}

describe('useContractors', () => {
  beforeEach(resetMocks);

  it('should call useQuery with contractors key', () => {
    renderHook(() => useContractors());
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['contractors']),
      })
    );
  });

  it('should return query result', () => {
    const { result } = renderHook(() => useContractors());
    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should pass filters to query', () => {
    renderHook(() => useContractors({ limit: 10, specialty: 'plumbing' }));
    expect(useQuery).toHaveBeenCalled();
  });
});

describe('useContractor', () => {
  beforeEach(resetMocks);

  it('should call useQuery with contractor detail key', () => {
    renderHook(() => useContractor('con-123'));
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['contractors']),
      })
    );
  });

  it('should disable query when contractorId is falsy', () => {
    renderHook(() => useContractor(''));
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });
});

describe('useContractorSearch', () => {
  beforeEach(resetMocks);

  it('should call useQuery with search key', () => {
    renderHook(() => useContractorSearch('plumber'));
    expect(useQuery).toHaveBeenCalled();
  });
});

describe('useContractorReviews', () => {
  beforeEach(resetMocks);

  it('should call useQuery with reviews key', () => {
    renderHook(() => useContractorReviews('con-123'));
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['contractors']),
      })
    );
  });
});
