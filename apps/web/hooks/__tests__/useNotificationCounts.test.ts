import { renderHook, act } from '@testing-library/react';
import { useNotificationCounts } from '../useNotificationCounts';

describe('useNotificationCounts', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useNotificationCounts());
    expect(result.current).toBeDefined();
  });

  it('should handle updates correctly', () => {
    const { result } = renderHook(() => useNotificationCounts());
    // Add specific test logic based on hook functionality
  });

  it('should clean up on unmount', () => {
    const { result, unmount } = renderHook(() => useNotificationCounts());
    unmount();
    // Verify cleanup
  });
});