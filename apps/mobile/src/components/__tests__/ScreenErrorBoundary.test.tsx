import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '../../__tests__/test-utils';
import { ScreenErrorBoundary } from '../ScreenErrorBoundary';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// The boundary recovers via safeNavigate(navigationRef). Mock the ref module so
// the Go back / Go to Home buttons have a navigation target in tests.
const mockSafeNavigate = jest.fn(() => true);
jest.mock('../../navigation/navigationRef', () => ({
  safeNavigate: (...args: unknown[]) => mockSafeNavigate(...args),
  navigationRef: { isReady: () => true, navigate: jest.fn() },
}));

describe('ScreenErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });
  afterEach(() => {
    jest.clearAllMocks();
    console.error = originalConsoleError;
  });

  it('should render children when no error occurs', () => {
    const { getByText } = render(
      <ScreenErrorBoundary screenName='JobsList'>
        <Text>Screen content</Text>
      </ScreenErrorBoundary>
    );

    expect(getByText('Screen content')).toBeTruthy();
  });

  it('should not render the fallback UI while healthy', () => {
    const { queryByText } = render(
      <ScreenErrorBoundary screenName='JobsList'>
        <Text>Healthy</Text>
      </ScreenErrorBoundary>
    );

    expect(queryByText('Screen Error')).toBeNull();
  });

  it('should catch errors and display fallback UI with the screen name', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const { getByText } = render(
      <ScreenErrorBoundary screenName='JobsList'>
        <ThrowError />
      </ScreenErrorBoundary>
    );

    expect(getByText('Screen Error')).toBeTruthy();
    expect(getByText('The JobsList screen encountered an error')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('should reset to children when Retry is pressed after recovery', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <Text>Recovered content</Text>;
    };

    const { getByText, rerender } = render(
      <ScreenErrorBoundary screenName='JobsList'>
        <ThrowError shouldThrow={true} />
      </ScreenErrorBoundary>
    );

    expect(getByText('Retry')).toBeTruthy();

    fireEvent.press(getByText('Retry'));

    rerender(
      <ScreenErrorBoundary screenName='JobsList'>
        <ThrowError shouldThrow={false} />
      </ScreenErrorBoundary>
    );

    expect(getByText('Recovered content')).toBeTruthy();
  });

  it('should navigate via safeNavigate when the fallback Go back button is pressed', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const { getByText } = render(
      <ScreenErrorBoundary screenName='JobDetails' fallbackRoute='JobsList'>
        <ThrowError />
      </ScreenErrorBoundary>
    );

    fireEvent.press(getByText('Go back'));

    expect(mockSafeNavigate).toHaveBeenCalledWith('JobsList');
  });
});
