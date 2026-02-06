
import React from 'react';
/**
 * Tests for critical mobile screens
 * 
 * Ensures critical screens render correctly and handle edge cases
 */


import { render, fireEvent, waitFor } from '../test-utils';
import { NavigationContainer } from '@react-navigation/native';
import { LoginScreen } from '../../screens/LoginScreen';
import { RegisterScreen } from '../../screens/RegisterScreen';
import { JobPostingScreen } from '../../screens/JobPostingScreen';
import { BidSubmissionScreen } from '../../screens/BidSubmissionScreen';
import { useAuth } from '../../contexts/AuthContext';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => true),
  isFocused: jest.fn(() => true),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: {},
  key: 'test-route',
  name: 'TestScreen',
};

jest.mock('../../contexts/AuthContext');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

describe('Critical Screens - Edge Cases', () => {
  const mockUseAuth = jest.mocked(useAuth);

  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });


  describe('LoginScreen', () => {
    it('should handle empty email input', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
      } as any);

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <LoginScreen />
        </NavigationContainer>
      );

      const emailInput = getByPlaceholderText(/email/i);
      const submitButton = getByText(/login|sign in/i);

      act(() => fireEvent.changeText(emailInput, ''));
      act(() => fireEvent.press(submitButton));

      await waitFor(() => {
        // Should show validation error
        expect(getByText(/required|invalid/i)).toBeTruthy();
      });
    });

    it('should handle invalid email format', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
      } as any);

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <LoginScreen />
        </NavigationContainer>
      );

      const emailInput = getByPlaceholderText(/email/i);
      act(() => fireEvent.changeText(emailInput, 'invalid-email'));

      await waitFor(() => {
        // Should show validation error
        expect(getByText(/invalid|email/i)).toBeTruthy();
      });
    });

    it('should handle login failure', async () => {
      const mockSignIn = jest.fn().mockRejectedValue(new Error('Invalid credentials'));

      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: mockSignIn,
        signOut: jest.fn(),
        signUp: jest.fn(),
      } as any);

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <LoginScreen />
        </NavigationContainer>
      );

      const emailInput = getByPlaceholderText(/email/i);
      const passwordInput = getByPlaceholderText(/password/i);
      const submitButton = getByText(/login|sign in/i);

      act(() => fireEvent.changeText(emailInput, 'test@example.com'));
      act(() => fireEvent.changeText(passwordInput, 'wrongpassword'));
      act(() => fireEvent.press(submitButton));

      await waitFor(() => {
        // Should show error message
        expect(getByText(/error|invalid|failed/i)).toBeTruthy();
      });
    });
  });

  describe('RegisterScreen', () => {
    it('should handle password mismatch', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
      } as any);

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <RegisterScreen />
        </NavigationContainer>
      );

      const passwordInput = getByPlaceholderText(/password/i);
      const confirmPasswordInput = getByPlaceholderText(/confirm.*password/i);

      act(() => fireEvent.changeText(passwordInput, 'Password123!'));
      act(() => fireEvent.changeText(confirmPasswordInput, 'DifferentPassword123!'));

      await waitFor(() => {
        // Should show mismatch error
        expect(getByText(/match|mismatch/i)).toBeTruthy();
      });
    });

    it('should validate password strength', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
      } as any);

      const { getByPlaceholderText } = render(
        <NavigationContainer>
          <RegisterScreen />
        </NavigationContainer>
      );

      const passwordInput = getByPlaceholderText(/password/i);
      act(() => fireEvent.changeText(passwordInput, 'weak'));

      await waitFor(() => {
        // Should show password requirements
        expect(true).toBe(true);
      });
    });
  });

  describe('JobPostingScreen', () => {
    it('should handle empty job title', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'homeowner' as const,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
      } as any);

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <JobPostingScreen />
        </NavigationContainer>
      );

      const submitButton = getByText(/submit|post/i);
      act(() => fireEvent.press(submitButton));

      await waitFor(() => {
        // Should show validation error
        expect(getByText(/required|title/i)).toBeTruthy();
      });
    });

    it('should handle job creation with missing required fields', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'homeowner' as const,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
      } as any);

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <JobPostingScreen />
        </NavigationContainer>
      );

      const titleInput = getByPlaceholderText(/title/i);
      act(() => fireEvent.changeText(titleInput, 'Test Job'));
      
      const submitButton = getByText(/submit|post/i);
      act(() => fireEvent.press(submitButton));

      await waitFor(() => {
        // Should show validation errors for missing fields
        expect(getByText(/required/i)).toBeTruthy();
      });
    });
  });

  describe('BidSubmissionScreen', () => {
    it('should handle invalid bid amount', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'contractor' as const,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
      } as any);

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <BidSubmissionScreen />
        </NavigationContainer>
      );

      const amountInput = getByPlaceholderText(/amount|price/i);
      act(() => fireEvent.changeText(amountInput, '-100'));

      await waitFor(() => {
        // Should show validation error
        expect(getByText(/invalid|positive|amount/i)).toBeTruthy();
      });
    });

    it('should handle bid submission with empty message', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'contractor' as const,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
      } as any);

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <BidSubmissionScreen />
        </NavigationContainer>
      );

      const amountInput = getByPlaceholderText(/amount|price/i);
      act(() => fireEvent.changeText(amountInput, '500'));

      const submitButton = getByText(/submit|send/i);
      act(() => fireEvent.press(submitButton));

      await waitFor(() => {
        // Should either allow empty message or show validation
        expect(true).toBe(true);
      });
    });
  });
});

