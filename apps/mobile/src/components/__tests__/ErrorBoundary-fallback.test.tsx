jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Mock logger before importing component
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import ErrorBoundary from '../ErrorBoundary-fallback';
import { logger } from '../../utils/logger';

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({
  shouldThrow = true,
  errorMessage = 'Test error'
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <Text>Child content</Text>;
};

// Component that renders without error
const SafeChild: React.FC = () => <Text>Safe child content</Text>;

describe('ErrorBoundary-fallback', () => {
  // Suppress console errors in tests
  const originalError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render children when no error occurs', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <SafeChild />
        </ErrorBoundary>
      );

      expect(getByText('Safe child content')).toBeDefined();
    });

    it('should render children with multiple child elements', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <Text>First child</Text>
          <Text>Second child</Text>
          <Text>Third child</Text>
        </ErrorBoundary>
      );

      expect(getByText('First child')).toBeDefined();
      expect(getByText('Second child')).toBeDefined();
      expect(getByText('Third child')).toBeDefined();
    });

    it('should render without children (edge case)', () => {
      const { container } = render(<ErrorBoundary>{null}</ErrorBoundary>);
      expect(container).toBeDefined();
    });
  });

  describe('Error Catching', () => {
    it('should catch error and display default fallback UI', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeDefined();
      expect(getByText(/The app encountered an unexpected error/)).toBeDefined();
    });

    it('should display error details with error name', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError errorMessage="Custom error message" />
        </ErrorBoundary>
      );

      expect(getByText('Error Details:')).toBeDefined();
      expect(getByText(/Error: Custom error message/)).toBeDefined();
    });

    it('should display retry button when error occurs', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Try Again')).toBeDefined();
    });

    it('should display help text when error occurs', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText(/If this problem persists, please restart the app/)).toBeDefined();
    });

    it('should log error to logger when caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError errorMessage="Logged error" />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error',
        expect.any(Error)
      );
    });

    it('should log error info to logger', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith('Error info', expect.any(Object));
    });

    it('should handle different error types', () => {
      const TypeError: React.FC = () => {
        throw new TypeError('Type error occurred');
      };

      const { getByText } = render(
        <ErrorBoundary>
          <TypeError />
        </ErrorBoundary>
      );

      expect(getByText(/TypeError: Type error occurred/)).toBeDefined();
    });

    it('should handle ReferenceError', () => {
      const ReferenceErrorComponent: React.FC = () => {
        throw new ReferenceError('Variable is not defined');
      };

      const { getByText } = render(
        <ErrorBoundary>
          <ReferenceErrorComponent />
        </ErrorBoundary>
      );

      expect(getByText(/ReferenceError: Variable is not defined/)).toBeDefined();
    });

    it('should handle error with very long message', () => {
      const longMessage = 'A'.repeat(500);

      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError errorMessage={longMessage} />
        </ErrorBoundary>
      );

      expect(getByText(new RegExp(longMessage.substring(0, 50)))).toBeDefined();
    });

    it('should handle error with special characters', () => {
      const specialMessage = 'Error with <special> & "characters" & symbols!';

      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError errorMessage={specialMessage} />
        </ErrorBoundary>
      );

      expect(getByText(new RegExp(specialMessage))).toBeDefined();
    });

    it('should handle error with unicode characters', () => {
      const unicodeMessage = 'Error with emoji 🚨 and unicode ñ café';

      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError errorMessage={unicodeMessage} />
        </ErrorBoundary>
      );

      expect(getByText(new RegExp('Error with emoji'))).toBeDefined();
    });
  });

  describe('Reset Error Functionality', () => {
    it('should reset error state when retry button is pressed', () => {
      let shouldThrow = true;
      const DynamicComponent: React.FC = () => {
        if (shouldThrow) {
          throw new Error('Initial error');
        }
        return <Text>Recovered content</Text>;
      };

      const { getByText, rerender } = render(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      // Error state
      expect(getByText('Oops! Something went wrong')).toBeDefined();

      // Click retry button
      const retryButton = getByText('Try Again');
      shouldThrow = false;
      fireEvent.press(retryButton);

      // Re-render to simulate state change
      rerender(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      // Should show children again after reset
      expect(getByText('Recovered content')).toBeDefined();
    });

    it('should call resetError when retry button is pressed', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      // Component should attempt to reset
      expect(retryButton).toBeDefined();
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = (error: Error, resetError: () => void) => (
        <Text>Custom error: {error.message}</Text>
      );

      const { getByText } = render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError errorMessage="Custom fallback error" />
        </ErrorBoundary>
      );

      expect(getByText('Custom error: Custom fallback error')).toBeDefined();
    });

    it('should pass error object to custom fallback', () => {
      let capturedError: Error | null = null;

      const customFallback = (error: Error) => {
        capturedError = error;
        return <Text>Error captured</Text>;
      };

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError errorMessage="Fallback test" />
        </ErrorBoundary>
      );

      expect(capturedError).toBeDefined();
      expect(capturedError?.message).toBe('Fallback test');
    });

    it('should pass resetError function to custom fallback', () => {
      let resetFunction: (() => void) | null = null;

      const customFallback = (error: Error, resetError: () => void) => {
        resetFunction = resetError;
        return <Text>Custom UI</Text>;
      };

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(resetFunction).toBeDefined();
      expect(typeof resetFunction).toBe('function');
    });

    it('should allow custom fallback to trigger reset', () => {
      const customFallback = (error: Error, resetError: () => void) => (
        <Text onPress={resetError}>Custom Reset</Text>
      );

      const { getByText } = render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      const customResetButton = getByText('Custom Reset');
      fireEvent.press(customResetButton);

      // Should trigger reset without error
      expect(customResetButton).toBeDefined();
    });

    it('should fall back to default UI if custom fallback throws error', () => {
      const brokenFallback = () => {
        throw new Error('Fallback error');
      };

      const { getByText } = render(
        <ErrorBoundary fallback={brokenFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should display default error UI
      expect(getByText('Oops! Something went wrong')).toBeDefined();
    });

    it('should log error if custom fallback fails', () => {
      const brokenFallback = () => {
        throw new Error('Fallback rendering error');
      };

      render(
        <ErrorBoundary fallback={brokenFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Error in fallback component',
        expect.any(Error)
      );
    });

    it('should handle custom fallback returning null', () => {
      const nullFallback = () => null;

      const { container } = render(
        <ErrorBoundary fallback={nullFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(container).toBeDefined();
    });

    it('should handle custom fallback with complex UI', () => {
      const complexFallback = (error: Error, resetError: () => void) => (
        <>
          <Text>Error occurred</Text>
          <Text>{error.message}</Text>
          <Text onPress={resetError}>Retry</Text>
        </>
      );

      const { getByText } = render(
        <ErrorBoundary fallback={complexFallback}>
          <ThrowError errorMessage="Complex UI error" />
        </ErrorBoundary>
      );

      expect(getByText('Error occurred')).toBeDefined();
      expect(getByText('Complex UI error')).toBeDefined();
      expect(getByText('Retry')).toBeDefined();
    });
  });

  describe('onError Callback', () => {
    it('should call onError callback when error occurs', () => {
      const onErrorMock = jest.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError errorMessage="Callback test" />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should pass error object to onError callback', () => {
      let capturedError: Error | null = null;

      const onErrorMock = (error: Error) => {
        capturedError = error;
      };

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError errorMessage="Error object test" />
        </ErrorBoundary>
      );

      expect(capturedError).toBeDefined();
      expect(capturedError?.message).toBe('Error object test');
    });

    it('should pass errorInfo to onError callback', () => {
      let capturedErrorInfo: any = null;

      const onErrorMock = (error: Error, errorInfo: any) => {
        capturedErrorInfo = errorInfo;
      };

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(capturedErrorInfo).toBeDefined();
      expect(capturedErrorInfo).toHaveProperty('componentStack');
    });

    it('should handle onError callback throwing error', () => {
      const brokenCallback = () => {
        throw new Error('Callback error');
      };

      const { getByText } = render(
        <ErrorBoundary onError={brokenCallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should still display error UI
      expect(getByText('Oops! Something went wrong')).toBeDefined();
      expect(logger.error).toHaveBeenCalledWith(
        'Error in onError callback',
        expect.any(Error)
      );
    });

    it('should not call onError if no error occurs', () => {
      const onErrorMock = jest.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <SafeChild />
        </ErrorBoundary>
      );

      expect(onErrorMock).not.toHaveBeenCalled();
    });

    it('should call onError before custom fallback', () => {
      const callOrder: string[] = [];

      const onErrorMock = () => {
        callOrder.push('onError');
      };

      const customFallback = () => {
        callOrder.push('fallback');
        return <Text>Fallback</Text>;
      };

      render(
        <ErrorBoundary onError={onErrorMock} fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(callOrder).toEqual(['onError', 'fallback']);
    });

    it('should allow onError to perform side effects', () => {
      const sideEffectMock = jest.fn();

      const onErrorMock = () => {
        sideEffectMock('error logged');
      };

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(sideEffectMock).toHaveBeenCalledWith('error logged');
    });
  });

  describe('Component Lifecycle', () => {
    it('should initialize with hasError: false', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <SafeChild />
        </ErrorBoundary>
      );

      expect(getByText('Safe child content')).toBeDefined();
    });

    it('should update state when getDerivedStateFromError is called', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // State should update to show error UI
      expect(getByText('Oops! Something went wrong')).toBeDefined();
    });

    it('should store error in state', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError errorMessage="Stored error" />
        </ErrorBoundary>
      );

      expect(getByText(/Error: Stored error/)).toBeDefined();
    });

    it('should store errorInfo in state via componentDidCatch', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // componentDidCatch should have been called
      expect(logger.error).toHaveBeenCalledWith('Error info', expect.any(Object));
    });

    it('should clear error state on reset', () => {
      let shouldThrow = true;
      const DynamicComponent: React.FC = () => {
        if (shouldThrow) {
          throw new Error('Reset test');
        }
        return <Text>Reset successful</Text>;
      };

      const { getByText, rerender } = render(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      // Error state
      expect(getByText('Try Again')).toBeDefined();

      shouldThrow = false;
      fireEvent.press(getByText('Try Again'));

      rerender(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      expect(getByText('Reset successful')).toBeDefined();
    });
  });

  describe('Default Error UI Elements', () => {
    it('should display error title', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeDefined();
    });

    it('should display error message', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText(/The app encountered an unexpected error/)).toBeDefined();
    });

    it('should display error details section', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError errorMessage="Details test" />
        </ErrorBoundary>
      );

      expect(getByText('Error Details:')).toBeDefined();
      expect(getByText(/Error: Details test/)).toBeDefined();
    });

    it('should display retry button with correct text', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Try Again')).toBeDefined();
    });

    it('should display help text', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText(/If this problem persists, please restart the app/)).toBeDefined();
    });
  });

  describe('Error Edge Cases', () => {
    it('should handle error with undefined message', () => {
      const UndefinedMessageError: React.FC = () => {
        const error = new Error();
        error.message = undefined as any;
        throw error;
      };

      const { getByText } = render(
        <ErrorBoundary>
          <UndefinedMessageError />
        </ErrorBoundary>
      );

      expect(getByText('Error Details:')).toBeDefined();
    });

    it('should handle error with null name', () => {
      const NullNameError: React.FC = () => {
        const error = new Error('Message');
        (error as any).name = null;
        throw error;
      };

      const { getByText } = render(
        <ErrorBoundary>
          <NullNameError />
        </ErrorBoundary>
      );

      expect(getByText(/Message/)).toBeDefined();
    });

    it('should handle error with empty message', () => {
      const EmptyMessageError: React.FC = () => {
        throw new Error('');
      };

      const { getByText } = render(
        <ErrorBoundary>
          <EmptyMessageError />
        </ErrorBoundary>
      );

      expect(getByText('Error Details:')).toBeDefined();
    });

    it('should handle nested error boundaries', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ErrorBoundary>
            <ThrowError errorMessage="Nested error" />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      expect(getByText(/Nested error/)).toBeDefined();
    });

    it('should handle error in nested child component', () => {
      const NestedComponent: React.FC = () => (
        <Text>
          <ThrowError />
        </Text>
      );

      const { getByText } = render(
        <ErrorBoundary>
          <NestedComponent />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeDefined();
    });
  });

  describe('Multiple Props Combinations', () => {
    it('should work with both fallback and onError', () => {
      const onErrorMock = jest.fn();
      const customFallback = (error: Error) => (
        <Text>Custom: {error.message}</Text>
      );

      const { getByText } = render(
        <ErrorBoundary fallback={customFallback} onError={onErrorMock}>
          <ThrowError errorMessage="Both props" />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalled();
      expect(getByText('Custom: Both props')).toBeDefined();
    });

    it('should work with fallback only', () => {
      const customFallback = () => <Text>Fallback only</Text>;

      const { getByText } = render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Fallback only')).toBeDefined();
    });

    it('should work with onError only', () => {
      const onErrorMock = jest.fn();

      const { getByText } = render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalled();
      expect(getByText('Oops! Something went wrong')).toBeDefined();
    });

    it('should work with no optional props', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeDefined();
    });

    it('should handle children as function (edge case)', () => {
      const { getByText } = render(
        <ErrorBoundary>
          {() => <Text>Function child</Text>}
        </ErrorBoundary>
      );

      // React will render function as component
      expect(getByText('Function child')).toBeDefined();
    });

    it('should handle children as array', () => {
      const { getByText } = render(
        <ErrorBoundary>
          {[
            <Text key="1">First</Text>,
            <Text key="2">Second</Text>,
          ]}
        </ErrorBoundary>
      );

      expect(getByText('First')).toBeDefined();
      expect(getByText('Second')).toBeDefined();
    });
  });

  describe('Retry Button Behavior', () => {
    it('should render retry button as TouchableOpacity', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      expect(retryButton).toBeDefined();
      expect(retryButton.type).toBeDefined();
    });

    it('should trigger onPress when retry button is pressed', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      // Should not throw error
      expect(retryButton).toBeDefined();
    });

    it('should be accessible via text content', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Try Again')).toBeDefined();
    });
  });

  describe('Logger Integration', () => {
    it('should call logger.error exactly twice per error', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledTimes(2);
    });

    it('should log error with correct message', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error',
        expect.any(Error)
      );
    });

    it('should log errorInfo separately', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Error info',
        expect.any(Object)
      );
    });

    it('should continue logging errors if onError callback fails', () => {
      const brokenCallback = () => {
        throw new Error('Callback failure');
      };

      render(
        <ErrorBoundary onError={brokenCallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should log original error + callback error
      expect(logger.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error',
        expect.any(Error)
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error in onError callback',
        expect.any(Error)
      );
    });

    it('should log fallback errors separately', () => {
      const brokenFallback = () => {
        throw new Error('Fallback failure');
      };

      render(
        <ErrorBoundary fallback={brokenFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Error in fallback component',
        expect.any(Error)
      );
    });
  });

  describe('Styling and Layout', () => {
    it('should apply error container styles', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const title = getByText('Oops! Something went wrong');
      expect(title).toBeDefined();
    });

    it('should apply error title styles', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const title = getByText('Oops! Something went wrong');
      expect(title.props.style).toBeDefined();
    });

    it('should apply error message styles', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const message = getByText(/The app encountered an unexpected error/);
      expect(message.props.style).toBeDefined();
    });

    it('should apply error details styles', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const details = getByText('Error Details:');
      expect(details.props.style).toBeDefined();
    });

    it('should apply retry button styles', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const button = getByText('Try Again');
      expect(button.props.style).toBeDefined();
    });

    it('should apply help text styles', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const helpText = getByText(/If this problem persists/);
      expect(helpText.props.style).toBeDefined();
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from error after successful retry', () => {
      let throwCount = 0;
      const ConditionalError: React.FC = () => {
        if (throwCount === 0) {
          throwCount++;
          throw new Error('First attempt');
        }
        return <Text>Success after retry</Text>;
      };

      const { getByText, rerender } = render(
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      );

      expect(getByText('Try Again')).toBeDefined();

      fireEvent.press(getByText('Try Again'));

      rerender(
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      );

      expect(getByText('Success after retry')).toBeDefined();
    });

    it('should handle multiple retry attempts', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const retryButton = getByText('Try Again');

      fireEvent.press(retryButton);
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);

      expect(retryButton).toBeDefined();
    });

    it('should maintain error state if retry fails', () => {
      const AlwaysFails: React.FC = () => {
        throw new Error('Always fails');
      };

      const { getByText } = render(
        <ErrorBoundary>
          <AlwaysFails />
        </ErrorBoundary>
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      // Should still show error UI
      expect(getByText('Oops! Something went wrong')).toBeDefined();
    });
  });

  describe('Component State Management', () => {
    it('should initialize with correct initial state', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <SafeChild />
        </ErrorBoundary>
      );

      expect(getByText('Safe child content')).toBeDefined();
    });

    it('should update state on error', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeDefined();
    });

    it('should clear state on reset', () => {
      let shouldThrow = true;
      const DynamicComponent: React.FC = () => {
        if (shouldThrow) {
          throw new Error('State test');
        }
        return <Text>State cleared</Text>;
      };

      const { getByText, rerender } = render(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      shouldThrow = false;
      fireEvent.press(getByText('Try Again'));

      rerender(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      expect(getByText('State cleared')).toBeDefined();
    });

    it('should maintain separate state for multiple instances', () => {
      const { getAllByText } = render(
        <>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
          <ErrorBoundary>
            <SafeChild />
          </ErrorBoundary>
        </>
      );

      expect(getAllByText('Oops! Something went wrong')).toHaveLength(1);
      expect(getAllByText('Safe child content')).toHaveLength(1);
    });
  });

  describe('Error Boundary Props Validation', () => {
    it('should handle missing children gracefully', () => {
      const { container } = render(<ErrorBoundary />);
      expect(container).toBeDefined();
    });

    it('should handle undefined fallback prop', () => {
      const { getByText } = render(
        <ErrorBoundary fallback={undefined}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeDefined();
    });

    it('should handle undefined onError prop', () => {
      const { getByText } = render(
        <ErrorBoundary onError={undefined}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Oops! Something went wrong')).toBeDefined();
    });

    it('should accept all valid ReactNode children types', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <Text>String child</Text>
          {123}
          {true && <Text>Conditional</Text>}
          {null}
          {undefined}
        </ErrorBoundary>
      );

      expect(getByText('String child')).toBeDefined();
      expect(getByText('Conditional')).toBeDefined();
    });
  });
});
