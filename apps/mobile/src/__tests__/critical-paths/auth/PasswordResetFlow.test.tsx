
// Mock React Native modules
import React from 'react';
import { render, fireEvent, waitFor } from '../../test-utils';
import { AuthService } from '../../../services/AuthService';
import { ForgotPasswordScreen } from '../../../screens/ForgotPasswordScreen';

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

describe('Password Reset Flow - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthService.resetPassword as jest.Mock).mockResolvedValue({ success: true });
  });

  it('should send password reset email', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ForgotPasswordScreen navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    );

    fireEvent.changeText(getByPlaceholderText(/email/i), 'user@example.com');
    fireEvent.press(getByText(/send reset link/i));

    await waitFor(() => {
      expect(AuthService.resetPassword).toHaveBeenCalledWith('user@example.com');
      expect(queryByText(/email sent/i)).toBeTruthy();
    });
  });

  it('should validate email before sending', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ForgotPasswordScreen navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    );

    fireEvent.changeText(getByPlaceholderText(/email/i), 'invalid-email');
    fireEvent.press(getByText(/send reset link/i));

    await waitFor(() => {
      expect(queryByText(/valid email/i)).toBeTruthy();
      expect(AuthService.resetPassword).not.toHaveBeenCalled();
    });
  });

  it('should handle non-existent email', async () => {
    (AuthService.resetPassword as jest.Mock).mockRejectedValue(
      new Error('User not found')
    );

    const { getByPlaceholderText, getByText, queryByText } = render(
      <ForgotPasswordScreen navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    );

    fireEvent.changeText(getByPlaceholderText(/email/i), 'nonexistent@example.com');
    fireEvent.press(getByText(/send reset link/i));

    await waitFor(() => {
      expect(queryByText(/not found/i)).toBeTruthy();
    });
  });

  it('should prevent spam with rate limiting', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ForgotPasswordScreen navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    );

    fireEvent.changeText(getByPlaceholderText(/email/i), 'user@example.com');
    fireEvent.press(getByText(/send reset link/i));

    await waitFor(() => {
      expect(AuthService.resetPassword).toHaveBeenCalledTimes(1);
    });

    // Try to send again immediately
    fireEvent.press(getByText(/send reset link/i));

    await waitFor(() => {
      expect(queryByText(/wait.*before.*again/i)).toBeTruthy();
      expect(AuthService.resetPassword).toHaveBeenCalledTimes(1);
    });
  });
});