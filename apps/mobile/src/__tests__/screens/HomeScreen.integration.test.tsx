import React from 'react';
import { render } from '../test-utils';

// ---------------------------------------------------------------------------
// Realigned 2026-06-03 to the Mint Editorial v2 architecture.
//
// `HomeScreen` is a thin role-router (loading gate + Homeowner/Contractor
// dashboard delegation). The dashboards now own React Query, Reanimated,
// Supabase and the service stack, so they are stubbed here — this suite proves
// the router renders the `home-screen` container and selects the right
// dashboard per role. The greeting copy ("Good morning, <name>") and the
// `home-scroll-view` now live inside the dashboard components and are covered
// by their own suites.
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    setOptions: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
  useRoute: () => ({ params: {} }),
}));

jest.mock('../../screens/home/HomeownerDashboard', () => {
  const { Text } = require('react-native');
  return {
    HomeownerDashboard: () => (
      <Text testID='homeowner-dashboard'>Homeowner</Text>
    ),
  };
});
jest.mock('../../screens/home/ContractorDashboard', () => {
  const { Text } = require('react-native');
  return {
    ContractorDashboard: () => (
      <Text testID='contractor-dashboard'>Contractor</Text>
    ),
  };
});
jest.mock('../../screens/home/HomeScreenLoading', () => {
  const { Text } = require('react-native');
  return {
    HomeScreenLoading: () => <Text testID='home-loading'>Loading</Text>,
  };
});

import { HomeScreen } from '../../screens/home';

const { useAuth } = require('../../contexts/AuthContext');

const baseAuth = {
  loading: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
  updateProfile: jest.fn(),
  signInWithBiometrics: jest.fn(),
  isBiometricAvailable: jest.fn(),
  isBiometricEnabled: jest.fn(),
  enableBiometric: jest.fn(),
  disableBiometric: jest.fn(),
  session: null,
};

describe('HomeScreen Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the homeowner dashboard for a homeowner', () => {
    useAuth.mockReturnValue({
      ...baseAuth,
      user: {
        id: '1',
        email: 'homeowner@test.com',
        role: 'homeowner',
        first_name: 'John',
        last_name: 'Homeowner',
      },
    });

    const { getByTestId } = render(<HomeScreen />);

    expect(getByTestId('home-screen')).toBeTruthy();
    expect(getByTestId('homeowner-dashboard')).toBeTruthy();
  });

  it('renders the contractor dashboard for a contractor', () => {
    useAuth.mockReturnValue({
      ...baseAuth,
      user: {
        id: '2',
        email: 'contractor@test.com',
        role: 'contractor',
        first_name: 'Jane',
        last_name: 'Contractor',
      },
    });

    const { getByTestId } = render(<HomeScreen />);

    expect(getByTestId('home-screen')).toBeTruthy();
    expect(getByTestId('contractor-dashboard')).toBeTruthy();
  });

  it('renders the container (homeowner fallback) when no user is present', () => {
    useAuth.mockReturnValue({
      ...baseAuth,
      user: null,
    });

    const { getByTestId } = render(<HomeScreen />);

    // No user + not loading -> container renders with the least-privileged view.
    expect(getByTestId('home-screen')).toBeTruthy();
    expect(getByTestId('homeowner-dashboard')).toBeTruthy();
  });

  it('exposes the home-screen container test id for interactions', () => {
    useAuth.mockReturnValue({
      ...baseAuth,
      user: {
        id: '2',
        email: 'contractor@test.com',
        role: 'contractor',
        first_name: 'Jane',
        last_name: 'Contractor',
      },
    });

    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('home-screen')).toBeTruthy();
  });
});
