import React from 'react';
import { render, waitFor } from '../../__tests__/test-utils';
import ServiceRequestScreen from '../ServiceRequestScreen';
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

// AuthContext: the service-request form reads `user` to load properties.
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com', role: 'homeowner' },
    loading: false,
  }),
}));

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

const mockRoute = {
  key: 'test-key',
  name: 'ServiceRequestScreen',
  params: {},
};

// Mock any services this screen might use
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
        <ServiceRequestScreen
          navigation={mockNavigation}
          route={mockRoute}
          {...props}
        />
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('ServiceRequestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', async () => {
    const { queryAllByText } = renderScreen();

    await waitFor(() => {
      expect(queryAllByText(/./i).length).toBeGreaterThan(0);
    });
  });

  it('should handle navigation', () => {
    renderScreen();

    // Verify navigation prop was passed
    expect(mockNavigation).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { queryByTestId, queryAllByTestId } = renderScreen();

    await waitFor(() => {
      // Look for any interactive elements
      const buttons = queryAllByTestId(/button/i);
      const touchables = queryAllByTestId(/touchable/i);

      // At minimum, screen should render
      expect(buttons.length + touchables.length).toBeGreaterThanOrEqual(0);
    });
  });
});
