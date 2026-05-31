import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor, act } from '../test-utils';
import { HomeScreen } from '../../screens/home';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/UserService';
import { JobService } from '../../services/JobService';
import { BidService } from '../../services/BidService';
import { NotificationService } from '../../services/NotificationService';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-task-manager pulls expo-modules-core's native EventEmitter, which is
// undefined under jest and crashes the whole import graph
// (ContractorDashboard → NextUpCard → JobContextLocationService →
// BackgroundLocationTask). Stub it out — none of these assertions exercise
// background location.
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
  unregisterAllTasksAsync: jest.fn(() => Promise.resolve()),
}));

// The Reanimated-backed animation primitives pull the real native module in
// jest (the repo's reanimated mock chokes on it). They're pure presentation
// wrappers — render children straight through so the dashboards mount.
jest.mock('../../components/animations/primitives', () => {
  const ReactActual = require('react');
  const pass = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  return {
    FadeIn: pass,
    SlideIn: pass,
    ScaleIn: pass,
    Pulse: pass,
    BouncyPress: pass,
  };
});

// Mock dependencies. The services expose their methods as static class
// fields / getters, which jest auto-mock does not reliably convert to
// jest.fn(). Provide explicit factories with the CURRENT method names the
// dashboards call.
jest.mock('../../contexts/AuthContext');
jest.mock('../../services/UserService', () => ({
  UserService: { getContractorStats: jest.fn() },
}));
jest.mock('../../services/JobService', () => ({
  JobService: { getUserJobs: jest.fn() },
}));
jest.mock('../../services/BidService', () => ({
  BidService: { getBidsByJobs: jest.fn() },
}));
jest.mock('../../services/NotificationService', () => ({
  NotificationService: { getUnreadCount: jest.fn() },
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    getParent: jest.fn(() => ({ navigate: jest.fn() })),
  }),
  useFocusEffect: jest.fn(),
}));

const mockUseAuth = jest.mocked(useAuth);
const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockJobService = JobService as jest.Mocked<typeof JobService>;
const mockBidService = BidService as jest.Mocked<typeof BidService>;
const mockNotificationService = NotificationService as jest.Mocked<
  typeof NotificationService
>;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  firstName: 'John',
  lastName: 'Doe',
  role: 'homeowner' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Each render needs a fresh QueryClient (the dashboards use @tanstack/react-query
// useQuery hooks). Retries off so rejected queries surface the error UI fast.
function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HomeScreen />
    </QueryClientProvider>
  );
}

describe('HomeScreen', () => {
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Pin the clock to a morning hour so the time-based greeting is
    // deterministic ("Good morning") regardless of when the suite runs.
    nowSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);

    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    // Homeowner dashboard data sources — default to empty so the calm/empty
    // surface renders without throwing.
    mockJobService.getUserJobs.mockResolvedValue([] as any);
    mockBidService.getBidsByJobs.mockResolvedValue([] as any);
    mockNotificationService.getUnreadCount.mockResolvedValue(0 as any);
    mockUserService.getContractorStats.mockResolvedValue({} as any);
  });

  afterEach(() => {
    nowSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('Homeowner View', () => {
    it('renders the brand, editorial greeting and headline', async () => {
      const { getByText } = renderHome();

      await waitFor(() => {
        expect(getByText('Mintenance')).toBeTruthy();
        // Greeting is a single Text node: "{greeting}, {userName}".
        expect(getByText('Good morning, John')).toBeTruthy();
        expect(getByText('Home, taken care of.')).toBeTruthy();
      });
    });

    it('shows the Quick post trade grid', async () => {
      const { getByText } = renderHome();

      await waitFor(() => {
        expect(getByText('Quick post')).toBeTruthy();
        expect(getByText('Plumbing')).toBeTruthy();
        expect(getByText('Electrical')).toBeTruthy();
      });
    });

    it('shows the Active Projects section', async () => {
      const { getByText } = renderHome();

      await waitFor(() => {
        expect(getByText('Active Projects')).toBeTruthy();
      });
    });
  });

  describe('Contractor View', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, role: 'contractor' },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
      });
    });

    it('shows the editorial greeting with the business name', async () => {
      mockUserService.getContractorStats.mockResolvedValue({} as any);

      const { getByText } = renderHome();

      await waitFor(() => {
        // ContractorDashboard greeting: "{getTimeGreeting()}, {businessName}"
        // businessName falls back to first + last name.
        expect(getByText('Good morning, John Doe')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error UI and retry button when contractor stats fail', async () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, role: 'contractor' },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
      });

      mockUserService.getContractorStats.mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = renderHome();

      await waitFor(() => {
        expect(getByText('Failed to load dashboard')).toBeTruthy();
        expect(getByText('Try Again')).toBeTruthy();
      });
    });
  });

  describe('Empty States', () => {
    it('shows the empty Active Projects state when the homeowner has no jobs', async () => {
      mockJobService.getUserJobs.mockResolvedValue([] as any);

      const { getByText } = renderHome();

      await waitFor(() => {
        expect(getByText('No jobs posted yet')).toBeTruthy();
        expect(getByText('Post your first job to get started!')).toBeTruthy();
      });
    });
  });
});
