// Mock React Native modules
import React from 'react';
import { render, fireEvent, waitFor } from '../../test-utils';
import { AuthService } from '../../../services/AuthService';
import ForgotPasswordScreen from '../../../screens/ForgotPasswordScreen';

// expo-screen-capture pulls in expo-modules-core's native EventEmitter, which
// is undefined under the node test environment and crashes the suite at import
// time. Mock it to no-op async fns (the hook only calls prevent/allow).
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  allowScreenCaptureAsync: jest.fn(() => Promise.resolve()),
}));

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
    (AuthService.resetPassword as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  it('should send password reset email', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ForgotPasswordScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: {} }}
      />
    );

    fireEvent.changeText(getByPlaceholderText(/email/i), 'user@example.com');
    fireEvent.press(getByText(/send reset link/i));

    await waitFor(() => {
      expect(AuthService.resetPassword).toHaveBeenCalledWith(
        'user@example.com'
      );
      expect(queryByText(/email sent/i)).toBeTruthy();
    });
  });

  it('should validate email before sending', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ForgotPasswordScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: {} }}
      />
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
      <ForgotPasswordScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: {} }}
      />
    );

    fireEvent.changeText(
      getByPlaceholderText(/email/i),
      'nonexistent@example.com'
    );
    fireEvent.press(getByText(/send reset link/i));

    await waitFor(() => {
      expect(queryByText(/not found/i)).toBeTruthy();
    });
  });

  it('should prevent spam with rate limiting', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ForgotPasswordScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: {} }}
      />
    );

    fireEvent.changeText(getByPlaceholderText(/email/i), 'user@example.com');
    fireEvent.press(getByText(/send reset link/i));

    await waitFor(() => {
      expect(AuthService.resetPassword).toHaveBeenCalledTimes(1);
    });

    // After a successful send the screen switches to the success view and
    // gates re-sending behind a 30s resend countdown. While the timer is
    // active the only affordance is the "Resend in Ns" label (no button),
    // so the user cannot trigger another reset email — this is the anti-spam
    // rate limit. The "Send Reset Link" button is gone at this point.
    await waitFor(() => {
      expect(queryByText(/resend in \d+s/i)).toBeTruthy();
    });

    // The resend button is not rendered while the countdown is running,
    // so resetPassword stays at a single call.
    expect(queryByText(/resend$/i)).toBeNull();
    expect(AuthService.resetPassword).toHaveBeenCalledTimes(1);
  });
});
