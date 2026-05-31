import React from 'react';
import { render, fireEvent, waitFor, act } from '../test-utils';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const ThrowingComponent = ({
  shouldThrow = true,
}: {
  shouldThrow?: boolean;
}) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText('No error')).toBeTruthy();
  });

  it('renders error UI when an error occurs', () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Oops! Something went wrong')).toBeTruthy();
    expect(
      getByText(
        "We're sorry for the inconvenience. The error has been reported to our team."
      )
    ).toBeTruthy();

    consoleSpy.mockRestore();
  });

  it('renders the recovery action when an error occurs', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // The default fallback exposes a single "Try Again" recovery action.
    expect(getByText('Try Again')).toBeTruthy();

    consoleSpy.mockRestore();
  });

  it('shows error details in development mode', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Error Details (Development Only):')).toBeTruthy();
    expect(getByText('Test error')).toBeTruthy();

    process.env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });

  it('hides error details in production mode', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const { queryByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(queryByText('Error Details (Development Only):')).toBeFalsy();

    process.env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });

  it('calls custom error handler when provided', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );

    consoleSpy.mockRestore();
  });

  it('uses custom fallback when provided', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const customFallback = (error: Error, resetError: () => void) => {
      const React = require('react');
      const { Text, TouchableOpacity } = require('react-native');
      return React.createElement(
        React.Fragment,
        {},
        React.createElement(Text, {}, 'Custom error message'),
        React.createElement(
          TouchableOpacity,
          { onPress: resetError },
          React.createElement(Text, {}, 'Reset')
        )
      );
    };

    const { getByText } = render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Custom error message')).toBeTruthy();
    expect(getByText('Reset')).toBeTruthy();

    consoleSpy.mockRestore();
  });

  it('resets error state when Try Again is pressed', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      return (
        <ErrorBoundary>
          <TouchableOpacity onPress={() => setShouldThrow(false)}>
            <Text>Fix Error</Text>
          </TouchableOpacity>
          <ThrowingComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };

    const { getByText } = render(<TestComponent />);

    // Error should be shown
    expect(getByText('Oops! Something went wrong')).toBeTruthy();

    // Click Try Again
    act(() => fireEvent.press(getByText('Try Again')));

    // Error should still be shown because component still throws
    expect(getByText('Oops! Something went wrong')).toBeTruthy();

    consoleSpy.mockRestore();
  });

  it('reports the error to the monitoring service when caught', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const Sentry = require('@sentry/react-native');

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // reportErrorToService dynamically imports Sentry and captures the error.
    await waitFor(() => {
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          level: 'error',
          tags: expect.objectContaining({ errorBoundary: 'true' }),
        })
      );
    });

    consoleSpy.mockRestore();
  });

  it('renders the default fallback UI with a recovery action', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should still render error UI
    expect(getByText('Oops! Something went wrong')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();

    consoleSpy.mockRestore();
  });
});
