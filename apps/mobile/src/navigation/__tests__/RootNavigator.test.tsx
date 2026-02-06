import React from 'react';

import RootNavigator from '../RootNavigator';

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  }),
}));
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  }),
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('../../components/ErrorBoundaryProvider', () => ({
  AppErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
  withScreenErrorBoundary: (Component: React.ComponentType) => Component,
}));
jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({ buttonPress: jest.fn() }),
}));
jest.mock('../../screens/HomeScreen', () => () => null);
jest.mock('../../screens/ContractorSocialScreen', () => () => null);
jest.mock('../navigators/AuthNavigator', () => () => null);
jest.mock('../navigators/JobsNavigator', () => () => null);
jest.mock('../navigators/MessagingNavigator', () => () => null);
jest.mock('../navigators/ProfileNavigator', () => () => null);
jest.mock('../navigators/ModalNavigator', () => () => null);
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));
jest.mock('../../utils/performanceMonitor', () => ({
  performanceMonitor: {
    recordMemoryUsage: jest.fn(),
    recordStartupTime: jest.fn(),
    recordNavigationTime: jest.fn(),
  },
  default: {
    recordMemoryUsage: jest.fn(),
    recordStartupTime: jest.fn(),
    recordNavigationTime: jest.fn(),
  },
}));

describe('RootNavigator', () => {
  it('exports a component', () => {
    expect(typeof RootNavigator).toBe('function');
  });
});
