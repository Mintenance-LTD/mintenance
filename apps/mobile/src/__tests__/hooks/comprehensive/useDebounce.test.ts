import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '../../../hooks/useDebounce';

describe('useDebounce Hook - Comprehensive', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Value shouldn't change immediately
    expect(result.current).toBe('initial');

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now value should be updated
    expect(result.current).toBe('updated');
  });

  it('should cancel pending updates on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    rerender({ value: 'updated', delay: 500 });

    unmount();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Value should not have updated after unmount
    expect(result.current).toBe('initial');
  });

  it('should handle rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: '1', delay: 300 },
      }
    );

    // Rapid updates
    rerender({ value: '2', delay: 300 });
    act(() => jest.advanceTimersByTime(100));

    rerender({ value: '3', delay: 300 });
    act(() => jest.advanceTimersByTime(100));

    rerender({ value: '4', delay: 300 });
    act(() => jest.advanceTimersByTime(100));

    // Still shouldn't update
    expect(result.current).toBe('1');

    // Complete the delay from last update
    act(() => jest.advanceTimersByTime(300));

    // Should have last value
    expect(result.current).toBe('4');
  });

  it('should handle delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 1000 },
      }
    );

    rerender({ value: 'updated', delay: 200 });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe('updated');
  });
});