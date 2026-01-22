
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import React from 'react';
import { render, fireEvent } from '../../test-utils';
import { ServiceAreasHeader } from '../ServiceAreasHeader';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => false),
  getParent: jest.fn(() => null),
  getState: jest.fn(() => ({ routes: [], index: 0 })),
};

describe('ServiceAreasHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { toJSON } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should display header title', () => {
    const { getByText } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
    expect(getByText('Service Areas')).toBeTruthy();
  });

  it('should call goBack when back button pressed', () => {
    const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
    // Find TouchableOpacity components
    const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
    // First touchable should be the back button
    if (touchables.length > 0) {
      fireEvent.press(touchables[0]);
      expect(mockNavigation.goBack).toHaveBeenCalled();
    }
  });
});
