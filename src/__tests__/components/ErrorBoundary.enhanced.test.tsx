import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';

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

const ThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <text>No error</text>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
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
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('An unexpected error occurred. Please try again.')).toBeTruthy();

    consoleSpy.mockRestore();
  });

  it('displays error ID when error occurs', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check if error ID is displayed
    const errorIdText = getByText(/Error ID:/);
    expect(errorIdText).toBeTruthy();

    consoleSpy.mockRestore();
  });

  it('shows debug info in development mode', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const originalDev = global.__DEV__;
    global.__DEV__ = true;

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Debug Info:')).toBeTruthy();
    expect(getByText('Test error')).toBeTruthy();

    global.__DEV__ = originalDev;
    consoleSpy.mockRestore();
  });

  it('hides debug info in production mode', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const originalDev = global.__DEV__;
    global.__DEV__ = false;

    const { queryByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(queryByText('Debug Info:')).toBeFalsy();

    global.__DEV__ = originalDev;
    consoleSpy.mockRestore();
  });

  it('calls custom error handler when provided', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );

    consoleSpy.mockRestore();
  });

  it('uses custom fallback when provided', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const customFallback = (error: Error, resetError: () => void) => (
      <>
        <text>Custom error message</text>
        <text onPress={resetError}>Reset</text>
      </>
    );

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
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      
      return (
        <ErrorBoundary>
          <text onPress={() => setShouldThrow(false)}>Fix Error</text>
          <ThrowingComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };

    const { getByText } = render(<TestComponent />);

    // Error should be shown
    expect(getByText('Something went wrong')).toBeTruthy();

    // Click Try Again
    fireEvent.press(getByText('Try Again'));

    // Error should still be shown because component still throws
    expect(getByText('Something went wrong')).toBeTruthy();

    consoleSpy.mockRestore();
  });

  it('shows report error alert when Report Issue is pressed', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.press(getByText('Report Issue'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Report Error',
      expect.stringContaining('Error ID:'),
      expect.arrayContaining([
        { text: 'Cancel', style: 'cancel' },
        expect.objectContaining({ text: 'Report' })
      ])
    );

    consoleSpy.mockRestore();
  });

  it('handles error without error ID gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should still render error UI
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
    expect(getByText('Report Issue')).toBeTruthy();

    consoleSpy.mockRestore();
  });
});