import { debounce } from '../utils';

describe('debounce', () => {
  it('should debounce function calls', () => {
    jest.useFakeTimers();
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('should handle multiple arguments', () => {
    jest.useFakeTimers();
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 50);

    debouncedFn('arg1', 'arg2');
    jest.advanceTimersByTime(50);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');

    jest.useRealTimers();
  });

  it('should handle error cases', () => {
    // Test error scenarios
  });
});