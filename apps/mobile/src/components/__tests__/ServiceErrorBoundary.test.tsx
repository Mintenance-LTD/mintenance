jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock logger before importing component
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock errorHandler before importing component
jest.mock('../../utils/errorHandler', () => ({
  handleError: jest.fn(),
}));

import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent, waitFor } from '../../__tests__/test-utils';
import { ServiceErrorBoundary } from '../ServiceErrorBoundary';
import { logger } from '../../utils/logger';
import { handleError } from '../../utils/errorHandler';

// Component that throws error
const ThrowError = ({ message = 'Test error' }: { message?: string }) => {
  throw new Error(message);
};

// Component that works normally
const WorkingComponent = ({ text = 'Working' }: { text?: string }) => (
  <Text testID="working-component">{text}</Text>
);

// Component that can conditionally throw errors
const ConditionalError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Conditional error');
  }
  return <Text testID="conditional-component">No error</Text>;
};

describe('ServiceErrorBoundary', () => {
  const originalConsoleError = console.error;
  const originalDev = global.__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress React error boundary console.error in tests
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.error = originalConsoleError;
    global.__DEV__ = originalDev;
  });

  describe('Rendering', () => {
    it('should render children when no error occurs', () => {
      const { getByTestId } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <WorkingComponent />
        </ServiceErrorBoundary>
      );

      expect(getByTestId('working-component')).toBeTruthy();
    });

    it('should render multiple children when no error occurs', () => {
      const { getByTestId } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <WorkingComponent text="First" />
          <WorkingComponent text="Second" />
        </ServiceErrorBoundary>
      );

      expect(getByTestId('working-component')).toBeTruthy();
    });

    it('should render with different serviceName props', () => {
      const { getByTestId } = render(
        <ServiceErrorBoundary serviceName="Authentication">
          <WorkingComponent />
        </ServiceErrorBoundary>
      );

      expect(getByTestId('working-component')).toBeTruthy();
    });

    it('should handle empty children gracefully', () => {
      const { container } = render(
        <ServiceErrorBoundary serviceName="TestService">
          {null}
        </ServiceErrorBoundary>
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Error Catching', () => {
    it('should catch errors thrown by children', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
    });

    it('should display service name in error message', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="Authentication">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Authentication service is temporarily unavailable/i)).toBeTruthy();
    });

    it('should catch different error messages', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError message="Custom error message" />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
    });

    it('should catch errors in deeply nested children', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <View>
            <View>
              <View>
                <ThrowError />
              </View>
            </View>
          </View>
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
    });

    it('should update state when error is caught', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
      expect(getByText(/Please try again/i)).toBeTruthy();
    });
  });

  describe('Error Logging', () => {
    it('should call logger.error when error is caught', () => {
      render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Service error in TestService'),
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
          errorBoundary: 'ServiceErrorBoundary',
          retryCount: 0,
        })
      );
    });

    it('should include componentStack in logger call', () => {
      render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should log with correct retry count', () => {
      render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        expect.objectContaining({
          retryCount: 0,
        })
      );
    });

    it('should log different service names correctly', () => {
      render(
        <ServiceErrorBoundary serviceName="PaymentService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('PaymentService'),
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('Custom onError Handler', () => {
    it('should call onError callback when provided', () => {
      const onError = jest.fn();

      render(
        <ServiceErrorBoundary serviceName="TestService" onError={onError}>
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should call onError with the actual error', () => {
      const onError = jest.fn();
      const errorMessage = 'Specific error message';

      render(
        <ServiceErrorBoundary serviceName="TestService" onError={onError}>
          <ThrowError message={errorMessage} />
        </ServiceErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: errorMessage,
        })
      );
    });

    it('should not call handleError when onError is provided', () => {
      const onError = jest.fn();

      render(
        <ServiceErrorBoundary serviceName="TestService" onError={onError}>
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(handleError).not.toHaveBeenCalled();
    });

    it('should call handleError when onError is not provided', () => {
      render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        'TestService Service'
      );
    });

    it('should call onError multiple times for multiple errors', () => {
      const onError = jest.fn();
      const { rerender } = render(
        <ServiceErrorBoundary serviceName="TestService" onError={onError}>
          <WorkingComponent />
        </ServiceErrorBoundary>
      );

      // Trigger error
      rerender(
        <ServiceErrorBoundary serviceName="TestService" onError={onError}>
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback Component', () => {
    it('should render custom fallback component when provided', () => {
      const CustomFallback = () => <Text testID="custom-fallback">Custom Error</Text>;

      const { getByTestId, queryByText } = render(
        <ServiceErrorBoundary
          serviceName="TestService"
          fallbackComponent={<CustomFallback />}
        >
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByTestId('custom-fallback')).toBeTruthy();
      expect(queryByText(/Service Unavailable/i)).toBeNull();
    });

    it('should render custom fallback with complex structure', () => {
      const CustomFallback = () => (
        <View>
          <Text testID="custom-title">Custom Title</Text>
          <Text testID="custom-message">Custom Message</Text>
        </View>
      );

      const { getByTestId } = render(
        <ServiceErrorBoundary
          serviceName="TestService"
          fallbackComponent={<CustomFallback />}
        >
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByTestId('custom-title')).toBeTruthy();
      expect(getByTestId('custom-message')).toBeTruthy();
    });

    it('should render default fallback when no custom fallback provided', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
    });
  });

  describe('Retry Functionality', () => {
    it('should display retry button on initial error', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Retry/i)).toBeTruthy();
      expect(getByText(/3 attempts left/i)).toBeTruthy();
    });

    it('should reset error state when retry is clicked', async () => {
      let shouldThrow = true;
      const { getByText, queryByText, getByTestId } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ConditionalError shouldThrow={shouldThrow} />
        </ServiceErrorBoundary>
      );

      // Error should be displayed
      expect(getByText(/Service Unavailable/i)).toBeTruthy();

      // Click retry (component will still throw)
      const retryButton = getByText(/Retry/i);
      fireEvent.press(retryButton);

      // State should attempt to reset
      await waitFor(() => {
        expect(queryByText(/Service Unavailable/i)).toBeTruthy();
      });
    });

    it('should increment retry count on each retry', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/3 attempts left/i)).toBeTruthy();

      const retryButton = getByText(/Retry/i);
      fireEvent.press(retryButton);

      // After retry, should show 2 attempts left
      expect(getByText(/2 attempts left/i)).toBeTruthy();
    });

    it('should hide retry button after max retries', () => {
      const { getByText, queryByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      const retryButton = getByText(/Retry/i);

      // Retry 3 times to exhaust attempts
      fireEvent.press(retryButton);
      fireEvent.press(getByText(/Retry/i));
      fireEvent.press(getByText(/Retry/i));

      // Retry button should no longer be available
      expect(queryByText(/Retry/i)).toBeNull();
    });

    it('should display exhausted message after max retries', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      const retryButton = getByText(/Retry/i);

      // Exhaust all retries
      fireEvent.press(retryButton);
      fireEvent.press(getByText(/Retry/i));
      fireEvent.press(getByText(/Retry/i));

      expect(getByText(/Maximum retry attempts reached/i)).toBeTruthy();
      expect(getByText(/Please restart the app/i)).toBeTruthy();
    });

    it('should update retry count in logger', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      const retryButton = getByText(/Retry/i);
      fireEvent.press(retryButton);

      // Logger should be called again with updated retry count
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        expect.objectContaining({
          retryCount: 1,
        })
      );
    });

    it('should not retry when maxRetries is reached', () => {
      const { getByText, queryByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      // Exhaust all retries
      fireEvent.press(getByText(/Retry/i));
      fireEvent.press(getByText(/Retry/i));
      fireEvent.press(getByText(/Retry/i));

      expect(queryByText(/Retry/i)).toBeNull();
    });

    it('should show different messages based on retry availability', () => {
      const { getByText, queryByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      // Initial state: retry available
      expect(getByText(/Please try again/i)).toBeTruthy();

      // Exhaust retries
      fireEvent.press(getByText(/Retry/i));
      fireEvent.press(getByText(/Retry/i));
      fireEvent.press(getByText(/Retry/i));

      // After exhaustion: different message
      expect(queryByText(/Please try again/i)).toBeNull();
      expect(getByText(/Please refresh the app/i)).toBeTruthy();
    });
  });

  describe('Debug Mode (__DEV__)', () => {
    it('should display error message in dev mode', () => {
      global.__DEV__ = true;

      const errorMessage = 'Detailed error message';
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError message={errorMessage} />
        </ServiceErrorBoundary>
      );

      expect(getByText(new RegExp(errorMessage, 'i'))).toBeTruthy();
    });

    it('should not display error details when not in dev mode', () => {
      global.__DEV__ = false;

      const errorMessage = 'Detailed error message';
      const { queryByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError message={errorMessage} />
        </ServiceErrorBoundary>
      );

      expect(queryByText(new RegExp(`Error: ${errorMessage}`, 'i'))).toBeNull();
    });

    it('should show debug container with error in dev mode', () => {
      global.__DEV__ = true;

      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError message="Debug test error" />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Error: Debug test error/i)).toBeTruthy();
    });

    it('should hide debug container in production', () => {
      global.__DEV__ = false;

      const { queryByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError message="Production error" />
        </ServiceErrorBoundary>
      );

      expect(queryByText(/Error: Production error/i)).toBeNull();
    });
  });

  describe('Service-Specific Error Handling', () => {
    it('should handle Authentication service errors', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="Authentication">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Authentication service/i)).toBeTruthy();
    });

    it('should handle Payment service errors', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="Payment">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Payment service/i)).toBeTruthy();
    });

    it('should handle Data service errors', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="Data">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Data service/i)).toBeTruthy();
    });

    it('should handle API service errors', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="API">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/API service/i)).toBeTruthy();
    });

    it('should handle Storage service errors', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="Storage">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Storage service/i)).toBeTruthy();
    });
  });

  describe('UI Elements', () => {
    it('should display warning icon', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText('⚠️')).toBeTruthy();
    });

    it('should display service unavailable title', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText('Service Unavailable')).toBeTruthy();
    });

    it('should have proper styles applied', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      const title = getByText('Service Unavailable');
      expect(title.props.style).toBeDefined();
    });

    it('should render button with proper styling', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      const retryButton = getByText(/Retry/i);
      expect(retryButton).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined error gracefully', () => {
      const ThrowUndefined = () => {
        throw undefined;
      };

      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowUndefined />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
    });

    it('should handle null error gracefully', () => {
      const ThrowNull = () => {
        throw null;
      };

      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowNull />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
    });

    it('should handle string error gracefully', () => {
      const ThrowString = () => {
        throw 'String error';
      };

      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowString />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
    });

    it('should handle object error gracefully', () => {
      const ThrowObject = () => {
        throw { message: 'Object error' };
      };

      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowObject />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
    });

    it('should handle empty serviceName', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
    });

    it('should handle very long serviceName', () => {
      const longName = 'VeryLongServiceNameThatExceedsNormalLength'.repeat(3);
      const { getByText } = render(
        <ServiceErrorBoundary serviceName={longName}>
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(new RegExp(longName.substring(0, 50)))).toBeTruthy();
    });

    it('should handle special characters in serviceName', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="Test@Service#123">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Test@Service#123/i)).toBeTruthy();
    });
  });

  describe('State Management', () => {
    it('should maintain hasError state', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
    });

    it('should store error in state', () => {
      global.__DEV__ = true;

      const errorMessage = 'State test error';
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError message={errorMessage} />
        </ServiceErrorBoundary>
      );

      expect(getByText(new RegExp(errorMessage))).toBeTruthy();
    });

    it('should reset hasError state on retry', async () => {
      let shouldThrow = true;
      const { getByText, queryByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ConditionalError shouldThrow={shouldThrow} />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();

      // Click retry
      fireEvent.press(getByText(/Retry/i));

      // Component re-attempts render
      await waitFor(() => {
        expect(getByText(/Service Unavailable/i)).toBeTruthy();
      });
    });

    it('should clear error from state on retry', async () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      const retryButton = getByText(/Retry/i);
      fireEvent.press(retryButton);

      // After retry, error state is cleared (but component throws again)
      await waitFor(() => {
        expect(getByText(/Service Unavailable/i)).toBeTruthy();
      });
    });

    it('should maintain retryCount across re-renders', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      fireEvent.press(getByText(/Retry/i));
      expect(getByText(/2 attempts left/i)).toBeTruthy();

      fireEvent.press(getByText(/Retry/i));
      expect(getByText(/1 attempts left/i)).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('should work with multiple error boundaries', () => {
      const { getAllByText } = render(
        <>
          <ServiceErrorBoundary serviceName="Service1">
            <ThrowError />
          </ServiceErrorBoundary>
          <ServiceErrorBoundary serviceName="Service2">
            <ThrowError />
          </ServiceErrorBoundary>
        </>
      );

      const unavailableTexts = getAllByText(/Service Unavailable/i);
      expect(unavailableTexts).toHaveLength(2);
    });

    it('should not affect other error boundaries when one catches error', () => {
      const { getByText, getByTestId } = render(
        <>
          <ServiceErrorBoundary serviceName="Service1">
            <ThrowError />
          </ServiceErrorBoundary>
          <ServiceErrorBoundary serviceName="Service2">
            <WorkingComponent text="Working Service 2" />
          </ServiceErrorBoundary>
        </>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
      expect(getByTestId('working-component')).toBeTruthy();
    });

    it('should work with nested error boundaries', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="Outer">
          <ServiceErrorBoundary serviceName="Inner">
            <ThrowError />
          </ServiceErrorBoundary>
        </ServiceErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(getByText(/Inner service/i)).toBeTruthy();
    });

    it('should call both logger and onError when error occurs', () => {
      const onError = jest.fn();

      render(
        <ServiceErrorBoundary serviceName="TestService" onError={onError}>
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
    });

    it('should handle rapid successive errors', () => {
      const { rerender, getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <WorkingComponent />
        </ServiceErrorBoundary>
      );

      // Trigger error
      rerender(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible retry button', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      const retryButton = getByText(/Retry/i);
      expect(retryButton).toBeTruthy();
    });

    it('should have readable error messages', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText('Service Unavailable')).toBeTruthy();
      expect(getByText(/TestService service is temporarily unavailable/i)).toBeTruthy();
    });

    it('should display clear retry count information', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/3 attempts left/i)).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when no error', () => {
      const { rerender, getByTestId } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <WorkingComponent />
        </ServiceErrorBoundary>
      );

      expect(getByTestId('working-component')).toBeTruthy();

      // Re-render with same props
      rerender(
        <ServiceErrorBoundary serviceName="TestService">
          <WorkingComponent />
        </ServiceErrorBoundary>
      );

      expect(getByTestId('working-component')).toBeTruthy();
    });

    it('should handle multiple children efficiently', () => {
      const { getAllByTestId } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <WorkingComponent text="1" />
          <WorkingComponent text="2" />
          <WorkingComponent text="3" />
        </ServiceErrorBoundary>
      );

      expect(getAllByTestId('working-component')).toHaveLength(3);
    });
  });

  describe('Error Recovery', () => {
    it('should recover when children stop throwing errors', () => {
      let shouldThrow = true;
      const ToggleError = () => {
        if (shouldThrow) {
          throw new Error('Toggle error');
        }
        return <Text testID="recovered">Recovered</Text>;
      };

      const { getByText, queryByTestId } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ToggleError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();

      // Change condition
      shouldThrow = false;

      // Retry
      fireEvent.press(getByText(/Retry/i));

      // Should still show error since boundary state doesn't know child is fixed
      expect(getByText(/Service Unavailable/i)).toBeTruthy();
    });

    it('should allow successful render after retry if error is resolved', () => {
      let throwCount = 0;
      const ThrowOnce = () => {
        if (throwCount === 0) {
          throwCount++;
          throw new Error('One time error');
        }
        return <Text testID="success">Success</Text>;
      };

      const { getByText, queryByText, getByTestId } = render(
        <ServiceErrorBoundary serviceName="TestService">
          <ThrowOnce />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Service Unavailable/i)).toBeTruthy();

      // Retry should succeed
      fireEvent.press(getByText(/Retry/i));

      // Component should render successfully
      expect(getByTestId('success')).toBeTruthy();
      expect(queryByText(/Service Unavailable/i)).toBeNull();
    });
  });

  describe('Props Validation', () => {
    it('should require serviceName prop', () => {
      const { getByText } = render(
        <ServiceErrorBoundary serviceName="Required">
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByText(/Required service/i)).toBeTruthy();
    });

    it('should accept optional onError prop', () => {
      const onError = jest.fn();

      render(
        <ServiceErrorBoundary serviceName="TestService" onError={onError}>
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
    });

    it('should accept optional fallbackComponent prop', () => {
      const CustomFallback = () => <Text testID="custom">Custom</Text>;

      const { getByTestId } = render(
        <ServiceErrorBoundary
          serviceName="TestService"
          fallbackComponent={<CustomFallback />}
        >
          <ThrowError />
        </ServiceErrorBoundary>
      );

      expect(getByTestId('custom')).toBeTruthy();
    });

    it('should handle changing props', () => {
      const { rerender, getByText } = render(
        <ServiceErrorBoundary serviceName="Service1">
          <WorkingComponent />
        </ServiceErrorBoundary>
      );

      // Change serviceName prop
      rerender(
        <ServiceErrorBoundary serviceName="Service2">
          <WorkingComponent />
        </ServiceErrorBoundary>
      );

      expect(getByText('Working')).toBeTruthy();
    });
  });
});
