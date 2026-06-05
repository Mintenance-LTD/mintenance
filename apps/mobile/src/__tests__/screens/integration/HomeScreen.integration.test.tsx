import React from 'react';
import { render } from '../test-utils';

// ---------------------------------------------------------------------------
// Realigned 2026-06-03 to the Mint Editorial v2 architecture.
//
// This suite previously assumed a monolithic HomeScreen that read the session
// from `AuthService.getCurrentUser`, fetched jobs via
// `JobService.getJobsByHomeowner`, and owned the welcome banner, the job list,
// the empty state and the post/find-job CTAs. That screen no longer exists:
// HomeScreen is now a thin role-router driven by the `useAuth` context that
// delegates to `HomeownerDashboard` / `ContractorDashboard`. The job list,
// empty state, refresh and CTAs moved into the dashboard sub-components (each
// with their own suites). This suite now verifies the router contract: the
// `home-screen` container plus role-correct dashboard selection.
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../screens/home/HomeownerDashboard', () => {
  const { Text } = require('react-native');
  return {
    HomeownerDashboard: () => (
      <Text testID='homeowner-dashboard'>Homeowner</Text>
    ),
  };
});
jest.mock('../../../screens/home/ContractorDashboard', () => {
  const { Text } = require('react-native');
  return {
    ContractorDashboard: () => (
      <Text testID='contractor-dashboard'>Contractor</Text>
    ),
  };
});
jest.mock('../../../screens/home/HomeScreenLoading', () => {
  const { Text } = require('react-native');
  return {
    HomeScreenLoading: () => <Text testID='home-loading'>Loading</Text>,
  };
});

import { HomeScreen } from '../../../screens/home';

const { useAuth } = require('../../../contexts/AuthContext');

const baseAuth = {
  loading: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
  signInWithBiometrics: jest.fn(),
  isBiometricAvailable: jest.fn(),
  isBiometricEnabled: jest.fn(),
  enableBiometric: jest.fn(),
  disableBiometric: jest.fn(),
};

describe('HomeScreen Integration - Comprehensive (role router)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      ...baseAuth,
      user: {
        id: 'user_123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner',
      },
    });
  });

  it('renders the home-screen container', () => {
    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('routes a homeowner to the homeowner dashboard', () => {
    const { getByTestId, queryByTestId } = render(<HomeScreen />);
    expect(getByTestId('homeowner-dashboard')).toBeTruthy();
    expect(queryByTestId('contractor-dashboard')).toBeNull();
  });

  it('routes a contractor to the contractor dashboard', () => {
    useAuth.mockReturnValue({
      ...baseAuth,
      user: {
        id: 'user_123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'contractor',
      },
    });

    const { getByTestId, queryByTestId } = render(<HomeScreen />);
    expect(getByTestId('contractor-dashboard')).toBeTruthy();
    expect(queryByTestId('homeowner-dashboard')).toBeNull();
  });

  it('falls back to the homeowner view when there is no user', () => {
    useAuth.mockReturnValue({ ...baseAuth, user: null });

    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('home-screen')).toBeTruthy();
    expect(getByTestId('homeowner-dashboard')).toBeTruthy();
  });

  it('shows the loading view while a contractor session loads', () => {
    useAuth.mockReturnValue({
      ...baseAuth,
      user: { id: 'user_123', role: 'contractor' },
      loading: true,
    });

    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('home-loading')).toBeTruthy();
  });
});
