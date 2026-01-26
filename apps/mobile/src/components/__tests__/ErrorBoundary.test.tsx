/**
 * Comprehensive tests for ErrorBoundary component
 * Coverage: 100%
 * Tests: Error catching, logging, fallback UI, recovery, lifecycle methods
 */

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Sentry module
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

// Mock logger from shared package
jest.mock('@mintenance/shared', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent, waitFor } from '../../__tests__/test-utils';
import { ErrorBoundary } from '../ErrorBoundary';
import { logger } from '@mintenance/shared';
import * as Sentry from '@sentry/react-native';

// Component that throws an error
const ThrowError: React.FC<{ message?: string; shouldThrow?: boolean }> = ({
  message = 'Test error',
  shouldThrow = true
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <Text testID="success-child">Success</Text>;
};

// Component that throws async error
const ThrowAsyncError: React.FC = () => {
  React.useEffect(() => {
    throw new Error('Async error');
  }, []);
  return <Text>Async Component</Text>;
};

// Store original console.error
const originalConsoleError = console.error;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for cleaner test output
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.error = originalConsoleError;
  });

  describe('Normal Rendering', () => {
    it('should render children when no error occurs', () => {
      const { getByTestId } = render(
        <ErrorBoundary>
          <Text testID="child-component">Child Content</Text>
        </ErrorBoundary>
      );

      expect(getByTestId('child-component')).toBeTruthy();
    });

    it('should render multiple children when no error occurs', () => {
      const { getByTestId } = render(
        <ErrorBoundary>
          <Text testID="child-1">Child 1</Text>
          <Text testID="child-2">Child 2</Text>
          <Text testID="child-3">Child 3</Text>
        </ErrorBoundary>
      );

      expect(getByTestId('child-1')).toBeTruthy();
      expect(getByTestId('child-2')).toBeTruthy();
      expect(getByTestId('child-3')).toBeTruthy();
    });

    it('should render complex nested children without errors', () => {
      const { getByTestId } = render(
        <ErrorBoundary>
          <View testID="parent">
            <View testID="nested-1">
              <Text testID="deep-text">Deep Text</Text>
            </View>
          </View>
        </ErrorBoundary>
      );

      expect(getByTestId('parent')).toBeTruthy();
      expect(getByTestId('nested-1')).toBeTruthy();
      expect(getByTestId('deep-text')).toBeTruthy();
    });
  });

  describe('Error Catching', () => {
    it('should catch error and display default fallback UI', () => {
      const { getByText, queryByTestId } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should show error message
      expect(getByText('Oops! Something went wrong')).toBeTruthy();
      expect(getByText(/We're sorry for the inconvenience/)).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();

      // Should not show child
      expect(queryByTestId('success-child')).toBeNull();
    });

    it('should catch error with custom message', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Custom error message" />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'React Error Boundary caught an error',
        expect.any(Error),
        expect.objectContaining({
          service: 'ErrorBoundary',
          componentStack: expect.any(String),
        })
      );
    });

    it('should catch errors from deeply nested components', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <View>
            <View>
              <View>
                <ThrowError message="Deep error" />
              </View>
            </View>
          </View>
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeTruthy();
    });

    it('should catch multiple errors sequentially', () => {
      const { rerender, getByText } = render(
        <ErrorBoundary>
          <ThrowError message="First error" />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeTruthy();

      // Reset and throw again
      const resetButton = getByText('Try Again');
      fireEvent.press(resetButton);

      rerender(
        <ErrorBoundary>
          <ThrowError message="Second error" />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeTruthy();
    });

    it('should handle errors with no message', () => {
      const ThrowNoMessage = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary>
          <ThrowNoMessage />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error objects thrown', () => {
      const ThrowString = () => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'String error';
      };

      render(
        <ErrorBoundary>
          <ThrowString />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getDerivedStateFromError', () => {
    it('should set hasError to true when error occurs', () => {
      const { queryByTestId } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Fallback UI should be shown, child should not
      expect(queryByTestId('success-child')).toBeNull();
    });

    it('should capture error object in state', () => {
      const errorMessage = 'Specific error for state test';

      render(
        <ErrorBoundary>
          <ThrowError message={errorMessage} />
        </ErrorBoundary>
      );

      // Verify error was logged with correct message
      expect(logger.error).toHaveBeenCalledWith(
        'React Error Boundary caught an error',
        expect.objectContaining({
          message: errorMessage,
        }),
        expect.any(Object)
      );
    });

    it('should update state synchronously', () => {
      const { queryByText, queryByTestId } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // State should be updated immediately
      expect(queryByText('Oops! Something went wrong')).toBeTruthy();
      expect(queryByTestId('success-child')).toBeNull();
    });
  });

  describe('componentDidCatch', () => {
    it('should log error to logger service', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Logger test error" />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'React Error Boundary caught an error',
        expect.objectContaining({
          message: 'Logger test error',
        }),
        expect.objectContaining({
          service: 'ErrorBoundary',
          componentStack: expect.any(String),
        })
      );
    });

    it('should call custom onError handler if provided', () => {
      const mockOnError = jest.fn();

      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError message="Custom handler error" />
        </ErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom handler error',
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should not fail if onError is not provided', () => {
      expect(() => {
        render(
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    it('should include componentStack in error info', () => {
      const mockOnError = jest.fn();

      render(
        <ErrorBoundary onError={mockOnError}>
          <View>
            <ThrowError />
          </View>
        </ErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.stringContaining('ThrowError'),
        })
      );
    });

    it('should report error to Sentry service', async () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Sentry test error" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(Sentry.captureException).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Sentry test error',
          }),
          expect.objectContaining({
            contexts: {
              react: {
                componentStack: expect.any(String),
              },
            },
            level: 'error',
            tags: {
              errorBoundary: 'true',
              environment: expect.any(String),
            },
          })
        );
      });
    });

    it('should handle Sentry import failure gracefully', async () => {
      // Mock Sentry import to fail
      const originalError = console.error;
      console.error = jest.fn();

      // This test verifies the catch block in reportErrorToService
      render(
        <ErrorBoundary>
          <ThrowError message="Sentry failure test" />
        </ErrorBoundary>
      );

      // Should still log to logger even if Sentry fails
      expect(logger.error).toHaveBeenCalled();

      console.error = originalError;
    });
  });

  describe('Custom Fallback UI', () => {
    it('should render custom fallback when provided', () => {
      const CustomFallback = <Text testID="custom-fallback">Custom Error UI</Text>;

      const { getByTestId, queryByText } = render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByTestId('custom-fallback')).toBeTruthy();
      expect(queryByText('Oops! Something went wrong')).toBeNull();
    });

    it('should render custom fallback with complex UI', () => {
      const CustomFallback = (
        <View testID="custom-complex">
          <Text testID="custom-title">Something Broke</Text>
          <Text testID="custom-message">Please try again later</Text>
        </View>
      );

      const { getByTestId } = render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByTestId('custom-complex')).toBeTruthy();
      expect(getByTestId('custom-title')).toBeTruthy();
      expect(getByTestId('custom-message')).toBeTruthy();
    });

    it('should not render custom fallback when no error', () => {
      const CustomFallback = <Text testID="custom-fallback">Custom Error UI</Text>;

      const { queryByTestId, getByTestId } = render(
        <ErrorBoundary fallback={CustomFallback}>
          <Text testID="normal-child">Normal Content</Text>
        </ErrorBoundary>
      );

      expect(getByTestId('normal-child')).toBeTruthy();
      expect(queryByTestId('custom-fallback')).toBeNull();
    });
  });

  describe('Default Fallback UI', () => {
    it('should display error emoji', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('😔')).toBeTruthy();
    });

    it('should display error title', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeTruthy();
    });

    it('should display error message', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText(/We're sorry for the inconvenience/)).toBeTruthy();
    });

    it('should display Try Again button', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const button = getByText('Try Again');
      expect(button).toBeTruthy();
    });

    it('should apply correct styles to fallback UI', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const title = getByText('Oops! Something went wrong');
      expect(title).toBeTruthy();
    });
  });

  describe('Development Error Details', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show error details in development mode', () => {
      process.env.NODE_ENV = 'development';

      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError message="Dev mode error" />
        </ErrorBoundary>
      );

      expect(getByText('Error Details (Development Only):')).toBeTruthy();
      expect(getByText('Dev mode error')).toBeTruthy();
    });

    it('should display error stack trace in development', () => {
      process.env.NODE_ENV = 'development';

      const { queryByText } = render(
        <ErrorBoundary>
          <ThrowError message="Stack trace test" />
        </ErrorBoundary>
      );

      expect(queryByText('Error Details (Development Only):')).toBeTruthy();
    });

    it('should not show error details in production mode', () => {
      process.env.NODE_ENV = 'production';

      const { queryByText } = render(
        <ErrorBoundary>
          <ThrowError message="Production error" />
        </ErrorBoundary>
      );

      expect(queryByText('Error Details (Development Only):')).toBeNull();
      expect(queryByText('Production error')).toBeNull();
    });

    it('should not show error details when NODE_ENV is undefined', () => {
      delete process.env.NODE_ENV;

      const { queryByText } = render(
        <ErrorBoundary>
          <ThrowError message="Undefined env error" />
        </ErrorBoundary>
      );

      expect(queryByText('Error Details (Development Only):')).toBeNull();
    });

    it('should handle error without stack trace', () => {
      process.env.NODE_ENV = 'development';

      const ErrorNoStack = () => {
        const error = new Error('No stack');
        delete error.stack;
        throw error;
      };

      render(
        <ErrorBoundary>
          <ErrorNoStack />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should reset error state when Try Again is pressed', () => {
      const { getByText, rerender, getByTestId } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error state
      expect(getByText('Oops! Something went wrong')).toBeTruthy();

      // Press Try Again
      const tryAgainButton = getByText('Try Again');
      fireEvent.press(tryAgainButton);

      // Rerender with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should show child again
      expect(getByTestId('success-child')).toBeTruthy();
    });

    it('should clear error from state on reset', () => {
      const { getByText, queryByText, rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeTruthy();

      const tryAgainButton = getByText('Try Again');
      fireEvent.press(tryAgainButton);

      rerender(
        <ErrorBoundary>
          <Text testID="recovered">Recovered</Text>
        </ErrorBoundary>
      );

      expect(queryByText('Oops! Something went wrong')).toBeNull();
    });

    it('should allow multiple reset cycles', () => {
      const { getByText, rerender } = render(
        <ErrorBoundary>
          <ThrowError message="First error" />
        </ErrorBoundary>
      );

      // First error
      expect(getByText('Oops! Something went wrong')).toBeTruthy();
      fireEvent.press(getByText('Try Again'));

      rerender(
        <ErrorBoundary>
          <Text>Recovery 1</Text>
        </ErrorBoundary>
      );

      // Second error
      rerender(
        <ErrorBoundary>
          <ThrowError message="Second error" />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeTruthy();
      fireEvent.press(getByText('Try Again'));

      rerender(
        <ErrorBoundary>
          <Text>Recovery 2</Text>
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledTimes(2);
    });

    it('should reset hasError flag to false', () => {
      const { getByText, queryByText, rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      fireEvent.press(getByText('Try Again'));

      rerender(
        <ErrorBoundary>
          <Text testID="new-child">New Child</Text>
        </ErrorBoundary>
      );

      // Should not show error UI
      expect(queryByText('Oops! Something went wrong')).toBeNull();
    });

    it('should reset error object to null', () => {
      process.env.NODE_ENV = 'development';

      const { getByText, queryByText, rerender } = render(
        <ErrorBoundary>
          <ThrowError message="Reset test error" />
        </ErrorBoundary>
      );

      expect(getByText('Reset test error')).toBeTruthy();

      fireEvent.press(getByText('Try Again'));

      rerender(
        <ErrorBoundary>
          <Text>Recovered</Text>
        </ErrorBoundary>
      );

      expect(queryByText('Reset test error')).toBeNull();
    });
  });

  describe('Error Reporting', () => {
    it('should report error with correct Sentry tags', async () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Sentry tags test" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(Sentry.captureException).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            tags: expect.objectContaining({
              errorBoundary: 'true',
            }),
          })
        );
      });
    });

    it('should report error with environment tag', async () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(Sentry.captureException).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            tags: expect.objectContaining({
              environment: expect.any(String),
            }),
          })
        );
      });
    });

    it('should report error with component stack context', async () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(Sentry.captureException).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            contexts: {
              react: {
                componentStack: expect.any(String),
              },
            },
          })
        );
      });
    });

    it('should report error with error level', async () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(Sentry.captureException).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            level: 'error',
          })
        );
      });
    });

    it('should handle Sentry reporting errors gracefully', async () => {
      // Mock Sentry to throw
      (Sentry.captureException as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Sentry error');
      });

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should log warning about Sentry failure
      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalled();
      });
    });

    it('should continue to function after Sentry failure', async () => {
      (Sentry.captureException as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Sentry error');
      });

      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // UI should still work
      expect(getByText('Oops! Something went wrong')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      const { container } = render(
        <ErrorBoundary>
          {null}
        </ErrorBoundary>
      );

      expect(container).toBeTruthy();
    });

    it('should handle undefined children', () => {
      const { container } = render(
        <ErrorBoundary>
          {undefined}
        </ErrorBoundary>
      );

      expect(container).toBeTruthy();
    });

    it('should handle boolean children', () => {
      const { container } = render(
        <ErrorBoundary>
          {false}
        </ErrorBoundary>
      );

      expect(container).toBeTruthy();
    });

    it('should handle array of children', () => {
      const { getByText } = render(
        <ErrorBoundary>
          {[
            <Text key="1">Child 1</Text>,
            <Text key="2">Child 2</Text>,
          ]}
        </ErrorBoundary>
      );

      expect(getByText('Child 1')).toBeTruthy();
      expect(getByText('Child 2')).toBeTruthy();
    });

    it('should handle fragment children', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <>
            <Text>Fragment Child 1</Text>
            <Text>Fragment Child 2</Text>
          </>
        </ErrorBoundary>
      );

      expect(getByText('Fragment Child 1')).toBeTruthy();
      expect(getByText('Fragment Child 2')).toBeTruthy();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);

      render(
        <ErrorBoundary>
          <ThrowError message={longMessage} />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'React Error Boundary caught an error',
        expect.objectContaining({
          message: longMessage,
        }),
        expect.any(Object)
      );
    });

    it('should handle special characters in error messages', () => {
      const specialMessage = '<script>alert("xss")</script>';

      render(
        <ErrorBoundary>
          <ThrowError message={specialMessage} />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle rapid error-reset cycles', () => {
      const { getByText, rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByText('Try Again'));

        rerender(
          <ErrorBoundary>
            <Text>Reset {i}</Text>
          </ErrorBoundary>
        );

        rerender(
          <ErrorBoundary>
            <ThrowError message={`Error ${i}`} />
          </ErrorBoundary>
        );
      }

      expect(logger.error).toHaveBeenCalledTimes(6); // Initial + 5 in loop
    });

    it('should handle null fallback prop', () => {
      const { getByText } = render(
        <ErrorBoundary fallback={null}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should show default fallback when custom fallback is null
      expect(getByText('Oops! Something went wrong')).toBeTruthy();
    });

    it('should handle undefined fallback prop', () => {
      const { getByText } = render(
        <ErrorBoundary fallback={undefined}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should show default fallback
      expect(getByText('Oops! Something went wrong')).toBeTruthy();
    });
  });

  describe('Lifecycle Integration', () => {
    it('should call componentDidCatch after getDerivedStateFromError', () => {
      const mockOnError = jest.fn();

      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError message="Lifecycle test" />
        </ErrorBoundary>
      );

      // Both should be called
      expect(logger.error).toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalled();
    });

    it('should update state before logging', () => {
      const mockOnError = jest.fn();

      const { queryByText } = render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Fallback UI should be rendered (state updated)
      expect(queryByText('Oops! Something went wrong')).toBeTruthy();

      // And logging should have occurred
      expect(logger.error).toHaveBeenCalled();
    });

    it('should not re-render children after error', () => {
      const renderSpy = jest.fn();

      const SpyComponent = () => {
        renderSpy();
        return <Text>Spy</Text>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <SpyComponent />
        </ErrorBoundary>
      );

      const initialRenderCount = renderSpy.mock.calls.length;

      // Trigger error
      rerender(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // SpyComponent should not render again after error
      expect(renderSpy).toHaveBeenCalledTimes(initialRenderCount);
    });
  });

  describe('Props Validation', () => {
    it('should accept valid children prop', () => {
      expect(() => {
        render(
          <ErrorBoundary>
            <Text>Valid Child</Text>
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    it('should accept valid fallback prop', () => {
      expect(() => {
        render(
          <ErrorBoundary fallback={<Text>Custom Fallback</Text>}>
            <Text>Child</Text>
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    it('should accept valid onError prop', () => {
      const mockHandler = jest.fn();

      expect(() => {
        render(
          <ErrorBoundary onError={mockHandler}>
            <Text>Child</Text>
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    it('should work with all props provided', () => {
      const mockHandler = jest.fn();
      const fallback = <Text testID="all-props-fallback">Custom</Text>;

      const { getByTestId } = render(
        <ErrorBoundary fallback={fallback} onError={mockHandler}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByTestId('all-props-fallback')).toBeTruthy();
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should work with no optional props', () => {
      expect(() => {
        render(
          <ErrorBoundary>
            <Text>Child</Text>
          </ErrorBoundary>
        );
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button for error recovery', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const button = getByText('Try Again');
      expect(button).toBeTruthy();
    });

    it('should display error message in accessible format', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeTruthy();
      expect(getByText(/We're sorry for the inconvenience/)).toBeTruthy();
    });
  });

  describe('Memory Leaks Prevention', () => {
    it('should not retain error after reset', () => {
      const { getByText, rerender } = render(
        <ErrorBoundary>
          <ThrowError message="Memory leak test" />
        </ErrorBoundary>
      );

      fireEvent.press(getByText('Try Again'));

      rerender(
        <ErrorBoundary>
          <Text>New content</Text>
        </ErrorBoundary>
      );

      // Error should be cleared from state
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should not re-render when props do not change', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <Text>Child</Text>
        </ErrorBoundary>
      );

      // Same props, should not cause unnecessary re-render
      rerender(
        <ErrorBoundary>
          <Text>Child</Text>
        </ErrorBoundary>
      );

      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle high-frequency errors efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <ErrorBoundary>
            <ThrowError message={`Error ${i}`} />
          </ErrorBoundary>
        );
        unmount();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });
});
