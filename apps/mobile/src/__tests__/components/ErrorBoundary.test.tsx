import React from 'react';
import { render, waitFor } from '../test-utils';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Text } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock logger — ErrorBoundary imports `logger` from '@mintenance/shared'
jest.mock('@mintenance/shared', () => ({
  ...jest.requireActual('@mintenance/shared'),
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const { logger } = require('@mintenance/shared');

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>Success</Text>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText('Success')).toBeTruthy();
  });

  it('should display error UI when error occurs', () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Oops! Something went wrong')).toBeTruthy();
    expect(
      getByText(
        "We're sorry for the inconvenience. The error has been reported to our team."
      )
    ).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();

    consoleSpy.mockRestore();
  });

  it('should log error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(logger.error).toHaveBeenCalledWith(
      'React Error Boundary caught an error',
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('should show debug info in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Error Details (Development Only):')).toBeTruthy();
    expect(getByText('Test error')).toBeTruthy();

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('should not show debug info in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { queryByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(queryByText('Error Details (Development Only):')).toBeFalsy();

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});
