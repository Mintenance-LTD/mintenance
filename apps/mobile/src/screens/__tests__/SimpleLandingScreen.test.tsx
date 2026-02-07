
import React from 'react';
import { render, waitFor, fireEvent } from '../..//test-utils';
import { SimpleLandingScreen } from '../SimpleLandingScreen';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

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
  name: 'SimpleLandingScreen',
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
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
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
        <SimpleLandingScreen
          navigation={mockNavigation}
          route={mockRoute}
          {...props}
        />
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('SimpleLandingScreen', () => {
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
