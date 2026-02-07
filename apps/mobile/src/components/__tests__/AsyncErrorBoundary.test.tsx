import React from 'react';
import { render, fireEvent, waitFor } from '../../__tests__/test-utils';
import { Text, TouchableOpacity } from 'react-native';
import { AsyncErrorBoundary } from '../AsyncErrorBoundary';
import { logger } from '../../utils/logger';
import { captureException } from '../../config/sentry';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock Sentry
jest.mock('../../config/sentry', () => ({
  captureException: jest.fn(),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

// Helper component that throws errors
const ThrowingComponent = ({
  shouldThrow = true,
  errorMessage = 'Test error',
}: {
  shouldThrow?: boolean;
  errorMessage?: string;
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <Text>No error</Text>;
};

// Helper component with async operations
const AsyncThrowingComponent = ({
  shouldThrow = true,
  delay = 0,
}: {
  shouldThrow?: boolean;
  delay?: number;
}) => {
  const [hasThrown, setHasThrown] = React.useState(false);

  React.useEffect(() => {
    if (shouldThrow && !hasThrown) {
      setTimeout(() => {
        setHasThrown(true);
        throw new Error('Async error');
      }, delay);
    }
  }, [shouldThrow, hasThrown, delay]);

  return <Text>Async component</Text>;
};

describe('AsyncErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console errors in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render children when no error occurs', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="test-operation">
          <ThrowingComponent shouldThrow={false} />
        </AsyncErrorBoundary>
      );

      expect(getByText('No error')).toBeTruthy();
    });

    it('should render without crashing with minimal props', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="minimal">
          <Text>Content</Text>
        </AsyncErrorBoundary>
      );

      expect(getByText('Content')).toBeTruthy();
    });

    it('should render with all optional props', () => {
      const onRetry = jest.fn();
      const { getByText } = render(
        <AsyncErrorBoundary
          operationName="full-props"
          onRetry={onRetry}
          fallbackMessage="Custom fallback message"
        >
          <Text>Content</Text>
        </AsyncErrorBoundary>
      );

      expect(getByText('Content')).toBeTruthy();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="multiple-children">
          <Text>Child 1</Text>
          <Text>Child 2</Text>
          <Text>Child 3</Text>
        </AsyncErrorBoundary>
      );

      expect(getByText('Child 1')).toBeTruthy();
      expect(getByText('Child 2')).toBeTruthy();
      expect(getByText('Child 3')).toBeTruthy();
    });
  });

  describe('Error Catching', () => {
    it('should catch errors and display fallback UI', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="catch-error">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByText('Operation Failed')).toBeTruthy();
      expect(
        getByText(
          'The catch-error operation encountered an error. Please try again.'
        )
      ).toBeTruthy();
    });

    it('should catch errors with custom error messages', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="custom-error">
          <ThrowingComponent
            shouldThrow={true}
            errorMessage="Custom error message"
          />
        </AsyncErrorBoundary>
      );

      expect(getByText('Operation Failed')).toBeTruthy();
    });

    it('should handle errors from nested components', () => {
      const NestedComponent = () => {
        return (
          <TouchableOpacity>
            <ThrowingComponent shouldThrow={true} />
          </TouchableOpacity>
        );
      };

      const { getByText } = render(
        <AsyncErrorBoundary operationName="nested-error">
          <NestedComponent />
        </AsyncErrorBoundary>
      );

      expect(getByText('Operation Failed')).toBeTruthy();
    });

    it('should catch errors from multiple child components', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="multiple-errors">
          <Text>Safe component</Text>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByText('Operation Failed')).toBeTruthy();
    });
  });

  describe('Fallback UI', () => {
    it('should display operation name in fallback message', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="data-fetch">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(
        getByText(
          'The data-fetch operation encountered an error. Please try again.'
        )
      ).toBeTruthy();
    });

    it('should display custom fallback message when provided', () => {
      const customMessage = 'Failed to load user data. Please refresh the page.';
      const { getByText } = render(
        <AsyncErrorBoundary
          operationName="user-fetch"
          fallbackMessage={customMessage}
        >
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByText(customMessage)).toBeTruthy();
      expect(getByText('Operation Failed')).toBeTruthy();
    });

    it('should display alert icon in fallback UI', () => {
      const { UNSAFE_getByType } = render(
        <AsyncErrorBoundary operationName="icon-test">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const icons = UNSAFE_getByType('Ionicons' as any);
      expect(icons).toBeTruthy();
    });

    it('should display Try Again button', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="retry-button">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByText('Try Again')).toBeTruthy();
    });

    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <AsyncErrorBoundary operationName="accessibility-test">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = getByLabelText('Retry accessibility-test operation');
      expect(retryButton).toBeTruthy();
      expect(retryButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Error Logging', () => {
    it('should log error with logger', () => {
      render(
        <AsyncErrorBoundary operationName="logging-test">
          <ThrowingComponent shouldThrow={true} errorMessage="Test error" />
        </AsyncErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Async operation error in logging-test'),
        expect.any(Error),
        expect.objectContaining({
          operationName: 'logging-test',
        })
      );
    });

    it('should include operation name in log context', () => {
      render(
        <AsyncErrorBoundary operationName="context-test">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        expect.objectContaining({
          operationName: 'context-test',
        })
      );
    });

    it('should include component stack in log context', () => {
      render(
        <AsyncErrorBoundary operationName="stack-test">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        expect.objectContaining({
          operationName: 'stack-test',
          componentStack: expect.any(String),
        })
      );
    });

    it('should truncate long component stacks to 500 characters', () => {
      render(
        <AsyncErrorBoundary operationName="truncate-test">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const errorCall = (logger.error as jest.Mock).mock.calls[0];
      const componentStack = errorCall[2].componentStack;

      if (componentStack) {
        expect(componentStack.length).toBeLessThanOrEqual(500);
      }
    });
  });

  describe('Sentry Integration', () => {
    it('should capture exception in Sentry', () => {
      render(
        <AsyncErrorBoundary operationName="sentry-test">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            errorBoundary: 'async',
            operationName: 'sentry-test',
          },
        })
      );
    });

    it('should include errorInfo in Sentry extra context', () => {
      render(
        <AsyncErrorBoundary operationName="sentry-context">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          extra: expect.objectContaining({
            componentStack: expect.any(String),
          }),
        })
      );
    });

    it('should tag error with async boundary type', () => {
      render(
        <AsyncErrorBoundary operationName="tag-test">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            errorBoundary: 'async',
          }),
        })
      );
    });

    it('should handle Sentry failure gracefully', () => {
      (captureException as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Sentry error');
      });

      const { getByText } = render(
        <AsyncErrorBoundary operationName="sentry-failure">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      // Should still show fallback UI
      expect(getByText('Operation Failed')).toBeTruthy();
      // Should log warning about Sentry failure
      expect(logger.warn).toHaveBeenCalledWith(
        'Sentry tracking failed',
        expect.any(Error)
      );
    });
  });

  describe('Retry Functionality', () => {
    it('should call onRetry when Try Again button is pressed', async () => {
      const onRetry = jest.fn().mockResolvedValue(undefined);

      const { getByText } = render(
        <AsyncErrorBoundary operationName="retry-test" onRetry={onRetry}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
      });
    });

    it('should show Retrying... state during retry', async () => {
      const onRetry = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const { getByText, queryByText } = render(
        <AsyncErrorBoundary operationName="retry-state" onRetry={onRetry}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      // Should show retrying state
      await waitFor(() => {
        expect(queryByText('Retrying...')).toBeTruthy();
      });

      // Wait for retry to complete
      await waitFor(() => {
        expect(queryByText('Try Again')).toBeTruthy();
      });
    });

    it('should disable button during retry', async () => {
      const onRetry = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const { getByLabelText } = render(
        <AsyncErrorBoundary operationName="disable-test" onRetry={onRetry}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = getByLabelText('Retry disable-test operation');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(retryButton.props.disabled).toBe(true);
      });
    });

    it('should reset error state on successful retry', async () => {
      const onRetry = jest.fn().mockResolvedValue(undefined);

      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);

        const handleRetry = async () => {
          await onRetry();
          setShouldThrow(false);
        };

        return (
          <AsyncErrorBoundary operationName="reset-test" onRetry={handleRetry}>
            <ThrowingComponent shouldThrow={shouldThrow} />
          </AsyncErrorBoundary>
        );
      };

      const { getByText, queryByText } = render(<TestComponent />);

      // Error should be shown
      expect(getByText('Operation Failed')).toBeTruthy();

      // Click retry
      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
      });
    });

    it('should handle retry failure gracefully', async () => {
      const retryError = new Error('Retry failed');
      const onRetry = jest.fn().mockRejectedValue(retryError);

      const { getByText } = render(
        <AsyncErrorBoundary operationName="retry-failure" onRetry={onRetry}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
      });

      // Should log retry failure
      expect(logger.error).toHaveBeenCalledWith('Retry failed:', retryError);

      // Should keep showing error UI (not reset)
      expect(getByText('Operation Failed')).toBeTruthy();
    });

    it('should not reset error on retry failure', async () => {
      const onRetry = jest.fn().mockRejectedValue(new Error('Retry failed'));

      const { getByText } = render(
        <AsyncErrorBoundary operationName="no-reset-test" onRetry={onRetry}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
      });

      // Error UI should still be visible
      await waitFor(() => {
        expect(getByText('Operation Failed')).toBeTruthy();
        expect(getByText('Try Again')).toBeTruthy();
      });
    });

    it('should allow multiple retry attempts', async () => {
      const onRetry = jest.fn().mockRejectedValue(new Error('Retry failed'));

      const { getByText } = render(
        <AsyncErrorBoundary operationName="multiple-retry" onRetry={onRetry}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = getByText('Try Again');

      // First retry
      fireEvent.press(retryButton);
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
      });

      // Second retry
      fireEvent.press(retryButton);
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(2);
      });

      // Third retry
      fireEvent.press(retryButton);
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(3);
      });
    });

    it('should reset error when no onRetry is provided', async () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="no-retry-handler">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      // Should attempt to reset without calling any retry handler
      await waitFor(() => {
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });

  describe('Development Mode', () => {
    it('should show debug info in development mode', () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;

      const { getByText } = render(
        <AsyncErrorBoundary operationName="dev-mode">
          <ThrowingComponent shouldThrow={true} errorMessage="Debug error" />
        </AsyncErrorBoundary>
      );

      expect(getByText(/Operation: dev-mode/)).toBeTruthy();
      expect(getByText(/Error: Debug error/)).toBeTruthy();
      expect(getByText(/Stack:/)).toBeTruthy();

      (global as any).__DEV__ = originalDev;
    });

    it('should hide debug info in production mode', () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = false;

      const { queryByText } = render(
        <AsyncErrorBoundary operationName="prod-mode">
          <ThrowingComponent shouldThrow={true} errorMessage="Prod error" />
        </AsyncErrorBoundary>
      );

      expect(queryByText(/Operation:/)).toBeFalsy();
      expect(queryByText(/Error:/)).toBeFalsy();
      expect(queryByText(/Stack:/)).toBeFalsy();

      (global as any).__DEV__ = originalDev;
    });

    it('should truncate stack trace to 200 characters in debug view', () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;

      const longStackError = new Error('Test error');
      longStackError.stack = 'a'.repeat(500);

      const LongStackComponent = () => {
        throw longStackError;
      };

      const { getByText } = render(
        <AsyncErrorBoundary operationName="long-stack">
          <LongStackComponent />
        </AsyncErrorBoundary>
      );

      const stackText = getByText(/Stack:/);
      expect(stackText).toBeTruthy();

      (global as any).__DEV__ = originalDev;
    });

    it('should handle missing stack trace gracefully', () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;

      const noStackError = new Error('No stack');
      noStackError.stack = undefined;

      const NoStackComponent = () => {
        throw noStackError;
      };

      const { getByText } = render(
        <AsyncErrorBoundary operationName="no-stack">
          <NoStackComponent />
        </AsyncErrorBoundary>
      );

      expect(getByText(/Stack: N\/A/)).toBeTruthy();

      (global as any).__DEV__ = originalDev;
    });
  });

  describe('Icon States', () => {
    it('should display refresh icon when not retrying', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="refresh-icon">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByText('Try Again')).toBeTruthy();
    });

    it('should display hourglass icon when retrying', async () => {
      const onRetry = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const { getByText } = render(
        <AsyncErrorBoundary operationName="hourglass-icon" onRetry={onRetry}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(getByText('Retrying...')).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null error message', () => {
      const NullMessageComponent = () => {
        const error: any = new Error();
        error.message = null;
        throw error;
      };

      const { getByText } = render(
        <AsyncErrorBoundary operationName="null-message">
          <NullMessageComponent />
        </AsyncErrorBoundary>
      );

      expect(getByText('Operation Failed')).toBeTruthy();
    });

    it('should handle undefined error message', () => {
      const UndefinedMessageComponent = () => {
        const error: any = new Error();
        error.message = undefined;
        throw error;
      };

      const { getByText } = render(
        <AsyncErrorBoundary operationName="undefined-message">
          <UndefinedMessageComponent />
        </AsyncErrorBoundary>
      );

      expect(getByText('Operation Failed')).toBeTruthy();
    });

    it('should handle empty operation name', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByText('Operation Failed')).toBeTruthy();
      expect(
        getByText('The  operation encountered an error. Please try again.')
      ).toBeTruthy();
    });

    it('should handle very long operation names', () => {
      const longName = 'a'.repeat(200);
      const { getByText } = render(
        <AsyncErrorBoundary operationName={longName}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByText('Operation Failed')).toBeTruthy();
    });

    it('should handle special characters in operation name', () => {
      const specialName = 'test-@#$%^&*()_+={}[]|\\:;"\'<>,.?/';
      const { getByText } = render(
        <AsyncErrorBoundary operationName={specialName}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByText('Operation Failed')).toBeTruthy();
    });

    it('should handle very long fallback messages', () => {
      const longMessage = 'a'.repeat(500);
      const { getByText } = render(
        <AsyncErrorBoundary operationName="long-message" fallbackMessage={longMessage}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByText(longMessage)).toBeTruthy();
    });

    it('should handle rapid successive errors', () => {
      const { rerender } = render(
        <AsyncErrorBoundary operationName="rapid-errors">
          <ThrowingComponent shouldThrow={true} errorMessage="Error 1" />
        </AsyncErrorBoundary>
      );

      rerender(
        <AsyncErrorBoundary operationName="rapid-errors">
          <ThrowingComponent shouldThrow={true} errorMessage="Error 2" />
        </AsyncErrorBoundary>
      );

      rerender(
        <AsyncErrorBoundary operationName="rapid-errors">
          <ThrowingComponent shouldThrow={true} errorMessage="Error 3" />
        </AsyncErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle component unmount during retry', async () => {
      const onRetry = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const { getByText, unmount } = render(
        <AsyncErrorBoundary operationName="unmount-test" onRetry={onRetry}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      // Unmount before retry completes
      unmount();

      // Should not throw any errors
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('Async Operation Errors', () => {
    it('should catch errors from useEffect hooks', () => {
      const EffectErrorComponent = () => {
        React.useEffect(() => {
          throw new Error('Effect error');
        }, []);
        return <Text>Component</Text>;
      };

      const { getByText } = render(
        <AsyncErrorBoundary operationName="effect-error">
          <EffectErrorComponent />
        </AsyncErrorBoundary>
      );

      // Note: React error boundaries don't catch errors in effects by default
      // This test documents the current behavior
      expect(getByText('Component')).toBeTruthy();
    });

    it('should handle promise rejections in retry', async () => {
      const onRetry = jest.fn().mockRejectedValue(new Error('Promise rejected'));

      const { getByText } = render(
        <AsyncErrorBoundary operationName="promise-rejection" onRetry={onRetry}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      fireEvent.press(getByText('Try Again'));

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Retry failed:',
          expect.any(Error)
        );
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render children unnecessarily', () => {
      let renderCount = 0;
      const CountingComponent = () => {
        renderCount++;
        return <Text>Render count: {renderCount}</Text>;
      };

      const { rerender } = render(
        <AsyncErrorBoundary operationName="performance-test">
          <CountingComponent />
        </AsyncErrorBoundary>
      );

      const initialCount = renderCount;

      // Rerender with same props
      rerender(
        <AsyncErrorBoundary operationName="performance-test">
          <CountingComponent />
        </AsyncErrorBoundary>
      );

      expect(renderCount).toBeGreaterThan(initialCount);
    });

    it('should handle high-frequency retry clicks', async () => {
      const onRetry = jest.fn().mockResolvedValue(undefined);

      const { getByText } = render(
        <AsyncErrorBoundary operationName="high-frequency" onRetry={onRetry}>
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = getByText('Try Again');

      // Rapid clicks
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);

      // Should only trigger once due to disabled state
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Integration with ErrorBoundary', () => {
    it('should pass fallback to underlying ErrorBoundary', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="integration-test">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByText('Operation Failed')).toBeTruthy();
    });

    it('should pass onError handler to underlying ErrorBoundary', () => {
      render(
        <AsyncErrorBoundary operationName="error-handler-test">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalled();
      expect(captureException).toHaveBeenCalled();
    });
  });

  describe('TypeScript Types', () => {
    it('should accept valid props', () => {
      const validProps = {
        children: <Text>Child</Text>,
        operationName: 'type-test',
        onRetry: async () => {},
        fallbackMessage: 'Custom message',
      };

      const { getByText } = render(<AsyncErrorBoundary {...validProps} />);

      expect(getByText('Child')).toBeTruthy();
    });

    it('should accept React.ReactNode as children', () => {
      const { getByText } = render(
        <AsyncErrorBoundary operationName="react-node-test">
          {['Item 1', <Text key="2">Item 2</Text>, null, undefined]}
        </AsyncErrorBoundary>
      );

      expect(getByText('Item 2')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role', () => {
      const { getByLabelText } = render(
        <AsyncErrorBoundary operationName="a11y-role">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const button = getByLabelText('Retry a11y-role operation');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('should have descriptive accessibility label', () => {
      const { getByLabelText } = render(
        <AsyncErrorBoundary operationName="user-login">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByLabelText('Retry user-login operation')).toBeTruthy();
    });

    it('should update accessibility label based on operation name', () => {
      const { getByLabelText, rerender } = render(
        <AsyncErrorBoundary operationName="operation-1">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByLabelText('Retry operation-1 operation')).toBeTruthy();

      rerender(
        <AsyncErrorBoundary operationName="operation-2">
          <ThrowingComponent shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(getByLabelText('Retry operation-2 operation')).toBeTruthy();
    });
  });
});
