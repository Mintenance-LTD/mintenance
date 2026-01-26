import { renderHook } from '@testing-library/react-native';
import { useChunkPerformance } from '../codeSplitting';

describe('codeSplitting', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useChunkPerformance());
    expect(result.current.metrics).toBeDefined();
    expect(Array.isArray(result.current.metrics)).toBe(true);
  });

  it('should handle updates correctly', () => {
    const { result } = renderHook(() => useChunkPerformance());
    expect(result.current.report).toBeDefined();
    expect(typeof result.current.clearCache).toBe('function');
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useChunkPerformance());
    unmount();
  });
});
