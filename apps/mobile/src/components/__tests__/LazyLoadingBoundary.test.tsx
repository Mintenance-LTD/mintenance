import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '../../__tests__/test-utils';
import { LazyLoadingBoundary } from '../LazyLoadingBoundary';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('LazyLoadingBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });
  afterEach(() => {
    jest.clearAllMocks();
    console.error = originalConsoleError;
  });

  it('should render without crashing', () => {
    expect(() =>
      render(
        <LazyLoadingBoundary>
          <Text>Lazy child</Text>
        </LazyLoadingBoundary>
      )
    ).not.toThrow();
  });

  it('should render children when loaded', () => {
    const { getByText } = render(
      <LazyLoadingBoundary>
        <Text>Loaded content</Text>
      </LazyLoadingBoundary>
    );

    expect(getByText('Loaded content')).toBeTruthy();
  });

  it('should show loading fallback while a lazy child suspends', async () => {
    // A lazy component whose import never resolves keeps Suspense pending so the
    // default fallback ("Loading...") stays mounted.
    const NeverResolves = React.lazy(() => new Promise(() => {}));

    const { getByText } = render(
      <LazyLoadingBoundary>
        <NeverResolves />
      </LazyLoadingBoundary>
    );

    await waitFor(() => {
      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  it('should show error fallback when a child throws during render', () => {
    const ThrowError = () => {
      throw new Error('Chunk load failed');
    };

    const { getByText } = render(
      <LazyLoadingBoundary chunkName='DashboardScreen'>
        <ThrowError />
      </LazyLoadingBoundary>
    );

    expect(getByText('Loading Failed')).toBeTruthy();
    expect(getByText('Failed to load DashboardScreen')).toBeTruthy();
    expect(getByText('Chunk load failed')).toBeTruthy();
  });
});
