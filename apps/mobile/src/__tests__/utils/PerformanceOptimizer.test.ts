import PerformanceOptimizer, { useDebounce, useThrottle } from '../../utils/PerformanceOptimizer';
import { InteractionManager } from 'react-native';
import { renderHook, act } from '@testing-library/react-hooks';
import React from 'react';

// Mock React Native modules
jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => {
      callback();
      return { cancel: jest.fn() };
    }),
  },
}));

// Mock logger (since it's used in the code but not imported)
global.logger = {
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
} as any;

describe('PerformanceOptimizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Clear metrics
    (PerformanceOptimizer as any).metrics.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Metrics Tracking', () => {
    it('should track metric start time', () => {
      const metricName = 'test-operation';
      PerformanceOptimizer.startMetric(metricName);

      const metrics = (PerformanceOptimizer as any).metrics;
      expect(metrics.has(metricName)).toBe(true);
      expect(metrics.get(metricName)).toMatchObject({
        name: metricName,
        startTime: expect.any(Number),
      });
    });

    it('should calculate duration when ending metric', () => {
      const metricName = 'test-operation';

      PerformanceOptimizer.startMetric(metricName);

      // Advance time
      jest.advanceTimersByTime(50);

      const duration = PerformanceOptimizer.endMetric(metricName);

      expect(duration).toBe(50);
      expect((PerformanceOptimizer as any).metrics.has(metricName)).toBe(false);
    });

    it('should warn about slow operations', () => {
      const metricName = 'slow-operation';

      PerformanceOptimizer.startMetric(metricName);

      // Advance time past threshold (100ms)
      jest.advanceTimersByTime(150);

      const duration = PerformanceOptimizer.endMetric(metricName);

      expect(duration).toBe(150);
      expect(global.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`🐌 Slow operation: ${metricName} took ${duration}ms`)
      );
    });

    it('should not warn about fast operations', () => {
      const metricName = 'fast-operation';

      PerformanceOptimizer.startMetric(metricName);

      // Advance time below threshold
      jest.advanceTimersByTime(50);

      const duration = PerformanceOptimizer.endMetric(metricName);

      expect(duration).toBe(50);
      expect(global.logger.warn).not.toHaveBeenCalled();
    });

    it('should return null when ending non-existent metric', () => {
      const duration = PerformanceOptimizer.endMetric('non-existent');
      expect(duration).toBeNull();
    });

    it('should handle multiple metrics simultaneously', () => {
      PerformanceOptimizer.startMetric('metric1');
      jest.advanceTimersByTime(20);

      PerformanceOptimizer.startMetric('metric2');
      jest.advanceTimersByTime(30);

      const duration1 = PerformanceOptimizer.endMetric('metric1');
      expect(duration1).toBe(50); // 20 + 30

      jest.advanceTimersByTime(10);

      const duration2 = PerformanceOptimizer.endMetric('metric2');
      expect(duration2).toBe(40); // 30 + 10
    });
  });

  describe('Debounce', () => {
    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = PerformanceOptimizer.debounce(mockFn, 100);

      debouncedFn('call1');
      debouncedFn('call2');
      debouncedFn('call3');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call3');
    });

    it('should reset timer on each call', () => {
      const mockFn = jest.fn();
      const debouncedFn = PerformanceOptimizer.debounce(mockFn, 100);

      debouncedFn('call1');
      jest.advanceTimersByTime(50);

      debouncedFn('call2');
      jest.advanceTimersByTime(50);

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call2');
    });

    it('should handle multiple arguments', () => {
      const mockFn = jest.fn();
      const debouncedFn = PerformanceOptimizer.debounce(mockFn, 100);

      debouncedFn('arg1', 'arg2', 'arg3');

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('should allow separate calls after delay', () => {
      const mockFn = jest.fn();
      const debouncedFn = PerformanceOptimizer.debounce(mockFn, 100);

      debouncedFn('call1');
      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call1');

      debouncedFn('call2');
      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('call2');
    });
  });

  describe('Throttle', () => {
    it('should throttle function calls', () => {
      const mockFn = jest.fn();
      const throttledFn = PerformanceOptimizer.throttle(mockFn, 100);

      throttledFn('call1');
      throttledFn('call2');
      throttledFn('call3');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call1');
    });

    it('should allow calls after throttle period', () => {
      const mockFn = jest.fn();
      const throttledFn = PerformanceOptimizer.throttle(mockFn, 100);

      throttledFn('call1');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call1');

      jest.advanceTimersByTime(100);

      throttledFn('call2');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('call2');
    });

    it('should ignore intermediate calls', () => {
      const mockFn = jest.fn();
      const throttledFn = PerformanceOptimizer.throttle(mockFn, 100);

      throttledFn('call1');

      jest.advanceTimersByTime(30);
      throttledFn('ignored1');

      jest.advanceTimersByTime(30);
      throttledFn('ignored2');

      jest.advanceTimersByTime(30);
      throttledFn('ignored3');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call1');

      jest.advanceTimersByTime(10);

      throttledFn('call2');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('call2');
    });

    it('should handle multiple arguments', () => {
      const mockFn = jest.fn();
      const throttledFn = PerformanceOptimizer.throttle(mockFn, 100);

      throttledFn('arg1', 'arg2', 'arg3');

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });
  });

  describe('Interaction Management', () => {
    it('should run callback after interactions', () => {
      const callback = jest.fn();

      PerformanceOptimizer.runAfterInteractions(callback);

      expect(InteractionManager.runAfterInteractions).toHaveBeenCalledWith(callback);
      expect(callback).toHaveBeenCalled();
    });

    it('should batch operations', () => {
      const operations = [
        jest.fn(),
        jest.fn(),
        jest.fn(),
      ];

      PerformanceOptimizer.batchOperations(operations);

      expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
      operations.forEach(op => {
        expect(op).toHaveBeenCalled();
      });
    });

    it('should handle empty operations batch', () => {
      PerformanceOptimizer.batchOperations([]);
      expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
    });

    it('should maintain operation order in batch', () => {
      const callOrder: number[] = [];
      const operations = [
        () => callOrder.push(1),
        () => callOrder.push(2),
        () => callOrder.push(3),
      ];

      PerformanceOptimizer.batchOperations(operations);

      expect(callOrder).toEqual([1, 2, 3]);
    });
  });
});

