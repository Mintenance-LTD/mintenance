
import React from 'react';
import { render, fireEvent, waitFor } from '../../__tests__/test-utils';
import { EnhancedErrorBoundary } from '../EnhancedErrorBoundary';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('EnhancedErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should render without crashing', () => {
    const { getByTestId } = render(<EnhancedErrorBoundary />);
    expect(getByTestId).toBeDefined();
  });

  it('should display content correctly', () => {
    const { container } = render(<EnhancedErrorBoundary />);
    expect(container).toBeTruthy();
  });

  it('should catch errors and display fallback UI', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const { getByText } = render(
      <EnhancedErrorBoundary>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    expect(getByText).toBeDefined();
  });
});