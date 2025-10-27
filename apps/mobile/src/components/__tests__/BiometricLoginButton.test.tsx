/**
 * BiometricLoginButton Component Tests
 *
 * Tests the BiometricLoginButton component functionality including:
 * - Rendering based on biometric availability
 * - Authentication flow
 * - Error handling
 * - Loading states
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import BiometricLoginButton from '../BiometricLoginButton';
import { BiometricService } from '../../services/BiometricService';
import { useAuth } from '../../contexts/AuthContext';

// Mock dependencies
jest.mock('../../services/BiometricService');
jest.mock('../../contexts/AuthContext');
jest.mock('../../utils/logger');
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

const mockBiometricService = BiometricService as jest.Mocked<typeof BiometricService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('BiometricLoginButton', () => {
  const mockSignInWithBiometrics = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      signInWithBiometrics: mockSignInWithBiometrics,
      user: null,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      isBiometricAvailable: jest.fn(),
      isBiometricEnabled: jest.fn(),
      enableBiometric: jest.fn(),
      disableBiometric: jest.fn(),
    });

    mockBiometricService.isAvailable.mockResolvedValue(true);
    mockBiometricService.isBiometricEnabled.mockResolvedValue(true);
    mockBiometricService.getSupportedTypes.mockResolvedValue([1]); // Face ID
    mockBiometricService.getTypeDisplayName.mockReturnValue('Face ID');
  });

  describe('Rendering', () => {
    it('should render when biometrics are available and enabled', async () => {
      const { getByText, getByLabelText } = render(
        <BiometricLoginButton onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(getByText('Quick Sign In')).toBeTruthy();
        expect(getByText('Use Face ID')).toBeTruthy();
        expect(getByLabelText('Sign in with Face ID')).toBeTruthy();
      });
    });

    it('should not render when biometrics are not available', async () => {
      mockBiometricService.isAvailable.mockResolvedValue(false);

      const { queryByText } = render(
        <BiometricLoginButton onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(queryByText('Quick Sign In')).toBeNull();
      });
    });

    it('should not render when biometrics are not enabled', async () => {
      mockBiometricService.isBiometricEnabled.mockResolvedValue(false);

      const { queryByText } = render(
        <BiometricLoginButton onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(queryByText('Quick Sign In')).toBeNull();
      });
    });

    it('should display Touch ID when available', async () => {
      mockBiometricService.getSupportedTypes.mockResolvedValue([2]); // Touch ID
      mockBiometricService.getTypeDisplayName.mockReturnValue('Touch ID');

      const { getByText } = render(
        <BiometricLoginButton onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(getByText('Use Touch ID')).toBeTruthy();
      });
    });

    it('should display multiple biometric types when available', async () => {
      mockBiometricService.getSupportedTypes.mockResolvedValue([1, 2]);
      mockBiometricService.getTypeDisplayName
        .mockReturnValueOnce('Face ID')
        .mockReturnValueOnce('Touch ID');

      const { getByText } = render(
        <BiometricLoginButton onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(getByText('Use Face ID or Touch ID')).toBeTruthy();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should call signInWithBiometrics when button is pressed', async () => {
      mockSignInWithBiometrics.mockResolvedValue(undefined);

      const { getByLabelText } = render(
        <BiometricLoginButton onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(getByLabelText('Sign in with Face ID')).toBeTruthy();
      });

      const button = getByLabelText('Sign in with Face ID');
      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockSignInWithBiometrics).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onSuccess callback after successful authentication', async () => {
      mockSignInWithBiometrics.mockResolvedValue(undefined);

      const { getByLabelText } = render(
        <BiometricLoginButton onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(getByLabelText('Sign in with Face ID')).toBeTruthy();
      });

      const button = getByLabelText('Sign in with Face ID');
      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should show loading state during authentication', async () => {
      let resolveSignIn: () => void;
      const signInPromise = new Promise<void>((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInWithBiometrics.mockReturnValue(signInPromise);

      const { getByText, getByLabelText } = render(
        <BiometricLoginButton onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(getByLabelText('Sign in with Face ID')).toBeTruthy();
      });

      const button = getByLabelText('Sign in with Face ID');
      await act(async () => {
        fireEvent.press(button);
      });

      // Should show loading text
      await waitFor(() => {
        expect(getByText('Authenticating...')).toBeTruthy();
      });

      // Resolve the promise
      await act(async () => {
        resolveSignIn!();
        await signInPromise;
      });

      // Loading state should clear
      await waitFor(() => {
        expect(getByText('Use Face ID')).toBeTruthy();
      });
    });

    it('should disable button during authentication', async () => {
      let resolveSignIn: () => void;
      const signInPromise = new Promise<void>((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInWithBiometrics.mockReturnValue(signInPromise);

      const { getByLabelText } = render(
        <BiometricLoginButton onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(getByLabelText('Sign in with Face ID')).toBeTruthy();
      });

      const button = getByLabelText('Sign in with Face ID');
      await act(async () => {
        fireEvent.press(button);
      });

      // Button should be disabled
      await waitFor(() => {
        expect(button.props.disabled).toBe(true);
      });

      // Resolve the promise
      await act(async () => {
        resolveSignIn!();
        await signInPromise;
      });

      // Button should be enabled again
      await waitFor(() => {
        expect(button.props.disabled).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show alert on authentication failure', async () => {
      const error = new Error('Authentication failed');
      mockSignInWithBiometrics.mockRejectedValue(error);

      const { getByLabelText } = render(
        <BiometricLoginButton onError={mockOnError} />
      );

      await waitFor(() => {
        expect(getByLabelText('Sign in with Face ID')).toBeTruthy();
      });

      const button = getByLabelText('Sign in with Face ID');
      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Authentication Failed',
          expect.stringContaining('Face ID authentication failed')
        );
      });
    });

    it('should call onError callback on authentication failure', async () => {
      const error = new Error('Authentication failed');
      mockSignInWithBiometrics.mockRejectedValue(error);

      const { getByLabelText } = render(
        <BiometricLoginButton onError={mockOnError} />
      );

      await waitFor(() => {
        expect(getByLabelText('Sign in with Face ID')).toBeTruthy();
      });

      const button = getByLabelText('Sign in with Face ID');
      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(error);
      });
    });

    it('should not show alert when user cancels authentication', async () => {
      const error = new Error('User cancelled authentication');
      mockSignInWithBiometrics.mockRejectedValue(error);

      const { getByLabelText } = render(
        <BiometricLoginButton onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(getByLabelText('Sign in with Face ID')).toBeTruthy();
      });

      const button = getByLabelText('Sign in with Face ID');
      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(Alert.alert).not.toHaveBeenCalled();
      });
    });

    it('should handle biometric status check errors gracefully', async () => {
      mockBiometricService.isAvailable.mockRejectedValue(
        new Error('Hardware not available')
      );

      const { queryByText } = render(
        <BiometricLoginButton onSuccess={mockOnSuccess} />
      );

      // Should not crash and should not render
      await waitFor(() => {
        expect(queryByText('Quick Sign In')).toBeNull();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility attributes', async () => {
      const { getByLabelText } = render(
        <BiometricLoginButton onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        const button = getByLabelText('Sign in with Face ID');
        expect(button.props.accessibilityRole).toBe('button');
        expect(button.props.accessibilityHint).toBe(
          'Use biometric authentication to sign in quickly'
        );
      });
    });
  });
});