describe('useDebounce Hook', () => {
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
        initialProps: { value: 'initial', delay: 100 },
      }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 100 });
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 100 },
      }
    );

    rerender({ value: 'update1', delay: 100 });

    act(() => {
      jest.advanceTimersByTime(50);
    });

    rerender({ value: 'update2', delay: 100 });

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(result.current).toBe('update2');
  });

  it('should handle different delays', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 50 },
      }
    );

    rerender({ value: 'updated', delay: 50 });

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(result.current).toBe('updated');
  });

  it('should handle complex values', () => {
    const complexValue = { foo: 'bar', nested: { value: 42 } };
    const updatedValue = { foo: 'baz', nested: { value: 100 } };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: complexValue, delay: 100 },
      }
    );

    expect(result.current).toEqual(complexValue);

    rerender({ value: updatedValue, delay: 100 });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toEqual(updatedValue);
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 100 },
      }
    );

    unmount();

    // Should not throw or cause issues
    act(() => {
      jest.advanceTimersByTime(100);
    });
  });
});

describe('useThrottle Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should throttle callback execution', () => {
    const callback = jest.fn();

    const { result } = renderHook(
      ({ cb, delay }) => useThrottle(cb, delay),
      {
        initialProps: { cb: callback, delay: 100 },
      }
    );

    act(() => {
      result.current();
      result.current();
      result.current();
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      result.current();
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should handle callback with arguments', () => {
    const callback = jest.fn((a: string, b: number) => `${a}-${b}`);

    const { result } = renderHook(
      ({ cb, delay }) => useThrottle(cb, delay),
      {
        initialProps: { cb: callback, delay: 100 },
      }
    );

    act(() => {
      result.current('test', 42);
    });

    expect(callback).toHaveBeenCalledWith('test', 42);
  });

  it('should recreate throttled function when callback changes', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const { result, rerender } = renderHook(
      ({ cb, delay }) => useThrottle(cb, delay),
      {
        initialProps: { cb: callback1, delay: 100 },
      }
    );

    act(() => {
      result.current();
    });

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    rerender({ cb: callback2, delay: 100 });

    act(() => {
      result.current();
    });

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('should handle delay changes', () => {
    const callback = jest.fn();

    const { result, rerender } = renderHook(
      ({ cb, delay }) => useThrottle(cb, delay),
      {
        initialProps: { cb: callback, delay: 200 },
      }
    );

    act(() => {
      result.current();
    });

    expect(callback).toHaveBeenCalledTimes(1);

    rerender({ cb: callback, delay: 50 });

    act(() => {
      jest.advanceTimersByTime(50);
      result.current();
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });
});

describe('Default Export', () => {
  it('should export PerformanceOptimizer as default', () => {
    expect(PerformanceOptimizer).toBeDefined();
    expect(typeof PerformanceOptimizer.startMetric).toBe('function');
    expect(typeof PerformanceOptimizer.endMetric).toBe('function');
    expect(typeof PerformanceOptimizer.debounce).toBe('function');
    expect(typeof PerformanceOptimizer.throttle).toBe('function');
    expect(typeof PerformanceOptimizer.runAfterInteractions).toBe('function');
    expect(typeof PerformanceOptimizer.batchOperations).toBe('function');
  });
});