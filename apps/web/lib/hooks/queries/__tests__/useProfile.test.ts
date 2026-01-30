import { vi, type Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfile, useUserProfile, useUpdateProfile, useAuth } from '../useProfile';

// Re-set mock return values after clearAllMocks (global mocks from test/setup.ts get cleared)
function resetMocks() {
  vi.clearAllMocks();
  (useQuery as Mock).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isSuccess: true,
    isFetching: false,
    status: 'success',
  });
  (useMutation as Mock).mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    isSuccess: false,
    status: 'idle',
    reset: vi.fn(),
  });
  (useQueryClient as Mock).mockReturnValue({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn().mockReturnValue([]),
    cancelQueries: vi.fn(),
  });
}

describe('useProfile', () => {
  beforeEach(resetMocks);

  it('should call useQuery with correct query key', () => {
    renderHook(() => useProfile());
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['user', 'profile', 'current'],
      })
    );
  });

  it('should return mocked query result', () => {
    const { result } = renderHook(() => useProfile());
    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(true);
  });

  it('should set staleTime to 5 minutes', () => {
    renderHook(() => useProfile());
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        staleTime: 5 * 60 * 1000,
      })
    );
  });
});

describe('useUserProfile', () => {
  beforeEach(resetMocks);

  it('should call useQuery with user-specific key', () => {
    renderHook(() => useUserProfile('user-123'));
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['user', 'profile', 'user-123'],
        enabled: true,
      })
    );
  });

  it('should disable query when userId is null', () => {
    renderHook(() => useUserProfile(null));
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });
});

describe('useUpdateProfile', () => {
  beforeEach(resetMocks);

  it('should call useMutation', () => {
    renderHook(() => useUpdateProfile());
    expect(useMutation).toHaveBeenCalled();
  });

  it('should return mutation result', () => {
    const { result } = renderHook(() => useUpdateProfile());
    expect(result.current).toBeDefined();
    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe('useAuth', () => {
  beforeEach(resetMocks);

  it('should return auth state based on profile data', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.isAuthenticated).toBe('boolean');
  });
});
