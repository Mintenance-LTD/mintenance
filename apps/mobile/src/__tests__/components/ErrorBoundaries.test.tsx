// React 18's error-boundary commit path requires the act environment flag to
// be set; without it react-test-renderer aborts the recoverable-error retry
// render and unmounts ("Can't access .root on unmounted test renderer"). The
// node test environment used by this suite doesn't set it automatically.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import React from 'react';
import { render, fireEvent, waitFor, act } from '../test-utils';
import { Text } from 'react-native';
import {
  ErrorBoundary,
  ScreenErrorBoundary,
  QueryErrorBoundary,
  AsyncErrorBoundary,
  useErrorHandler,
} from '../../components/ErrorBoundaryProvider';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock components that throw errors
const ThrowError = ({
  shouldThrow = true,
  message = 'Test error',
}: {
  shouldThrow?: boolean;
  message?: string;
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <Text>No Error</Text>;
};

const TestComponent = () => <Text>Test Component</Text>;

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  createNavigationContainerRef: () => ({
    isReady: jest.fn(() => false),
    navigate: mockNavigate,
  }),
}));

// Mock Sentry. ScreenErrorBoundary / AsyncErrorBoundary import from
// ../../config/sentry, while the base ErrorBoundary reports via a dynamic
// import('@sentry/react-native') — mock both so every reporting path is
// observable.
jest.mock('../../config/sentry', () => ({
  captureException: jest.fn(),
}));
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Error Boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ErrorBoundary', () => {
    it('renders children when no error occurs', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(getByText('Test Component')).toBeTruthy();
    });

    it('renders error UI when error occurs', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('allows retry functionality', () => {
      const { getByText, rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeTruthy();

      // Press "Try Again" to reset the boundary's error state while the
      // children still throw — the boundary clears hasError and attempts to
      // re-render the children.
      const retryButton = getByText('Try Again');
      act(() => fireEvent.press(retryButton));

      // Swap in non-throwing children so the recovered render succeeds.
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // After retry, should show the component without error
      expect(getByText('No Error')).toBeTruthy();
    });

    it('uses custom fallback when provided', () => {
      const customFallback = (error: Error, resetError: () => void) => (
        <Text>Custom Error: {error.message}</Text>
      );

      const { getByText } = render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError message='Custom error message' />
        </ErrorBoundary>
      );

      expect(getByText('Custom Error: Custom error message')).toBeTruthy();
    });

    it('calls onError callback when error occurs', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError message='Callback test error' />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Callback test error',
        }),
        expect.any(Object)
      );
    });
  });

  describe('ScreenErrorBoundary', () => {
    it('renders screen-specific error UI', () => {
      const { getByText } = render(
        <ScreenErrorBoundary screenName='Test Screen'>
          <ThrowError />
        </ScreenErrorBoundary>
      );

      expect(getByText('Screen Error')).toBeTruthy();
      expect(
        getByText('The Test Screen screen encountered an error')
      ).toBeTruthy();
      expect(
        getByText(
          'Something went wrong while loading this screen. Please try again.'
        )
      ).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('shows retry button by default', () => {
      const { getByText } = render(
        <ScreenErrorBoundary screenName='Test Screen'>
          <ThrowError />
        </ScreenErrorBoundary>
      );

      expect(getByText('Retry')).toBeTruthy();
    });

    it('calls retry function when retry button is pressed', () => {
      const { getByText } = render(
        <ScreenErrorBoundary screenName='Test Screen'>
          <ThrowError />
        </ScreenErrorBoundary>
      );

      // Component should show error initially
      expect(getByText('Screen Error')).toBeTruthy();

      // Press retry button
      act(() => fireEvent.press(getByText('Retry')));

      // The retry mechanism would reset the error state
      // This test verifies the button exists and is pressable
      expect(getByText('Retry')).toBeTruthy();
    });

    it('uses custom fallback component when provided', () => {
      const customFallback = (error: Error, retry: () => void) => <></>;

      const { queryByText } = render(
        <ScreenErrorBoundary
          screenName='Test Screen'
          fallbackComponent={customFallback}
        >
          <ThrowError />
        </ScreenErrorBoundary>
      );

      // Should not render default error UI when custom fallback is provided
      expect(queryByText('Screen Error')).toBeNull();
    });
  });

  describe('QueryErrorBoundary', () => {
    it('renders query-specific error UI', () => {
      const { getByText } = render(
        <QueryErrorBoundary queryName='user data'>
          <ThrowError />
        </QueryErrorBoundary>
      );

      expect(getByText('Data Load Error')).toBeTruthy();
      expect(getByText(/Unable to load user data/)).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('calls onRetry when retry button is pressed', () => {
      const onRetry = jest.fn();

      const { getByText } = render(
        <QueryErrorBoundary queryName='test data' onRetry={onRetry}>
          <ThrowError />
        </QueryErrorBoundary>
      );

      act(() => fireEvent.press(getByText('Retry')));
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('AsyncErrorBoundary', () => {
    it('renders async operation error UI', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName='data fetch'>
          <ThrowError />
        </AsyncErrorBoundary>
      );

      expect(getByText('Operation Failed')).toBeTruthy();
      expect(
        getByText(/The data fetch operation encountered an error/)
      ).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('uses custom fallback message when provided', () => {
      const { getByText } = render(
        <AsyncErrorBoundary
          operationName='test operation'
          fallbackMessage='Custom async error message'
        >
          <ThrowError />
        </AsyncErrorBoundary>
      );

      expect(getByText('Custom async error message')).toBeTruthy();
    });

    it('shows retry loading state during async retry', async () => {
      let resolveRetry: (() => void) | undefined;
      const slowRetry = jest.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveRetry = resolve;
          })
      );

      const { getByText } = render(
        <AsyncErrorBoundary operationName='slow operation' onRetry={slowRetry}>
          <ThrowError />
        </AsyncErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      // Press kicks off the async retry. handleRetry sets isRetrying=true
      // synchronously before awaiting onRetry(); flush that commit via act.
      await act(async () => {
        fireEvent.press(retryButton);
      });

      // While the retry promise is still pending, the button reflects the
      // loading state.
      expect(getByText('Retrying...')).toBeTruthy();

      // Resolve the pending retry so the boundary tears down cleanly within
      // this test (avoids a dangling promise leaking into later tests).
      await act(async () => {
        resolveRetry?.();
      });
    });
  });

  describe('useErrorHandler', () => {
    it('provides error handling functions', () => {
      let errorHandler: any;

      const TestUseErrorHandler = () => {
        errorHandler = useErrorHandler();
        return <Text>Test</Text>;
      };

      render(<TestUseErrorHandler />);

      expect(errorHandler).toHaveProperty('handleError');
      expect(errorHandler).toHaveProperty('handleAsyncError');
      expect(typeof errorHandler.handleError).toBe('function');
      expect(typeof errorHandler.handleAsyncError).toBe('function');
    });
  });

  describe('Error Boundary Integration', () => {
    it('captures and reports errors to Sentry', async () => {
      // ErrorBoundary reports via a dynamic import('@sentry/react-native').
      const { captureException } = require('@sentry/react-native');

      render(
        <ErrorBoundary>
          <ThrowError message='Sentry test error' />
        </ErrorBoundary>
      );

      // Wait for the dynamic import + its .then() to resolve.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Sentry test error',
        }),
        expect.any(Object)
      );
    });

    it('logs errors through logger service', () => {
      const { logger } = require('../../utils/logger');

      render(
        <ScreenErrorBoundary screenName='Logger Test'>
          <ThrowError message='Logger test error' />
        </ScreenErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Screen error in Logger Test:',
        expect.any(Error),
        expect.objectContaining({
          errorBoundary: 'ScreenErrorBoundary',
        })
      );
    });
  });
});
