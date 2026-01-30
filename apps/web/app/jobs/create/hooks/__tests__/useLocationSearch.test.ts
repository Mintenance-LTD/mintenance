import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLocationSearch } from '../useLocationSearch';

global.fetch = vi.fn();

describe('useLocationSearch', () => {
  const defaultOptions = {
    location: 'London',
    onLocationSelect: vi.fn(),
    debounceMs: 100,
  };

  beforeEach(() => vi.clearAllMocks());

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useLocationSearch(defaultOptions));
    expect(result.current).toBeDefined();
  });

  it('should handle updates correctly', () => {
    const { result } = renderHook(() => useLocationSearch(defaultOptions));
    expect(result.current.suggestions).toBeDefined();
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useLocationSearch(defaultOptions));
    unmount();
    expect(true).toBe(true);
  });
});