import React from 'react';
import { Text } from 'react-native';
import { render } from '../test-utils';
import { useAuth } from '../../contexts/AuthContext';

// ---------------------------------------------------------------------------
// Realigned 2026-06-03 to the Mint Editorial v2 architecture.
//
// `HomeScreen` is now a thin role-router: it shows `HomeScreenLoading` while
// auth resolves and otherwise delegates to `HomeownerDashboard` /
// `ContractorDashboard`. The old monolithic HomeScreen (which owned the
// "Welcome back, <name>!" hero, the recent-jobs list, contractor stats and the
// empty/error states) no longer exists — that content moved into the dashboard
// sub-components, each with their own dedicated suites. This suite therefore
// verifies the router's contract: correct dashboard per role + the loading
// gate. The heavy dashboard subtrees (React Query, Reanimated, Supabase, the
// service stack) are mocked to lightweight stubs so we exercise routing intent
// without re-testing every child.
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../contexts/AuthContext');

// Stub the dashboards + loading view so HomeScreen routing is isolated.
jest.mock('../../screens/home/HomeownerDashboard', () => {
  const { Text: RNText } = require('react-native');
  return {
    HomeownerDashboard: () => (
      <RNText testID='homeowner-dashboard'>Homeowner Dashboard</RNText>
    ),
  };
});
jest.mock('../../screens/home/ContractorDashboard', () => {
  const { Text: RNText } = require('react-native');
  return {
    ContractorDashboard: () => (
      <RNText testID='contractor-dashboard'>Contractor Dashboard</RNText>
    ),
  };
});
jest.mock('../../screens/home/HomeScreenLoading', () => {
  const { Text: RNText } = require('react-native');
  return {
    HomeScreenLoading: () => <RNText testID='home-loading'>Loading…</RNText>,
  };
});

// Import after mocks so HomeScreen picks up the stubbed children.
import { HomeScreen } from '../../screens/home';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const baseAuth = {
  loading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  signInWithBiometrics: jest.fn(),
  isBiometricAvailable: jest.fn(),
  isBiometricEnabled: jest.fn(),
  enableBiometric: jest.fn(),
  disableBiometric: jest.fn(),
};

describe('HomeScreen (role router)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes a homeowner to the HomeownerDashboard', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      user: {
        id: 'user-1',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    } as unknown as ReturnType<typeof useAuth>);

    const { getByTestId, queryByTestId } = render(<HomeScreen />);

    expect(getByTestId('homeowner-dashboard')).toBeTruthy();
    expect(queryByTestId('contractor-dashboard')).toBeNull();
  });

  it('routes a contractor to the ContractorDashboard', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      user: {
        id: 'user-1',
        email: 'contractor@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'contractor',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    } as unknown as ReturnType<typeof useAuth>);

    const { getByTestId, queryByTestId } = render(<HomeScreen />);

    expect(getByTestId('contractor-dashboard')).toBeTruthy();
    expect(queryByTestId('homeowner-dashboard')).toBeNull();
  });

  it('falls back to the homeowner view for unknown roles', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        first_name: 'Ada',
        last_name: 'Min',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    } as unknown as ReturnType<typeof useAuth>);

    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('homeowner-dashboard')).toBeTruthy();
  });

  it('shows the loading view while a contractor session is still loading', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      user: {
        id: 'user-1',
        email: 'contractor@example.com',
        role: 'contractor',
      },
      loading: true,
    } as unknown as ReturnType<typeof useAuth>);

    const { getByTestId, queryByTestId } = render(<HomeScreen />);
    expect(getByTestId('home-loading')).toBeTruthy();
    expect(queryByTestId('contractor-dashboard')).toBeNull();
  });

  it('shows the loading view while auth resolves with no user yet', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      user: null,
      loading: true,
    } as unknown as ReturnType<typeof useAuth>);

    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('home-loading')).toBeTruthy();
  });
});
