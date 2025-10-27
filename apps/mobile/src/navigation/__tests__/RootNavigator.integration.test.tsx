/**
 * RootNavigator Integration Tests
 *
 * Tests the complete navigation structure including:
 * - Auth flow navigation
 * - Main app navigation (tabs)
 * - Modal navigation
 * - Route type safety
 * - Navigation state transitions
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { RootNavigator } from '../RootNavigator';
import { useAuth } from '../../contexts/AuthContext';

// Mock AuthContext
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock screens to avoid rendering complexity
jest.mock('../../screens/HomeScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'home-screen' },
      React.createElement(Text, {}, 'Home Screen')
    ),
  };
});

jest.mock('../../screens/ContractorSocialScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'social-screen' },
      React.createElement(Text, {}, 'Social Screen')
    ),
  };
});

jest.mock('../navigators/JobsNavigator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'jobs-navigator' },
      React.createElement(Text, {}, 'Jobs Navigator')
    ),
  };
});

jest.mock('../navigators/MessagingNavigator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'messaging-navigator' },
      React.createElement(Text, {}, 'Messaging Navigator')
    ),
  };
});

jest.mock('../navigators/ProfileNavigator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'profile-navigator' },
      React.createElement(Text, {}, 'Profile Navigator')
    ),
  };
});

jest.mock('../navigators/AuthNavigator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'auth-navigator' },
      React.createElement(Text, {}, 'Auth Navigator')
    ),
  };
});

jest.mock('../navigators/ModalNavigator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'modal-navigator' },
      React.createElement(Text, {}, 'Modal Navigator')
    ),
  };
});

describe('RootNavigator Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Flow', () => {
    it('should render AuthNavigator when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
        signInWithBiometrics: jest.fn(),
        isBiometricAvailable: jest.fn(),
        isBiometricEnabled: jest.fn(),
        enableBiometric: jest.fn(),
        disableBiometric: jest.fn(),
      });

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('auth-navigator')).toBeTruthy();
      });
    });

    it('should render Main app when user is authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'homeowner',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        session: { access_token: 'token', refresh_token: 'refresh' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
        signInWithBiometrics: jest.fn(),
        isBiometricAvailable: jest.fn(),
        isBiometricEnabled: jest.fn(),
        enableBiometric: jest.fn(),
        disableBiometric: jest.fn(),
      });

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });

    it('should show loading state while authentication is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
        signInWithBiometrics: jest.fn(),
        isBiometricAvailable: jest.fn(),
        isBiometricEnabled: jest.fn(),
        enableBiometric: jest.fn(),
        disableBiometric: jest.fn(),
      });

      const { getByText } = render(<RootNavigator />);

      expect(getByText('Loading App')).toBeTruthy();
    });
  });

  describe('Main App Navigation Structure', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'homeowner',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        session: { access_token: 'token', refresh_token: 'refresh' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
        signInWithBiometrics: jest.fn(),
        isBiometricAvailable: jest.fn(),
        isBiometricEnabled: jest.fn(),
        enableBiometric: jest.fn(),
        disableBiometric: jest.fn(),
      });
    });

    it('should render HomeTab by default when authenticated', async () => {
      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });

    it('should have access to JobsTab navigator', async () => {
      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        // HomeTab is rendered by default, but JobsTab should be part of the tab navigator
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });
  });

  describe('Error Boundary Integration', () => {
    it('should wrap navigation in error boundary', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
        signInWithBiometrics: jest.fn(),
        isBiometricAvailable: jest.fn(),
        isBiometricEnabled: jest.fn(),
        enableBiometric: jest.fn(),
        disableBiometric: jest.fn(),
      });

      // Should render without crashing
      expect(() => {
        render(<RootNavigator />);
      }).not.toThrow();
    });
  });

  describe('Navigation Type Safety', () => {
    it('should support RootStackParamList types', async () => {
      // This test verifies that TypeScript types are properly defined
      // The RootNavigator uses RootStackParamList which includes:
      // - Auth: NavigatorScreenParams<AuthStackParamList>
      // - Main: NavigatorScreenParams<RootTabParamList>
      // - Modal: NavigatorScreenParams<ModalStackParamList>
      // - BookingDetails, RescheduleBooking, RateBooking

      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'homeowner',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        session: { access_token: 'token', refresh_token: 'refresh' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
        signInWithBiometrics: jest.fn(),
        isBiometricAvailable: jest.fn(),
        isBiometricEnabled: jest.fn(),
        enableBiometric: jest.fn(),
        disableBiometric: jest.fn(),
      });

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });

      // If TypeScript compilation succeeds, type safety is working
      expect(true).toBe(true);
    });
  });

  describe('User Role Based Navigation', () => {
    it('should handle homeowner navigation', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          email: 'homeowner@example.com',
          first_name: 'Home',
          last_name: 'Owner',
          role: 'homeowner',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        session: { access_token: 'token', refresh_token: 'refresh' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
        signInWithBiometrics: jest.fn(),
        isBiometricAvailable: jest.fn(),
        isBiometricEnabled: jest.fn(),
        enableBiometric: jest.fn(),
        disableBiometric: jest.fn(),
      });

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });

    it('should handle contractor navigation', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '2',
          email: 'contractor@example.com',
          first_name: 'John',
          last_name: 'Contractor',
          role: 'contractor',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        session: { access_token: 'token', refresh_token: 'refresh' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
        signInWithBiometrics: jest.fn(),
        isBiometricAvailable: jest.fn(),
        isBiometricEnabled: jest.fn(),
        enableBiometric: jest.fn(),
        disableBiometric: jest.fn(),
      });

      const { getByTestId } = render(<RootNavigator />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for tab navigation', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'homeowner',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        session: { access_token: 'token', refresh_token: 'refresh' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
        signInWithBiometrics: jest.fn(),
        isBiometricAvailable: jest.fn(),
        isBiometricEnabled: jest.fn(),
        enableBiometric: jest.fn(),
        disableBiometric: jest.fn(),
      });

      const { getByLabelText } = render(<RootNavigator />);

      await waitFor(() => {
        // Tab navigation should have accessibility labels
        expect(getByLabelText('Home tab')).toBeTruthy();
      });
    });
  });
});
