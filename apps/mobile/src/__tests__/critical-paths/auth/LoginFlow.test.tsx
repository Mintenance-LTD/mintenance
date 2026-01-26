
// Mock React Native modules
jest.mock('react-native', () => require('../../__mocks__/react-native.js'));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '../../test-utils';
import { AuthService } from '../../../services/AuthService';
import { LoginScreen } from '../../../screens/LoginScreen';

jest.mock('../../../services/AuthService');

describe('Login Flow - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthService.signIn as jest.Mock).mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
      session: { access_token: 'token' },
    });
  });

  describe('Successful Login', () => {
    it('should login with valid credentials', async () => {
      const mockNavigation = { navigate: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={mockNavigation} route={{ params: {} }} />
      );

      const emailInput = getByPlaceholderText(/email/i);
      const passwordInput = getByPlaceholderText(/password/i);
      const loginButton = getByText(/sign in/i);

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(AuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockNavigation.navigate).toHaveBeenCalledWith('Home');
      });
    });

    it('should store session after successful login', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText(/email/i), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText(/password/i), 'password123');
      fireEvent.press(getByText(/sign in/i));

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          expect.stringContaining('session'),
          expect.any(String)
        );
      });
    });
  });

  describe('Login Validation', () => {
    it('should show error for invalid email', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <LoginScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText(/email/i), 'invalid-email');
      fireEvent.changeText(getByPlaceholderText(/password/i), 'password123');
      fireEvent.press(getByText(/sign in/i));

      await waitFor(() => {
        expect(queryByText(/invalid email/i)).toBeTruthy();
        expect(AuthService.signIn).not.toHaveBeenCalled();
      });
    });

    it('should show error for empty password', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <LoginScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText(/email/i), 'test@example.com');
      fireEvent.press(getByText(/sign in/i));

      await waitFor(() => {
        expect(queryByText(/password is required/i)).toBeTruthy();
        expect(AuthService.signIn).not.toHaveBeenCalled();
      });
    });
  });

  describe('Login Error Handling', () => {
    it('should handle network errors', async () => {
      (AuthService.signIn as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByPlaceholderText, getByText, queryByText } = render(
        <LoginScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText(/email/i), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText(/password/i), 'password123');
      fireEvent.press(getByText(/sign in/i));

      await waitFor(() => {
        expect(queryByText(/network error/i)).toBeTruthy();
      });
    });

    it('should handle invalid credentials', async () => {
      (AuthService.signIn as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      const { getByPlaceholderText, getByText, queryByText } = render(
        <LoginScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText(/email/i), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText(/password/i), 'wrongpassword');
      fireEvent.press(getByText(/sign in/i));

      await waitFor(() => {
        expect(queryByText(/invalid credentials/i)).toBeTruthy();
      });
    });
  });

  describe('Remember Me Feature', () => {
    it('should save credentials when remember me is checked', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const { getByPlaceholderText, getByText, getByTestId } = render(
        <LoginScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText(/email/i), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText(/password/i), 'password123');
      fireEvent.press(getByTestId('remember-me-checkbox'));
      fireEvent.press(getByText(/sign in/i));

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'remembered_email',
          'test@example.com'
        );
      });
    });
  });
});