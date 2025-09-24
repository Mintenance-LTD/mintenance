import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../screens/HomeScreen';

// Mock the useAuth hook instead of trying to use AuthContext directly
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Minimal mocks for external dependencies only
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

// Override the global navigation mocks from jest-setup.js
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Mock services to return predictable data
jest.mock('../../services/UserService', () => ({
  UserService: {
    getContractorStats: jest.fn().mockResolvedValue({
      activeJobs: 2,
      monthlyEarnings: 800,
      averageRating: 4.8,
      completedJobs: 12,
    }),
    getPreviousContractors: jest.fn().mockResolvedValue([]),
  },
}));

// Mock logger to prevent console noise
jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn() },
}));

jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
  }),
}));

const { useAuth } = require('../../contexts/AuthContext');

describe('HomeScreen Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing for homeowner', async () => {
    const mockUser = {
      id: '1',
      email: 'homeowner@test.com',
      role: 'homeowner',
      first_name: 'John',
      last_name: 'Homeowner',
    };

    useAuth.mockReturnValue({
      user: mockUser,
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
    });

    const { getByTestId } = render(<HomeScreen />);

    // Should render the home screen container
    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('renders without crashing for contractor', async () => {
    const mockUser = {
      id: '2',
      email: 'contractor@test.com', 
      role: 'contractor',
      first_name: 'Jane',
      last_name: 'Contractor',
    };

    useAuth.mockReturnValue({
      user: mockUser,
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
    });

    const { getByTestId, getByText } = render(<HomeScreen />);

    // Wait for contractor data to load
    await waitFor(() => {
      expect(getByTestId('home-screen')).toBeTruthy();
    });
    
    // Wait for data to load and check for contractor-specific content
    await waitFor(() => {
      expect(getByText('Good morning!')).toBeTruthy();
    });
  });

  it('renders when no user is present', () => {
    useAuth.mockReturnValue({
      user: null,
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
    });

    const { getByTestId } = render(<HomeScreen />);

    // Should still render the container even without user
    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('has required test IDs for user interactions', async () => {
    const mockUser = {
      id: '2',
      email: 'contractor@test.com',
      role: 'contractor',
      first_name: 'Jane',
      last_name: 'Contractor',
    };

    useAuth.mockReturnValue({
      user: mockUser,
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
    });

    const { getByTestId } = render(<HomeScreen />);

    // Wait for contractor data to load
    await waitFor(() => {
      expect(getByTestId('home-screen')).toBeTruthy();
    });
    
    // Should have scroll view for refresh functionality
    await waitFor(() => {
      expect(getByTestId('home-scroll-view')).toBeTruthy();
    });
  });
});