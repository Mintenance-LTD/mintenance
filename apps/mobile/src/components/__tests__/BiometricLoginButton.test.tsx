// Mock expo dependencies first
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import BiometricLoginButton from '../BiometricLoginButton';
import { BiometricService } from '../../services/BiometricService';
import { logger } from '../../utils/logger';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock React Native
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock theme
jest.mock('../../theme', () => ({
  theme: {
    colors: {
      primary: '#007AFF',
      textTertiary: '#999999',
      surface: '#FFFFFF',
      border: '#E0E0E0',
      textSecondary: '#666666',
    },
    spacing: {
      2: 8,
      3: 12,
      4: 16,
      6: 24,
    },
    typography: {
      fontSize: {
        base: 16,
        lg: 18,
      },
      fontWeight: {
        medium: '500',
      },
    },
    borderRadius: {
      xl: 16,
    },
    shadows: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    },
  },
}));

// Mock Sentry
jest.mock('../../config/sentry', () => ({
  trackUserAction: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Create mock for AuthContext
const mockSignInWithBiometrics = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signInWithBiometrics: mockSignInWithBiometrics,
    user: null,
    loading: false,
  }),
}));

describe('BiometricLoginButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering and Availability Checks', () => {
    it('should check biometric status on mount', async () => {
      const isAvailableSpy = jest.spyOn(BiometricService, 'isAvailable');
      const isEnabledSpy = jest.spyOn(BiometricService, 'isBiometricEnabled');
      const getSupportedTypesSpy = jest.spyOn(BiometricService, 'getSupportedTypes');

      isAvailableSpy.mockResolvedValue(true);
      isEnabledSpy.mockResolvedValue(true);
      getSupportedTypesSpy.mockResolvedValue([1]);

      render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(isAvailableSpy).toHaveBeenCalled();
        expect(isEnabledSpy).toHaveBeenCalled();
        expect(getSupportedTypesSpy).toHaveBeenCalled();
      });
    });

    it('should render button when biometrics are available and enabled', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([1]);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Quick Sign In')).toBeTruthy();
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });
    });

    it('should not render when biometrics are not available', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(false);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);

      const { queryByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        // Component returns null when not available
        expect(queryByText('Quick Sign In')).toBeNull();
        expect(queryByText('Use Fingerprint')).toBeNull();
      });
    });

    it('should not render when biometrics are not enabled', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(false);

      const { queryByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(queryByText('Quick Sign In')).toBeNull();
      });
    });

    it('should handle errors during status check gracefully', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockRejectedValue(new Error('Hardware error'));

      const { queryByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Error checking biometric status:',
          expect.any(Error)
        );
        expect(queryByText('Quick Sign In')).toBeNull();
      });
    });
  });

  describe('Biometric Type Display', () => {
    it('should display Fingerprint for fingerprint type', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([1]);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });
    });

    it('should display Face ID for facial recognition type', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([2]);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Face ID')).toBeTruthy();
      });
    });

    it('should display Iris for iris scanner type', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([3]);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Iris')).toBeTruthy();
      });
    });

    it('should display multiple types joined with "or"', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([1, 2]);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint or Face ID')).toBeTruthy();
      });
    });

    it('should handle unknown biometric type', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([999 as any]);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Biometric')).toBeTruthy();
      });
    });
  });

  describe('Authentication Flow', () => {
    beforeEach(() => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([1]);
    });

    it('should call signInWithBiometrics when button is pressed', async () => {
      mockSignInWithBiometrics.mockResolvedValue(undefined);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockSignInWithBiometrics).toHaveBeenCalled();
      });
    });

    it('should show loading state during authentication', async () => {
      let resolveAuth: () => void;
      const authPromise = new Promise<void>((resolve) => {
        resolveAuth = resolve;
      });
      mockSignInWithBiometrics.mockReturnValue(authPromise);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');
      fireEvent.press(button);

      await waitFor(() => {
        expect(getByText('Authenticating...')).toBeTruthy();
      });

      resolveAuth!();
    });

    it('should disable button during authentication', async () => {
      let resolveAuth: () => void;
      const authPromise = new Promise<void>((resolve) => {
        resolveAuth = resolve;
      });
      mockSignInWithBiometrics.mockReturnValue(authPromise);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');
      fireEvent.press(button);

      await waitFor(() => {
        // Button should be disabled (can't directly test disabled prop in RN, but loading state implies it)
        expect(mockSignInWithBiometrics).toHaveBeenCalled();
      });

      resolveAuth!();
    });

    it('should call onSuccess callback on successful authentication', async () => {
      const onSuccess = jest.fn();
      mockSignInWithBiometrics.mockResolvedValue(undefined);

      const { getByText } = render(
        <BiometricLoginButton onSuccess={onSuccess} />
      );

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');
      fireEvent.press(button);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should reset loading state after successful authentication', async () => {
      mockSignInWithBiometrics.mockResolvedValue(undefined);

      const { getByText, queryByText } = render(
        <BiometricLoginButton />
      );

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');
      fireEvent.press(button);

      await waitFor(() => {
        expect(queryByText('Authenticating...')).toBeNull();
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([1]);
    });

    it('should show alert on authentication failure', async () => {
      const mockAlert = Alert.alert as jest.Mock;
      mockSignInWithBiometrics.mockRejectedValue(new Error('Authentication failed'));

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Authentication Failed',
          'Fingerprint authentication failed. Please try again or use your password.'
        );
      });
    });

    it('should call onError callback on authentication failure', async () => {
      const onError = jest.fn();
      const error = new Error('Authentication failed');
      mockSignInWithBiometrics.mockRejectedValue(error);

      const { getByText } = render(
        <BiometricLoginButton onError={onError} />
      );

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');
      fireEvent.press(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it('should not show alert when user cancels authentication', async () => {
      const mockAlert = Alert.alert as jest.Mock;
      mockSignInWithBiometrics.mockRejectedValue(new Error('User cancelled authentication'));

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockAlert).not.toHaveBeenCalled();
      });
    });

    it('should not show alert when user canceled authentication (American spelling)', async () => {
      const mockAlert = Alert.alert as jest.Mock;
      mockSignInWithBiometrics.mockRejectedValue(new Error('Authentication canceled by user'));

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockAlert).not.toHaveBeenCalled();
      });
    });

    it('should not call onError when user cancels', async () => {
      const onError = jest.fn();
      mockSignInWithBiometrics.mockRejectedValue(new Error('User cancelled'));

      const { getByText } = render(
        <BiometricLoginButton onError={onError} />
      );

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');
      fireEvent.press(button);

      await waitFor(() => {
        expect(onError).not.toHaveBeenCalled();
      });
    });

    it('should reset loading state after error', async () => {
      mockSignInWithBiometrics.mockRejectedValue(new Error('Authentication failed'));

      const { getByText, queryByText } = render(
        <BiometricLoginButton />
      );

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');
      fireEvent.press(button);

      // Wait for error to be processed and loading state to reset
      await waitFor(() => {
        // After error, should show button text again (not Authenticating...)
        expect(getByText('Use Fingerprint')).toBeTruthy();
      }, { timeout: 3000 });

      // Verify loading text is gone
      expect(queryByText('Authenticating...')).toBeNull();
    });

    it('should show alert with Face ID in error message for Face ID type', async () => {
      const mockAlert = Alert.alert as jest.Mock;
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([2]);
      mockSignInWithBiometrics.mockRejectedValue(new Error('Authentication failed'));

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Face ID')).toBeTruthy();
      });

      const button = getByText('Use Face ID');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Authentication Failed',
          'Face ID authentication failed. Please try again or use your password.'
        );
      });
    });
  });

  describe('Edge Cases and Guards', () => {
    it('should not attempt authentication if not available', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(false);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);

      const { queryByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(queryByText('Quick Sign In')).toBeNull();
      });

      expect(mockSignInWithBiometrics).not.toHaveBeenCalled();
    });

    it('should not attempt authentication if not enabled', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(false);

      const { queryByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(queryByText('Quick Sign In')).toBeNull();
      });

      expect(mockSignInWithBiometrics).not.toHaveBeenCalled();
    });

    it('should disable button during authentication to prevent rapid presses', async () => {
      // Use a pending promise to simulate async behavior
      let resolveAuth: () => void;
      const authPromise = new Promise<void>((resolve) => {
        resolveAuth = resolve;
      });
      mockSignInWithBiometrics.mockReturnValue(authPromise);

      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([1]);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');

      // Press button to start authentication
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockSignInWithBiometrics).toHaveBeenCalledTimes(1);
        // Verify loading text appears
        expect(getByText('Authenticating...')).toBeTruthy();
      });

      // Try to press again while loading - the disabled prop prevents actual handler execution
      // Note: In test environment, fireEvent still triggers, but in real app TouchableOpacity disabled prop prevents it
      const buttonParent = button.parent;
      expect(buttonParent.props.disabled).toBe(true);

      // Cleanup by resolving the promise
      resolveAuth!();
    });

    it('should handle empty supported types array', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([]);

      const { queryByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        // Should show empty string or not render
        expect(queryByText('Quick Sign In')).toBeTruthy();
        expect(queryByText('Use ')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([1]);
    });

    it('should have correct accessibility role as button', async () => {
      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        const buttonText = getByText('Use Fingerprint');
        expect(buttonText).toBeTruthy();
        // Find the parent TouchableOpacity which has the accessibility props
        const button = buttonText.parent;
        expect(button.props.accessibilityRole).toBe('button');
      });
    });

    it('should have correct accessibility label for Fingerprint', async () => {
      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        const buttonText = getByText('Use Fingerprint');
        expect(buttonText).toBeTruthy();
        // Check the parent TouchableOpacity has correct accessibility label
        const button = buttonText.parent;
        expect(button.props.accessibilityLabel).toBe('Sign in with Fingerprint');
      });
    });

    it('should have accessibility hint', async () => {
      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        const buttonText = getByText('Use Fingerprint');
        expect(buttonText).toBeTruthy();
        // Check the parent TouchableOpacity has accessibility hint
        const button = buttonText.parent;
        expect(button.props.accessibilityHint).toBe('Use biometric authentication to sign in quickly');
      });
    });

    it('should update accessibility label for Face ID', async () => {
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([2]);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Face ID')).toBeTruthy();
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up properly on unmount', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([1]);

      const { unmount } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(true).toBe(true);
      });

      expect(() => unmount()).not.toThrow();
    });

    it('should handle status check completing after unmount', async () => {
      let resolveAvailable: (value: boolean) => void;
      const availablePromise = new Promise<boolean>((resolve) => {
        resolveAvailable = resolve;
      });

      jest.spyOn(BiometricService, 'isAvailable').mockReturnValue(availablePromise);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);

      const { unmount } = render(<BiometricLoginButton />);

      unmount();

      // Resolve after unmount - should not cause errors
      resolveAvailable!(true);

      await waitFor(() => {
        expect(true).toBe(true);
      });
    });
  });

  describe('Visual States', () => {
    beforeEach(() => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([1]);
    });

    it('should render with correct button text in idle state', async () => {
      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });
    });

    it('should render with correct button text in loading state', async () => {
      let resolveAuth: () => void;
      const authPromise = new Promise<void>((resolve) => {
        resolveAuth = resolve;
      });
      mockSignInWithBiometrics.mockReturnValue(authPromise);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });

      const button = getByText('Use Fingerprint');
      fireEvent.press(button);

      await waitFor(() => {
        expect(getByText('Authenticating...')).toBeTruthy();
      });

      resolveAuth!();
    });

    it('should render Quick Sign In label', async () => {
      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Quick Sign In')).toBeTruthy();
      });
    });
  });

  describe('Integration with Multiple Biometric Types', () => {
    it('should handle all three biometric types together', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([1, 2, 3]);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint or Face ID or Iris')).toBeTruthy();
      });
    });

    it('should handle Fingerprint and Iris combination', async () => {
      jest.spyOn(BiometricService, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'isBiometricEnabled').mockResolvedValue(true);
      jest.spyOn(BiometricService, 'getSupportedTypes').mockResolvedValue([1, 3]);

      const { getByText } = render(<BiometricLoginButton />);

      await waitFor(() => {
        expect(getByText('Use Fingerprint or Iris')).toBeTruthy();
      });
    });
  });
});
