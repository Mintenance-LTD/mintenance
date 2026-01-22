
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import React from 'react';
import { render, fireEvent } from '../../test-utils';
import { ServiceAreasActions } from '../ServiceAreasActions';

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

describe('ServiceAreasActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { toJSON } = render(<ServiceAreasActions navigation={mockNavigation as any} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should display quick actions title', () => {
    const { getByText } = render(<ServiceAreasActions navigation={mockNavigation as any} />);
    expect(getByText('Quick Actions')).toBeTruthy();
  });

  it('should display action buttons', () => {
    const { getByText } = render(<ServiceAreasActions navigation={mockNavigation as any} />);
    expect(getByText('View Analytics')).toBeTruthy();
    expect(getByText('Route Planning')).toBeTruthy();
    expect(getByText('Coverage Map')).toBeTruthy();
  });

  it('should navigate to analytics on press', () => {
    const { getByText } = render(<ServiceAreasActions navigation={mockNavigation as any} />);
    fireEvent.press(getByText('View Analytics'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ServiceAreaAnalytics');
  });

  it('should navigate to coverage map on press', () => {
    const { getByText } = render(<ServiceAreasActions navigation={mockNavigation as any} />);
    fireEvent.press(getByText('Coverage Map'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CoverageMap');
  });
});
