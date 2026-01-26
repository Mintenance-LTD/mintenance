import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useDebounce } from '../useDebounce';

/**
 * Tests for useDebounce Hook - Value Debouncing
 *
 * Critical functionality for search inputs, form validation, and API call optimization.
 * Tests cover timing behavior, cleanup, type safety, and edge cases.
 */

describe('useDebounce Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initial Value Behavior', () => {
    it('should return initial value immediately on mount', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('should return initial number value immediately', () => {
      const { result } = renderHook(() => useDebounce(42, 500));

      expect(result.current).toBe(42);
    });

    it('should return initial object value immediately', () => {
      const initialObj = { name: 'test', count: 5 };
      const { result } = renderHook(() => useDebounce(initialObj, 500));

      expect(result.current).toEqual(initialObj);
      expect(result.current).toBe(initialObj);
    });

    it('should return initial array value immediately', () => {
      const initialArray = [1, 2, 3];
      const { result } = renderHook(() => useDebounce(initialArray, 500));

      expect(result.current).toEqual(initialArray);
      expect(result.current).toBe(initialArray);
    });

    it('should handle null as initial value', () => {
      const { result } = renderHook(() => useDebounce<string | null>(null, 500));

      expect(result.current).toBeNull();
    });

    it('should handle undefined as initial value', () => {
      const { result } = renderHook(() => useDebounce<string | undefined>(undefined, 500));

      expect(result.current).toBeUndefined();
    });
  });

  describe('Basic Debounce Behavior', () => {
    it('should not update value immediately when changed', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current).toBe('initial');

      // Change the value
      rerender({ value: 'updated' });

      // Value should still be the initial value (not debounced yet)
      expect(result.current).toBe('initial');
    });

    it('should update value after delay has passed', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current).toBe('initial');

      // Change the value
      rerender({ value: 'updated' });

      // Fast-forward time by 500ms
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Now value should be updated
      expect(result.current).toBe('updated');
    });

    it('should respect custom delay duration', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 1000),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      // After 500ms, should still be initial
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current).toBe('initial');

      // After another 500ms (1000ms total), should be updated
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current).toBe('updated');
    });

    it('should handle zero delay', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 0),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current).toBe('updated');
    });
  });

  describe('Multiple Rapid Changes', () => {
    it('should only apply the last value after multiple rapid changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current).toBe('initial');

      // Rapid changes
      rerender({ value: 'change1' });
      act(() => { jest.advanceTimersByTime(100); });

      rerender({ value: 'change2' });
      act(() => { jest.advanceTimersByTime(100); });

      rerender({ value: 'change3' });
      act(() => { jest.advanceTimersByTime(100); });

      rerender({ value: 'final' });
      act(() => { jest.advanceTimersByTime(100); });

      // Still should be initial (only 400ms passed)
      expect(result.current).toBe('initial');

      // After final delay completes
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should skip intermediate values and go straight to final
      expect(result.current).toBe('final');
    });

    it('should debounce search input simulation', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: '' } }
      );

      // User types "search" quickly
      const searchTerm = 'search';
      for (let i = 0; i < searchTerm.length; i++) {
        rerender({ value: searchTerm.substring(0, i + 1) });
        act(() => { jest.advanceTimersByTime(50); });
      }

      // Before 300ms, should still be empty
      expect(result.current).toBe('');

      // Complete the debounce period
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Now should have full search term
      expect(result.current).toBe('search');
    });

    it('should reset timer on each change', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'change1' });
      act(() => { jest.advanceTimersByTime(400); });

      // Change again before timer completes - this should reset the timer
      rerender({ value: 'change2' });
      act(() => { jest.advanceTimersByTime(400); });

      // Still initial because we keep resetting
      expect(result.current).toBe('initial');

      // Now wait full 500ms without interruption
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('change2');
    });
  });

  describe('Delay Parameter Changes', () => {
    it('should handle delay parameter change', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      rerender({ value: 'updated', delay: 500 });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');

      // Change delay
      rerender({ value: 'newer', delay: 1000 });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should still be 'updated' because new delay is 1000ms
      expect(result.current).toBe('updated');

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Now should be 'newer'
      expect(result.current).toBe('newer');
    });

    it('should restart debounce when delay changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      rerender({ value: 'updated', delay: 500 });
      act(() => { jest.advanceTimersByTime(300); });

      // Change delay mid-debounce
      rerender({ value: 'updated', delay: 1000 });

      // Advance by original remaining time (200ms)
      act(() => { jest.advanceTimersByTime(200); });

      // Should still be initial because delay changed
      expect(result.current).toBe('initial');

      // Complete new delay
      act(() => {
        jest.advanceTimersByTime(800);
      });

      expect(result.current).toBe('updated');
    });
  });

  describe('TypeScript Generic Type Support', () => {
    it('should work with string type', () => {
      const { result } = renderHook(() => useDebounce<string>('test', 500));

      expect(typeof result.current).toBe('string');
      expect(result.current).toBe('test');
    });

    it('should work with number type', () => {
      const { result } = renderHook(() => useDebounce<number>(123, 500));

      expect(typeof result.current).toBe('number');
      expect(result.current).toBe(123);
    });

    it('should work with boolean type', () => {
      const { result } = renderHook(() => useDebounce<boolean>(true, 500));

      expect(typeof result.current).toBe('boolean');
      expect(result.current).toBe(true);
    });

    it('should work with object type', () => {
      interface TestObject {
        id: number;
        name: string;
      }

      const testObj: TestObject = { id: 1, name: 'test' };
      const { result } = renderHook(() => useDebounce<TestObject>(testObj, 500));

      expect(result.current).toEqual(testObj);
      expect(result.current.id).toBe(1);
      expect(result.current.name).toBe('test');
    });

    it('should work with array type', () => {
      const testArray = [1, 2, 3, 4, 5];
      const { result } = renderHook(() => useDebounce<number[]>(testArray, 500));

      expect(Array.isArray(result.current)).toBe(true);
      expect(result.current).toEqual(testArray);
    });

    it('should work with union types', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce<string | number>(value, 500),
        { initialProps: { value: 'text' as string | number } }
      );

      expect(result.current).toBe('text');

      rerender({ value: 42 });
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe(42);
    });

    it('should work with nullable types', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce<string | null>(value, 500),
        { initialProps: { value: 'text' as string | null } }
      );

      expect(result.current).toBe('text');

      rerender({ value: null });
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBeNull();
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup timer on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { rerender, unmount } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      // Unmount before timer completes
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('should not update state after unmount', () => {
      const { result, rerender, unmount } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      const beforeUnmount = result.current;

      unmount();

      // Try to advance timers after unmount
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should not throw error or cause memory leak
      expect(beforeUnmount).toBe('initial');
    });

    it('should clear previous timeout when value changes', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'change1' });
      const callCountAfterFirst = clearTimeoutSpy.mock.calls.length;

      rerender({ value: 'change2' });
      const callCountAfterSecond = clearTimeoutSpy.mock.calls.length;

      // Should have called clearTimeout more times
      expect(callCountAfterSecond).toBeGreaterThan(callCountAfterFirst);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Edge Cases and Special Scenarios', () => {
    it('should handle same value updates', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'same' } }
      );

      expect(result.current).toBe('same');

      // Update to same value
      rerender({ value: 'same' });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should still be 'same' (works correctly)
      expect(result.current).toBe('same');
    });

    it('should handle empty string', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'text' } }
      );

      rerender({ value: '' });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('');
    });

    it('should handle very large delay values', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 10000),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      act(() => {
        jest.advanceTimersByTime(9999);
      });

      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(result.current).toBe('updated');
    });

    it('should handle complex nested objects', () => {
      const complexObj = {
        user: {
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'New York',
          },
        },
        settings: {
          theme: 'dark',
          notifications: true,
        },
      };

      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: complexObj } }
      );

      const updatedObj = {
        ...complexObj,
        user: {
          ...complexObj.user,
          name: 'Jane',
        },
      };

      rerender({ value: updatedObj });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.user.name).toBe('Jane');
      expect(result.current.settings.theme).toBe('dark');
    });

    it('should handle rapid mount/unmount cycles', () => {
      for (let i = 0; i < 5; i++) {
        const { rerender, unmount } = renderHook(
          ({ value }) => useDebounce(value, 500),
          { initialProps: { value: `test${i}` } }
        );

        rerender({ value: `updated${i}` });
        unmount();
      }

      // Should not throw errors or cause memory leaks
      expect(true).toBe(true);
    });
  });

  describe('Real-World Use Cases', () => {
    it('should debounce search input for API calls', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: '' } }
      );

      // User types quickly
      rerender({ value: 's' });
      act(() => { jest.advanceTimersByTime(50); });

      rerender({ value: 'se' });
      act(() => { jest.advanceTimersByTime(50); });

      rerender({ value: 'sea' });
      act(() => { jest.advanceTimersByTime(50); });

      rerender({ value: 'sear' });
      act(() => { jest.advanceTimersByTime(50); });

      rerender({ value: 'searc' });
      act(() => { jest.advanceTimersByTime(50); });

      rerender({ value: 'search' });

      // Value hasn't updated yet
      expect(result.current).toBe('');

      // Wait for debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Now it updates - API call would happen once
      expect(result.current).toBe('search');
    });

    it('should debounce window resize handler', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 250),
        { initialProps: { value: { width: 1024, height: 768 } } }
      );

      // Simulate multiple resize events
      for (let i = 0; i < 10; i++) {
        rerender({ value: { width: 1024 + i * 10, height: 768 + i * 5 } });
        act(() => { jest.advanceTimersByTime(20); });
      }

      // Initial value should still be there
      expect(result.current).toEqual({ width: 1024, height: 768 });

      // Wait for debounce
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // Should have final resize value
      expect(result.current).toEqual({ width: 1114, height: 813 });
    });

    it('should debounce form validation', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: '' } }
      );

      // User types email address
      const email = 'user@example.com';
      for (let i = 1; i <= email.length; i++) {
        rerender({ value: email.substring(0, i) });
        act(() => { jest.advanceTimersByTime(30); });
      }

      // Validation hasn't run yet
      expect(result.current).toBe('');

      // Wait for debounce - validation would run once
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('user@example.com');
    });

    it('should debounce auto-save functionality', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 2000),
        { initialProps: { value: { title: '', content: '' } } }
      );

      // User types content
      rerender({ value: { title: 'My Document', content: 'Initial content' } });
      act(() => { jest.advanceTimersByTime(500); });

      rerender({ value: { title: 'My Document', content: 'Initial content with more text' } });
      act(() => { jest.advanceTimersByTime(500); });

      // No auto-save yet
      expect(result.current).toEqual({ title: '', content: '' });

      // User stops typing, wait for auto-save delay
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Auto-save would trigger with final content
      expect(result.current).toEqual({
        title: 'My Document',
        content: 'Initial content with more text',
      });
    });
  });

  describe('Performance Characteristics', () => {
    it('should not create memory leaks with many updates', () => {
      const { rerender } = renderHook(
        ({ value }) => useDebounce(value, 100),
        { initialProps: { value: 0 } }
      );

      // Simulate 100 rapid updates
      for (let i = 1; i <= 100; i++) {
        rerender({ value: i });
        act(() => { jest.advanceTimersByTime(10); });
      }

      // Complete final debounce
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should not crash or leak memory
      expect(true).toBe(true);
    });

    it('should handle concurrent hook instances', () => {
      const hook1 = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 'hook1' },
      });

      const hook2 = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'hook2' },
      });

      hook1.rerender({ value: 'hook1-updated' });
      hook2.rerender({ value: 'hook2-updated' });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(hook1.result.current).toBe('hook1-updated');
      expect(hook2.result.current).toBe('hook2'); // Not debounced yet

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(hook2.result.current).toBe('hook2-updated');

      hook1.unmount();
      hook2.unmount();
    });
  });
});
