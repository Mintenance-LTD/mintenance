import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import ToastManager, { toastManager, useToast } from '../ToastManager';

// Mock dependencies
jest.mock('../../../../design-system/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        success: { 50: '#e6f4ea', 200: '#a8e0c2', 600: '#2f9e44', 800: '#1b5e20' },
        error: { 50: '#ffebee', 200: '#ef9a9a', 600: '#e53935', 800: '#b71c1c' },
        warning: { 50: '#fff8e1', 200: '#ffe082', 600: '#ffb300', 800: '#ff8f00' },
        info: { 50: '#e3f2fd', 200: '#90caf9', 600: '#1e88e5', 800: '#0d47a1' },
        surface: { primary: '#ffffff', secondary: '#f5f5f5' },
        border: { primary: '#e0e0e0' },
        primary: { 500: '#007aff', 600: '#007aff' },
        text: { primary: '#111111', secondary: '#666666', inverse: '#ffffff' },
      },
    },
  }),
}));

jest.mock('../../../../design-system/tokens', () => ({
  designTokens: {
    spacing: {
      0.5: 2,
      1: 4,
      1.5: 6,
      2: 8,
      3: 12,
      4: 16,
    },
    borderRadius: {
      md: 8,
      lg: 12,
    },
    shadows: {
      md: { shadowOpacity: 0.1 },
    },
    typography: {
      fontWeight: {
        medium: '500',
        semibold: '600',
      },
    },
    zIndex: {
      toast: 100,
    },
  },
}));

jest.mock('../../../../utils/haptics', () => ({
  useHaptics: () => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    light: jest.fn(),
    medium: jest.fn(),
  }),
}));

