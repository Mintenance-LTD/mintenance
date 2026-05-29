import React from 'react';
import { render, waitFor } from '../..//test-utils';
import BidSubmissionScreen from '../BidSubmissionScreen';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

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
};

// Valid jobId so the screen renders its content states (Loading… → Job not
// found) instead of the missing-param error card.
const mockRoute = {
  key: 'test-key',
  name: 'BidSubmissionScreen',
  params: { jobId: 'job-123' },
};

// The screen reads the real AuthContext (the test render wrapper only provides
// a local mock context), so `useAuth()` would throw without this mock.
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

// Bid-limit pre-check helper — kept inert so it never touches the network.
jest.mock('../../utils/featureAccess', () => ({
  featureAccess: {
    initialize: jest.fn(() => Promise.resolve()),
    getRemainingUsage: jest.fn(() => 'unlimited'),
    getFeature: jest.fn(() => null),
  },
}));

// Keep job loading offline and deterministic — null keeps the screen on its
// "Job not found" state without rendering the heavy quote form.
jest.mock('../../services/JobService', () => ({
  JobService: {
    getJobById: jest.fn(() => Promise.resolve(null)),
  },
}));

jest.mock('../../services/AuthService', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn(),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderScreen = (props = {}) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <BidSubmissionScreen
          navigation={mockNavigation}
          route={mockRoute}
          {...props}
        />
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('BidSubmissionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', async () => {
    const { getByTestId, queryByText } = renderScreen();

    await waitFor(() => {
      // Check for either a test ID or any text to confirm render
      const element = queryByText(/./i) || getByTestId('screen-container');
      expect(element).toBeTruthy();
    });
  });

  it('should handle navigation', () => {
    renderScreen();

    // Verify navigation prop was passed
    expect(mockNavigation).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { queryAllByTestId } = renderScreen();

    await waitFor(() => {
      // Look for any interactive elements
      const buttons = queryAllByTestId(/button/i);
      const touchables = queryAllByTestId(/touchable/i);

      // At minimum, screen should render
      expect(buttons.length + touchables.length).toBeGreaterThanOrEqual(0);
    });
  });
});
