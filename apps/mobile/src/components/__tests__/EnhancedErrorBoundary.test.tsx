import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, waitFor } from '../../__tests__/test-utils';
import { EnhancedErrorBoundary } from '../EnhancedErrorBoundary';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('EnhancedErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    expect(() =>
      render(
        <EnhancedErrorBoundary>
          <Text>OK</Text>
        </EnhancedErrorBoundary>
      )
    ).not.toThrow();
  });

  it('should render children when no error occurs', () => {
    const { getByText } = render(
      <EnhancedErrorBoundary>
        <Text>Boundary child content</Text>
      </EnhancedErrorBoundary>
    );
    expect(getByText('Boundary child content')).toBeTruthy();
  });

  it('should catch errors and display fallback UI', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const { getByTestId } = render(
      <EnhancedErrorBoundary>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    expect(getByTestId('enhanced-error-boundary')).toBeTruthy();
  });
});
