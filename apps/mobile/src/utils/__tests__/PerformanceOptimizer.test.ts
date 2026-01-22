import PerformanceOptimizer from '../PerformanceOptimizer';

describe('PerformanceOptimizer', () => {
  it('should initialize with default values', () => {
    expect(PerformanceOptimizer).toBeDefined();
    expect(typeof PerformanceOptimizer.debounce).toBe('function');
    expect(typeof PerformanceOptimizer.throttle).toBe('function');
  });

  it('should handle updates correctly', () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const debounced = PerformanceOptimizer.debounce(fn, 50);
    debounced('first');
    debounced('second');
    jest.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('should clean up on unmount', () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const throttled = PerformanceOptimizer.throttle(fn, 50);
    throttled('first');
    throttled('second');
    jest.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
