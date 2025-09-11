import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  ErrorBoundary,
  ScreenErrorBoundary,
  QueryErrorBoundary,
  AsyncErrorBoundary,
  useErrorHandler,
} from '../../components/ErrorBoundaryProvider';

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
}));

// Mock Sentry
jest.mock('../../config/sentry', () => ({
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

      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('allows retry functionality', () => {
      const { getByText, rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(getByText('Something went wrong')).toBeTruthy();

      // Mock successful retry
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

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
        getByText(/Something went wrong with the Test Screen screen/)
      ).toBeTruthy();
      expect(getByText('Retry Screen')).toBeTruthy();
    });

    it('shows home button by default', () => {
      const { getByText } = render(
        <ScreenErrorBoundary screenName='Test Screen'>
          <ThrowError />
        </ScreenErrorBoundary>
      );

      expect(getByText('Go to Home')).toBeTruthy();
    });

    it('hides home button when showHomeButton is false', () => {
      const { queryByText } = render(
        <ScreenErrorBoundary screenName='Test Screen' showHomeButton={false}>
          <ThrowError />
        </ScreenErrorBoundary>
      );

      expect(queryByText('Go to Home')).toBeNull();
    });

    it('navigates to custom fallback route', () => {
      const { getByText } = render(
        <ScreenErrorBoundary
          screenName='Test Screen'
          fallbackRoute='CustomRoute'
        >
          <ThrowError />
        </ScreenErrorBoundary>
      );

      expect(getByText('Go to CustomRoute')).toBeTruthy();

      fireEvent.press(getByText('Go to CustomRoute'));
      expect(mockNavigate).toHaveBeenCalledWith('CustomRoute');
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

      fireEvent.press(getByText('Retry'));
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
      const slowRetry = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );

      const { getByText } = render(
        <AsyncErrorBoundary operationName='slow operation' onRetry={slowRetry}>
          <ThrowError />
        </AsyncErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      expect(getByText('Retrying...')).toBeTruthy();
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
      const { captureException } = require('../../config/sentry');

      render(
        <ErrorBoundary>
          <ThrowError message='Sentry test error' />
        </ErrorBoundary>
      );

      // Wait for dynamic import to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

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
        'Error in Logger Test screen:',
        expect.objectContaining({
          message: 'Logger test error',
        }),
        expect.any(Object)
      );
    });
  });
});
