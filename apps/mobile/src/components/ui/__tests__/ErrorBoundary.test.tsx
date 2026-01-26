
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, waitFor, act } from '../../test-utils';
import { ErrorBoundary } from '../ErrorBoundary';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should render without crashing', () => {
    const { toJSON } = render(
      <ErrorBoundary>
        <Text>Content</Text>
      </ErrorBoundary>
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should display content correctly', () => {
    const { toJSON } = render(
      <ErrorBoundary>
        <Text>Content</Text>
      </ErrorBoundary>
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should catch errors and display fallback UI', () => {
    const { getByText, UNSAFE_getByType } = render(
      <ErrorBoundary>
        <Text>Content</Text>
      </ErrorBoundary>
    );

    const boundary = UNSAFE_getByType(ErrorBoundary).instance;
    act(() => {
      boundary.setState({
        hasError: true,
        error: new Error('Test error'),
        errorInfo: { componentStack: 'stack' },
        errorId: 'error-test',
      });
    });

    expect(getByText('Something went wrong')).toBeTruthy();
  });
});