describe('ToastManager Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear all toasts before each test
    toastManager.dismissAll();
  });

  afterEach(() => {
    toastManager.dismissAll();
  });

  describe('Initial Rendering', () => {
    it('should render null when no toasts are shown', () => {
      const { toJSON } = render(<ToastManager />);
      expect(toJSON()).toBeNull();
    });

    it('should render toasts when they are added', () => {
      const { getByText } = render(<ToastManager />);

      act(() => {
        toastManager.show({ type: 'success', title: 'Test Toast' });
      });

      expect(getByText('Test Toast')).toBeTruthy();
    });

    it('should render multiple toasts', () => {
      const { getByText } = render(<ToastManager />);

      act(() => {
        toastManager.show({ type: 'success', title: 'Toast 1' });
        toastManager.show({ type: 'error', title: 'Toast 2' });
        toastManager.show({ type: 'warning', title: 'Toast 3' });
      });

      expect(getByText('Toast 1')).toBeTruthy();
      expect(getByText('Toast 2')).toBeTruthy();
      expect(getByText('Toast 3')).toBeTruthy();
    });
  });

  describe('Toast Service - Show Method', () => {
    it('should show a basic toast', () => {
      const { getByText } = render(<ToastManager />);

      act(() => {
        toastManager.show({
          type: 'info',
          title: 'Information',
          message: 'This is an info message',
        });
      });

      expect(getByText('Information')).toBeTruthy();
      expect(getByText('This is an info message')).toBeTruthy();
    });

    it('should return toast ID when shown', () => {
      render(<ToastManager />);

      let toastId: string = '';
      act(() => {
        toastId = toastManager.show({
          type: 'success',
          title: 'Success',
        });
      });

      expect(toastId).toBeTruthy();
      expect(typeof toastId).toBe('string');
    });

    it('should use custom ID if provided', () => {
      const { getByText } = render(<ToastManager />);

      let toastId: string = '';
      act(() => {
        toastId = toastManager.show({
          id: 'custom-toast-id',
          type: 'success',
          title: 'Custom ID Toast',
        });
      });

      expect(toastId).toBe('custom-toast-id');
      expect(getByText('Custom ID Toast')).toBeTruthy();
    });

    it('should replace toast with same ID', () => {
      const { getByText, queryByText } = render(<ToastManager />);

      act(() => {
        toastManager.show({
          id: 'same-id',
          type: 'info',
          title: 'First Toast',
        });
      });

      expect(getByText('First Toast')).toBeTruthy();

      act(() => {
        toastManager.show({
          id: 'same-id',
          type: 'success',
          title: 'Updated Toast',
        });
      });

      expect(queryByText('First Toast')).toBeNull();
      expect(getByText('Updated Toast')).toBeTruthy();
    });
  });

  describe('Convenience Methods', () => {
    it('should show success toast using convenience method', () => {
      const { getByText } = render(<ToastManager />);

      act(() => {
        toastManager.success('Success Title', 'Success message');
      });

      expect(getByText('Success Title')).toBeTruthy();
      expect(getByText('Success message')).toBeTruthy();
    });

    it('should show error toast using convenience method', () => {
      const { getByText } = render(<ToastManager />);

      act(() => {
        toastManager.error('Error Title', 'Error message');
      });

      expect(getByText('Error Title')).toBeTruthy();
      expect(getByText('Error message')).toBeTruthy();
    });

    it('should show warning toast using convenience method', () => {
      const { getByText } = render(<ToastManager />);

      act(() => {
        toastManager.warning('Warning Title', 'Warning message');
      });

      expect(getByText('Warning Title')).toBeTruthy();
      expect(getByText('Warning message')).toBeTruthy();
    });

    it('should show info toast using convenience method', () => {
      const { getByText } = render(<ToastManager />);

      act(() => {
        toastManager.info('Info Title', 'Info message');
      });

      expect(getByText('Info Title')).toBeTruthy();
      expect(getByText('Info message')).toBeTruthy();
    });

    it('should show loading toast with no auto-dismiss', () => {
      const { getByText } = render(<ToastManager />);

      act(() => {
        toastManager.loading('Loading...', 'Please wait');
      });

      expect(getByText('Loading...')).toBeTruthy();
      expect(getByText('Please wait')).toBeTruthy();
    });

    it('should allow additional options in convenience methods', () => {
      const { getByText } = render(<ToastManager />);

      act(() => {
        toastManager.success('Success', 'Message', {
          position: 'bottom',
          duration: 2000,
        });
      });

      expect(getByText('Success')).toBeTruthy();
    });
  });

  describe('Dismiss Methods', () => {
    it('should dismiss specific toast by ID', async () => {
      const { getByText, queryByText } = render(<ToastManager />);

      let toastId: string = '';
      act(() => {
        toastId = toastManager.show({
          type: 'info',
          title: 'Dismissible Toast',
        });
      });

      expect(getByText('Dismissible Toast')).toBeTruthy();

      act(() => {
        toastManager.dismiss(toastId);
      });

      await waitFor(() => {
        expect(queryByText('Dismissible Toast')).toBeNull();
      });
    });

    it('should dismiss all toasts', async () => {
      const { getByText, queryByText } = render(<ToastManager />);

      act(() => {
        toastManager.show({ type: 'success', title: 'Toast 1' });
        toastManager.show({ type: 'error', title: 'Toast 2' });
        toastManager.show({ type: 'warning', title: 'Toast 3' });
      });

      expect(getByText('Toast 1')).toBeTruthy();
      expect(getByText('Toast 2')).toBeTruthy();
      expect(getByText('Toast 3')).toBeTruthy();

      act(() => {
        toastManager.dismissAll();
      });

      await waitFor(() => {
        expect(queryByText('Toast 1')).toBeNull();
        expect(queryByText('Toast 2')).toBeNull();
        expect(queryByText('Toast 3')).toBeNull();
      });
    });

    it('should dismiss toasts by type', async () => {
      const { getByText, queryByText } = render(<ToastManager />);

      act(() => {
        toastManager.success('Success Toast');
        toastManager.error('Error Toast');
        toastManager.warning('Warning Toast');
      });

      act(() => {
        toastManager.dismissByType('error');
      });

      await waitFor(() => {
        expect(getByText('Success Toast')).toBeTruthy();
        expect(queryByText('Error Toast')).toBeNull();
        expect(getByText('Warning Toast')).toBeTruthy();
      });
    });

    it('should handle dismissing non-existent toast', () => {
      render(<ToastManager />);

      expect(() => {
        act(() => {
          toastManager.dismiss('non-existent-id');
        });
      }).not.toThrow();
    });
  });

  describe('Update Method', () => {
    it('should update existing toast', async () => {
      const { getByText, queryByText } = render(<ToastManager />);

      let toastId: string = '';
      act(() => {
        toastId = toastManager.show({
          type: 'loading',
          title: 'Loading...',
        });
      });

      expect(getByText('Loading...')).toBeTruthy();

      act(() => {
        toastManager.update(toastId, {
          type: 'success',
          title: 'Completed!',
          message: 'Operation successful',
        });
      });

      await waitFor(() => {
        expect(queryByText('Loading...')).toBeNull();
        expect(getByText('Completed!')).toBeTruthy();
        expect(getByText('Operation successful')).toBeTruthy();
      });
    });

    it('should not crash when updating non-existent toast', () => {
      render(<ToastManager />);

      expect(() => {
        act(() => {
          toastManager.update('non-existent', { title: 'Updated' });
        });
      }).not.toThrow();
    });
  });

  describe('Promise Method', () => {
    it('should show loading and success toast for resolved promise', async () => {
      const { getByText, queryByText } = render(<ToastManager />);

      const promise = Promise.resolve('Success data');

      act(() => {
        toastManager.promise(promise, {
          loading: 'Loading operation...',
          success: 'Operation completed!',
          error: 'Operation failed!',
        });
      });

      expect(getByText('Loading operation...')).toBeTruthy();

      await waitFor(() => {
        expect(queryByText('Loading operation...')).toBeNull();
        expect(getByText('Operation completed!')).toBeTruthy();
      });
    });

    it('should show loading and error toast for rejected promise', async () => {
      const { getByText, queryByText } = render(<ToastManager />);

      const promise = Promise.reject(new Error('Test error'));

      act(() => {
        toastManager.promise(promise, {
          loading: 'Processing...',
          success: 'Success!',
          error: 'Failed!',
        }).catch(() => {});
      });

      expect(getByText('Processing...')).toBeTruthy();

      await waitFor(() => {
        expect(queryByText('Processing...')).toBeNull();
        expect(getByText('Failed!')).toBeTruthy();
      });
    });

    it('should support function-based success message', async () => {
      const { getByText } = render(<ToastManager />);

      const promise = Promise.resolve({ user: 'John' });

      act(() => {
        toastManager.promise(promise, {
          loading: 'Loading...',
          success: (data) => `Welcome, ${data.user}!`,
        });
      });

      await waitFor(() => {
        expect(getByText('Welcome, John!')).toBeTruthy();
      });
    });

    it('should support function-based error message', async () => {
      const { getByText } = render(<ToastManager />);

      const promise = Promise.reject(new Error('Network error'));

      act(() => {
        toastManager.promise(promise, {
          loading: 'Connecting...',
          error: (error: any) => `Error: ${error.message}`,
        }).catch(() => {});
      });

      await waitFor(() => {
        expect(getByText('Error: Network error')).toBeTruthy();
      });
    });

    it('should not show loading toast if loading message is undefined', async () => {
      const { queryByText, getByText } = render(<ToastManager />);

      const promise = Promise.resolve('data');

      act(() => {
        toastManager.promise(promise, {
          success: 'Done!',
        });
      });

      await waitFor(() => {
        expect(getByText('Done!')).toBeTruthy();
      });
    });
  });

  describe('Get Toasts', () => {
    it('should return all current toasts', () => {
      render(<ToastManager />);

      act(() => {
        toastManager.success('Toast 1');
        toastManager.error('Toast 2');
      });

      const toasts = toastManager.getToasts();

      expect(toasts).toHaveLength(2);
      expect(toasts[0].title).toBe('Toast 1');
      expect(toasts[1].title).toBe('Toast 2');
    });

    it('should return empty array when no toasts', () => {
      render(<ToastManager />);

      const toasts = toastManager.getToasts();

      expect(toasts).toEqual([]);
    });

    it('should return a copy of toasts array', () => {
      render(<ToastManager />);

      act(() => {
        toastManager.success('Toast');
      });

      const toasts1 = toastManager.getToasts();
      const toasts2 = toastManager.getToasts();

      expect(toasts1).not.toBe(toasts2);
      expect(toasts1).toEqual(toasts2);
    });
  });

  describe('Position Grouping', () => {
    it('should group toasts by position', () => {
      const { getByText } = render(<ToastManager />);

      act(() => {
        toastManager.show({ type: 'success', title: 'Top Toast', position: 'top' });
        toastManager.show({ type: 'error', title: 'Bottom Toast', position: 'bottom' });
        toastManager.show({ type: 'info', title: 'Center Toast', position: 'center' });
      });

      expect(getByText('Top Toast')).toBeTruthy();
      expect(getByText('Bottom Toast')).toBeTruthy();
      expect(getByText('Center Toast')).toBeTruthy();
    });

    it('should default to top position if not specified', () => {
      const { getByText } = render(<ToastManager />);

      act(() => {
        toastManager.show({ type: 'info', title: 'Default Position' });
      });

      expect(getByText('Default Position')).toBeTruthy();
    });
  });

  describe('useToast Hook', () => {
    it('should provide all toast methods', () => {
      const TestComponent = () => {
        const toast = useToast();

        React.useEffect(() => {
          toast.success('Hook Success');
        }, []);

        return null;
      };

      const { getByText } = render(
        <>
          <ToastManager />
          <TestComponent />
        </>
      );

      expect(getByText('Hook Success')).toBeTruthy();
    });

    it('should support show method', () => {
      const TestComponent = () => {
        const toast = useToast();

        React.useEffect(() => {
          toast.show({ type: 'info', title: 'Custom Show' });
        }, []);

        return null;
      };

      const { getByText } = render(
        <>
          <ToastManager />
          <TestComponent />
        </>
      );

      expect(getByText('Custom Show')).toBeTruthy();
    });

    it('should support dismiss method', async () => {
      const TestComponent = () => {
        const toast = useToast();
        const [toastId, setToastId] = React.useState<string>('');

        React.useEffect(() => {
          const id = toast.success('Temporary');
          setToastId(id);

          setTimeout(() => {
            toast.dismiss(id);
          }, 100);
        }, []);

        return null;
      };

      const { queryByText } = render(
        <>
          <ToastManager />
          <TestComponent />
        </>
      );

      await waitFor(() => {
        expect(queryByText('Temporary')).toBeNull();
      }, { timeout: 500 });
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe and unsubscribe correctly', () => {
      const listener = jest.fn();

      const unsubscribe = toastManager.subscribe(listener);

      act(() => {
        toastManager.success('Test');
      });

      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Test' }),
        ])
      );

      listener.mockClear();
      unsubscribe();

      act(() => {
        toastManager.success('After Unsubscribe');
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify all listeners on toast changes', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      toastManager.subscribe(listener1);
      toastManager.subscribe(listener2);

      act(() => {
        toastManager.info('Update');
      });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe on unmount', () => {
      const { unmount } = render(<ToastManager />);

      act(() => {
        toastManager.success('Test');
      });

      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple mounts and unmounts', () => {
      const { unmount: unmount1 } = render(<ToastManager />);
      const { unmount: unmount2 } = render(<ToastManager />);

      act(() => {
        toastManager.success('Multi Mount');
      });

      expect(() => {
        unmount1();
        unmount2();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid toast additions', () => {
      const { getByText } = render(<ToastManager />);

      act(() => {
        for (let i = 0; i < 10; i++) {
          toastManager.success(`Toast ${i}`);
        }
      });

      expect(getByText('Toast 0')).toBeTruthy();
      expect(getByText('Toast 9')).toBeTruthy();
    });

    it('should handle dismiss during render', () => {
      const { queryByText } = render(<ToastManager />);

      let toastId: string = '';

      expect(() => {
        act(() => {
          toastId = toastManager.success('Quick Dismiss');
          toastManager.dismiss(toastId);
        });
      }).not.toThrow();
    });

    it('should maintain toast order', () => {
      render(<ToastManager />);

      act(() => {
        toastManager.success('First');
        toastManager.error('Second');
        toastManager.warning('Third');
      });

      const toasts = toastManager.getToasts();

      expect(toasts[0].title).toBe('First');
      expect(toasts[1].title).toBe('Second');
      expect(toasts[2].title).toBe('Third');
    });
  });
});
