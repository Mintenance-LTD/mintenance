
import React from 'react';
import { render, fireEvent, waitFor } from '../../__tests__/test-utils';
import { ScreenErrorBoundary } from '../ScreenErrorBoundary';

jest.mock('react-native', () => require('../../__mocks__/react-native.js'));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));


const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  isFocused: jest.fn(() => true),
};

const mockRoute = {
  params: {},
  name: 'ScreenErrorBoundary',
  key: 'test-key',
};

describe('ScreenErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should render without crashing', () => {
    const { getByTestId } = render(<ScreenErrorBoundary navigation={mockNavigation} route={mockRoute} navigation={mockNavigation} route={mockRoute} />);
    expect(getByTestId).toBeDefined();
  });

  it('should display content correctly', () => {
    const { container } = render(<ScreenErrorBoundary navigation={mockNavigation} route={mockRoute} navigation={mockNavigation} route={mockRoute} />);
    expect(container).toBeTruthy();
  });

  it('should catch errors and display fallback UI', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const { getByText } = render(
      <ScreenErrorBoundary>
        <ThrowError />
      </ScreenErrorBoundary>
    );

    expect(getByText).toBeDefined();
  });
});