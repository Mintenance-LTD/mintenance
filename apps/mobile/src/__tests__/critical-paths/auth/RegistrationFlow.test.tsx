
// Mock React Native modules
import React from 'react';
import { render, fireEvent, waitFor } from '../../test-utils';
import { AuthService } from '../../../services/AuthService';
import { RegisterScreen } from '../../../screens/RegisterScreen';

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

jest.mock('../../../services/AuthService');

describe('Registration Flow - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthService.signUp as jest.Mock).mockResolvedValue({
      user: { id: '1', email: 'newuser@example.com' },
      session: { access_token: 'token' },
    });
  });

  describe('Successful Registration', () => {
    it('should register new user with valid data', async () => {
      const mockNavigation = { navigate: jest.fn() };
      const { getByPlaceholderText, getByText } = render(
        <RegisterScreen navigation={mockNavigation} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText(/email/i), 'newuser@example.com');
      fireEvent.changeText(getByPlaceholderText(/password/i), 'SecurePass123!');
      fireEvent.changeText(getByPlaceholderText(/confirm password/i), 'SecurePass123!');
      fireEvent.changeText(getByPlaceholderText(/full name/i), 'John Doe');
      fireEvent.press(getByText(/create account/i));

      await waitFor(() => {
        expect(AuthService.signUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          full_name: 'John Doe',
        });
        expect(mockNavigation.navigate).toHaveBeenCalledWith('Onboarding');
      });
    });
  });

  describe('Validation Rules', () => {
    it('should validate email format', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <RegisterScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText(/email/i), 'invalid.email');
      fireEvent.press(getByText(/create account/i));

      await waitFor(() => {
        expect(queryByText(/valid email/i)).toBeTruthy();
      });
    });

    it('should enforce password strength requirements', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <RegisterScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText(/password/i), 'weak');
      fireEvent.press(getByText(/create account/i));

      await waitFor(() => {
        expect(queryByText(/at least 8 characters/i)).toBeTruthy();
      });
    });

    it('should validate password match', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <RegisterScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText(/^password/i), 'SecurePass123!');
      fireEvent.changeText(getByPlaceholderText(/confirm password/i), 'DifferentPass123!');
      fireEvent.press(getByText(/create account/i));

      await waitFor(() => {
        expect(queryByText(/passwords.*match/i)).toBeTruthy();
      });
    });
  });

  describe('Duplicate Account Prevention', () => {
    it('should handle existing email error', async () => {
      (AuthService.signUp as jest.Mock).mockRejectedValue(
        new Error('User already registered')
      );

      const { getByPlaceholderText, getByText, queryByText } = render(
        <RegisterScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText(/email/i), 'existing@example.com');
      fireEvent.changeText(getByPlaceholderText(/password/i), 'SecurePass123!');
      fireEvent.changeText(getByPlaceholderText(/confirm password/i), 'SecurePass123!');
      fireEvent.changeText(getByPlaceholderText(/full name/i), 'John Doe');
      fireEvent.press(getByText(/create account/i));

      await waitFor(() => {
        expect(queryByText(/already registered/i)).toBeTruthy();
      });
    });
  });

  describe('Terms and Conditions', () => {
    it('should require terms acceptance', async () => {
      const { getByText, getByTestId, queryByText } = render(
        <RegisterScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
      );

      // Fill form but don't check terms
      fireEvent.press(getByText(/create account/i));

      await waitFor(() => {
        expect(queryByText(/accept.*terms/i)).toBeTruthy();
      });
    });
  });
});