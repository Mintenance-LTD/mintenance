// Mock expo-local-authentication
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

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock react-native
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
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

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { BiometricService, BiometricCredentials } from '../BiometricService';
import { trackUserAction, addBreadcrumb } from '../../config/sentry';
import { logger } from '../../utils/logger';

const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAlert = Alert as jest.Mocked<typeof Alert>;
const mockTrackUserAction = trackUserAction as jest.MockedFunction<typeof trackUserAction>;
const mockAddBreadcrumb = addBreadcrumb as jest.MockedFunction<typeof addBreadcrumb>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('BiometricService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default successful state
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    ]);
  });

  describe('isAvailable', () => {
    it('returns true when biometrics are fully available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const result = await BiometricService.isAvailable();

      expect(result).toBe(true);
      expect(mockLocalAuth.hasHardwareAsync).toHaveBeenCalled();
      expect(mockLocalAuth.isEnrolledAsync).toHaveBeenCalled();
      expect(mockLocalAuth.supportedAuthenticationTypesAsync).toHaveBeenCalled();
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Biometric availability check: true',
        'biometric',
        expect.objectContaining({
          hasHardware: true,
          isEnrolled: true,
        })
      );
    });

    it('returns false when no hardware available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const result = await BiometricService.isAvailable();

      expect(result).toBe(false);
    });

    it('returns false when biometrics not enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const result = await BiometricService.isAvailable();

      expect(result).toBe(false);
    });

    it('returns false when no supported types', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);

      const result = await BiometricService.isAvailable();

      expect(result).toBe(false);
    });

    it('handles errors and returns false', async () => {
      mockLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('Hardware check failed'));

      const result = await BiometricService.isAvailable();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error checking biometric availability:',
        expect.any(Error)
      );
    });
  });

  describe('getSupportedTypes', () => {
    it('returns supported authentication types', async () => {
      const supportedTypes = [
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ];
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue(supportedTypes);

      const result = await BiometricService.getSupportedTypes();

      expect(result).toEqual(supportedTypes);
      expect(mockLocalAuth.supportedAuthenticationTypesAsync).toHaveBeenCalled();
    });

    it('returns empty array on error', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockRejectedValue(
        new Error('Failed to get types')
      );

      const result = await BiometricService.getSupportedTypes();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting supported types:',
        expect.any(Error)
      );
    });
  });

  describe('getTypeDisplayName', () => {
    it('returns Fingerprint for FINGERPRINT type', () => {
      const result = BiometricService.getTypeDisplayName(
        LocalAuthentication.AuthenticationType.FINGERPRINT
      );
      expect(result).toBe('Fingerprint');
    });

    it('returns Face ID for FACIAL_RECOGNITION type', () => {
      const result = BiometricService.getTypeDisplayName(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      );
      expect(result).toBe('Face ID');
    });

    it('returns Iris for IRIS type', () => {
      const result = BiometricService.getTypeDisplayName(
        LocalAuthentication.AuthenticationType.IRIS
      );
      expect(result).toBe('Iris');
    });

    it('returns Biometric for unknown type', () => {
      const result = BiometricService.getTypeDisplayName(999 as any);
      expect(result).toBe('Biometric');
    });
  });

  describe('isBiometricEnabled', () => {
    it('returns true when biometric is enabled', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('true');

      const result = await BiometricService.isBiometricEnabled();

      expect(result).toBe(true);
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('biometric_enabled');
    });

    it('returns false when biometric is disabled', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('false');

      const result = await BiometricService.isBiometricEnabled();

      expect(result).toBe(false);
    });

    it('returns false when no value stored', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await BiometricService.isBiometricEnabled();

      expect(result).toBe(false);
    });

    it('handles errors and returns false', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Storage error'));

      const result = await BiometricService.isBiometricEnabled();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error checking biometric enabled status:',
        expect.any(Error)
      );
    });
  });

  describe('enableBiometric', () => {
    const email = 'test@example.com';
    const tokens = {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
    };

    beforeEach(() => {
      // Mock Date.now() for consistent timestamps
      jest.spyOn(Date, 'now').mockReturnValue(1640000000000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('enables biometric authentication successfully', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      await BiometricService.enableBiometric(email, tokens);

      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.enable_attempt', { email });

      const expectedCredentials: BiometricCredentials = {
        email,
        refreshToken: tokens.refreshToken,
        storedAt: 1640000000000,
      };

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'biometric_credentials',
        JSON.stringify(expectedCredentials)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('biometric_enabled', 'true');
      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.enable_success', { email });
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Biometric authentication enabled',
        'biometric'
      );
    });

    it('throws error when biometrics not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      await expect(BiometricService.enableBiometric(email, tokens)).rejects.toThrow(
        'Biometric authentication is not available on this device'
      );

      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.enable_attempt', { email });
      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.enable_failed', {
        email,
        error: 'Biometric authentication is not available on this device',
      });
    });

    it('throws error when refresh token is missing', async () => {
      const tokensWithoutRefresh = { accessToken: 'access-token', refreshToken: '' };

      await expect(BiometricService.enableBiometric(email, tokensWithoutRefresh)).rejects.toThrow(
        'Refresh token is required to enable biometric authentication'
      );

      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.enable_failed', {
        email,
        error: 'Refresh token is required to enable biometric authentication',
      });
    });

    it('throws error when tokens object is null', async () => {
      await expect(BiometricService.enableBiometric(email, null as any)).rejects.toThrow(
        'Refresh token is required to enable biometric authentication'
      );
    });

    it('handles SecureStore errors', async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(new Error('Storage full'));

      await expect(BiometricService.enableBiometric(email, tokens)).rejects.toThrow(
        'Storage full'
      );

      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.enable_failed', {
        email,
        error: 'Storage full',
      });
    });
  });

  describe('disableBiometric', () => {
    it('disables biometric authentication successfully', async () => {
      await BiometricService.disableBiometric();

      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.disable_attempt');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_credentials');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_enabled');
      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.disable_success');
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Biometric authentication disabled',
        'biometric'
      );
    });

    it('handles errors during disable', async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('Delete failed'));

      await expect(BiometricService.disableBiometric()).rejects.toThrow('Delete failed');

      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.disable_failed', {
        error: 'Delete failed',
      });
    });
  });

  describe('authenticate', () => {
    const mockCredentials: BiometricCredentials = {
      email: 'test@example.com',
      refreshToken: 'refresh-token-123',
      storedAt: Date.now(),
    };

    beforeEach(() => {
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials') return Promise.resolve(JSON.stringify(mockCredentials));
        return Promise.resolve(null);
      });
    });

    it('authenticates successfully with fingerprint', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const result = await BiometricService.authenticate();

      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.auth_attempt');
      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Use your Fingerprint to sign in',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });
      expect(result).toEqual(mockCredentials);
      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.auth_success', {
        email: mockCredentials.email,
        tokenAgeInDays: 0,
      });
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Biometric authentication successful',
        'biometric'
      );
    });

    it('authenticates with custom prompt message', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      await BiometricService.authenticate('Custom message');

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Custom message',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });
    });

    it('authenticates successfully with Face ID', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const result = await BiometricService.authenticate();

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Use your Face ID to sign in',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });
      expect(result).toEqual(mockCredentials);
    });

    it('authenticates with multiple biometric types', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      await BiometricService.authenticate();

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Use your Fingerprint or Face ID to sign in',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });
    });

    it('returns null when biometric is not enabled', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await BiometricService.authenticate();

      expect(result).toBeNull();
      expect(mockLocalAuth.authenticateAsync).not.toHaveBeenCalled();
    });

    it('throws error when biometrics not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      await expect(BiometricService.authenticate()).rejects.toThrow(
        'Biometric authentication is not available'
      );

      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.auth_failed', {
        error: 'Biometric authentication is not available',
      });
    });

    it('returns null when authentication is cancelled', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const result = await BiometricService.authenticate();

      expect(result).toBeNull();
      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.auth_cancelled', {
        error: 'user_cancel',
      });
    });

    it('throws error when credentials not found', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await expect(BiometricService.authenticate()).rejects.toThrow(
        'Biometric credentials not found'
      );
    });

    it('handles corrupted credentials JSON', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials') return Promise.resolve('invalid-json{');
        return Promise.resolve(null);
      });
      // Ensure deleteItemAsync succeeds so both deletes happen
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

      await expect(BiometricService.authenticate()).rejects.toThrow(
        'Invalid biometric credentials. Please enable biometric authentication again.'
      );

      // clearBiometricData should delete both items
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
      expect(mockSecureStore.deleteItemAsync).toHaveBeenNthCalledWith(1, 'biometric_credentials');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenNthCalledWith(2, 'biometric_enabled');
    });

    it('throws error when credentials are incomplete', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
      const incompleteCredentials = { email: 'test@example.com', storedAt: Date.now() };
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials')
          return Promise.resolve(JSON.stringify(incompleteCredentials));
        return Promise.resolve(null);
      });

      await expect(BiometricService.authenticate()).rejects.toThrow(
        'Saved biometric credentials are incomplete. Please sign in again.'
      );
    });

    it('throws error and clears credentials when token is expired', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
      const expiredCredentials: BiometricCredentials = {
        email: 'test@example.com',
        refreshToken: 'refresh-token',
        storedAt: Date.now() - 31 * 24 * 60 * 60 * 1000, // 31 days ago
      };
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials')
          return Promise.resolve(JSON.stringify(expiredCredentials));
        return Promise.resolve(null);
      });

      await expect(BiometricService.authenticate()).rejects.toThrow(
        'Biometric credentials have expired. Please sign in again to re-enable biometric authentication.'
      );

      // clearBiometricData deletes in this specific order
      expect(mockSecureStore.deleteItemAsync).toHaveBeenNthCalledWith(1, 'biometric_credentials');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenNthCalledWith(2, 'biometric_enabled');
      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.token_expired', {
        email: expiredCredentials.email,
        ageInDays: 31,
      });
    });

    it('logs token age for valid credentials', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
      const credentialsWithAge: BiometricCredentials = {
        email: 'test@example.com',
        refreshToken: 'refresh-token',
        storedAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
      };
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials')
          return Promise.resolve(JSON.stringify(credentialsWithAge));
        return Promise.resolve(null);
      });

      await BiometricService.authenticate();

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Biometric token age: 5 days',
        'biometric',
        expect.objectContaining({
          email: credentialsWithAge.email,
          ageInDays: 5,
        })
      );
    });

    it('handles authentication errors', async () => {
      mockLocalAuth.authenticateAsync.mockRejectedValue(new Error('Authentication failed'));

      await expect(BiometricService.authenticate()).rejects.toThrow('Authentication failed');

      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.auth_failed', {
        error: 'Authentication failed',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Biometric authentication error:',
        expect.any(Error)
      );
    });
  });

  describe('promptEnableBiometric', () => {
    const email = 'test@example.com';
    const mockOnEnable = jest.fn();

    beforeEach(() => {
      mockOnEnable.mockClear();
    });

    it('shows prompt when biometrics are available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      await BiometricService.promptEnableBiometric(email, mockOnEnable);

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Enable Fingerprint',
        'Would you like to enable Fingerprint for faster sign-ins?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Not Now', style: 'cancel' }),
          expect.objectContaining({ text: 'Enable' }),
        ])
      );
    });

    it('does not show prompt when biometrics unavailable', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      await BiometricService.promptEnableBiometric(email, mockOnEnable);

      expect(mockAlert.alert).not.toHaveBeenCalled();
    });

    it('tracks decline action when user clicks Not Now', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      await BiometricService.promptEnableBiometric(email, mockOnEnable);

      expect(mockAlert.alert).toHaveBeenCalled();
      const alertCall = mockAlert.alert.mock.calls[0];
      const buttons = alertCall[2];
      const notNowButton = buttons?.find((b: any) => b.text === 'Not Now');

      if (notNowButton?.onPress) {
        notNowButton.onPress();
      }

      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.setup_declined', { email });
    });

    it('calls onEnable callback when user clicks Enable', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);
      mockOnEnable.mockResolvedValue(undefined);

      await BiometricService.promptEnableBiometric(email, mockOnEnable);

      const alertCall = mockAlert.alert.mock.calls[0];
      const buttons = alertCall[2];
      const enableButton = buttons?.find((b: any) => b.text === 'Enable');

      if (enableButton?.onPress) {
        await enableButton.onPress();
      }

      expect(mockOnEnable).toHaveBeenCalledWith(email);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Success',
        'Fingerprint has been enabled for your account.'
      );
    });

    it('shows error alert when onEnable fails', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      mockOnEnable.mockRejectedValue(new Error('Enable failed'));

      await BiometricService.promptEnableBiometric(email, mockOnEnable);

      const alertCall = mockAlert.alert.mock.calls[0];
      const buttons = alertCall[2];
      const enableButton = buttons?.find((b: any) => b.text === 'Enable');

      if (enableButton?.onPress) {
        await enableButton.onPress();
      }

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to enable Face ID. Please try again.'
      );
    });

    it('shows prompt with multiple biometric types', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      await BiometricService.promptEnableBiometric(email, mockOnEnable);

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Enable Fingerprint or Face ID',
        'Would you like to enable Fingerprint or Face ID for faster sign-ins?',
        expect.any(Array)
      );
    });
  });

  describe('clearBiometricData', () => {
    it('clears all biometric data successfully', async () => {
      await BiometricService.clearBiometricData();

      // Verify items are deleted in the correct order
      expect(mockSecureStore.deleteItemAsync).toHaveBeenNthCalledWith(1, 'biometric_credentials');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenNthCalledWith(2, 'biometric_enabled');
      expect(mockTrackUserAction).toHaveBeenCalledWith('biometric.data_cleared');
      expect(mockAddBreadcrumb).toHaveBeenCalledWith('Biometric data cleared', 'biometric');
    });

    it('handles errors silently', async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('Delete failed'));

      // Should not throw
      await BiometricService.clearBiometricData();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error clearing biometric data:',
        expect.any(Error)
      );
    });
  });

  describe('Security edge cases', () => {
    it('prevents replay attacks with expired tokens', async () => {
      const veryOldCredentials: BiometricCredentials = {
        email: 'test@example.com',
        refreshToken: 'old-token',
        storedAt: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
      };

      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials')
          return Promise.resolve(JSON.stringify(veryOldCredentials));
        return Promise.resolve(null);
      });

      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      await expect(BiometricService.authenticate()).rejects.toThrow(
        'Biometric credentials have expired'
      );
    });

    it('handles missing storedAt field (legacy credentials)', async () => {
      const legacyCredentials = {
        email: 'test@example.com',
        refreshToken: 'token',
        // storedAt is missing
      };

      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials')
          return Promise.resolve(JSON.stringify(legacyCredentials));
        return Promise.resolve(null);
      });

      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      // Should treat missing storedAt as age 0 (very old) and expire
      await expect(BiometricService.authenticate()).rejects.toThrow(
        'Biometric credentials have expired'
      );
    });

    it('prevents credential tampering with malformed JSON', async () => {
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials') return Promise.resolve('}{malformed');
        return Promise.resolve(null);
      });
      // Ensure deleteItemAsync succeeds so both deletes happen
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      await expect(BiometricService.authenticate()).rejects.toThrow(
        'Invalid biometric credentials'
      );

      // Should clear corrupted data in correct order
      expect(mockSecureStore.deleteItemAsync).toHaveBeenNthCalledWith(1, 'biometric_credentials');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenNthCalledWith(2, 'biometric_enabled');
    });

    it('only stores refresh token, not access token', async () => {
      // Clear mocks to ensure clean test
      jest.clearAllMocks();

      // Reset mock implementations after clearing
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      // Mock Date.now for consistent timestamp
      const mockTimestamp = 1640000000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const tokens = {
        accessToken: 'access-token-should-not-be-stored',
        refreshToken: 'refresh-token-ok-to-store',
      };

      await BiometricService.enableBiometric('test@example.com', tokens);

      const storedCredentialsCall = mockSecureStore.setItemAsync.mock.calls.find(
        (call) => call[0] === 'biometric_credentials'
      );
      const storedCredentials = JSON.parse(storedCredentialsCall?.[1] as string);

      expect(storedCredentials).toHaveProperty('refreshToken');
      expect(storedCredentials).not.toHaveProperty('accessToken');
      expect(storedCredentials.refreshToken).toBe('refresh-token-ok-to-store');

      // Restore Date.now
      jest.restoreAllMocks();
    });

    it('validates token age is within 30 day limit', async () => {
      const credentialsAt29Days: BiometricCredentials = {
        email: 'test@example.com',
        refreshToken: 'valid-token',
        storedAt: Date.now() - 29 * 24 * 60 * 60 * 1000,
      };

      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials')
          return Promise.resolve(JSON.stringify(credentialsAt29Days));
        return Promise.resolve(null);
      });

      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      const result = await BiometricService.authenticate();

      // Should succeed for 29 days
      expect(result).toEqual(credentialsAt29Days);
    });
  });

  describe('Platform-specific behavior', () => {
    it('handles iOS Face ID', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const credentials: BiometricCredentials = {
        email: 'test@example.com',
        refreshToken: 'token',
        storedAt: Date.now(),
      };

      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials') return Promise.resolve(JSON.stringify(credentials));
        return Promise.resolve(null);
      });

      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      await BiometricService.authenticate();

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Use your Face ID to sign in',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });
    });

    it('handles Android Fingerprint', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const credentials: BiometricCredentials = {
        email: 'test@example.com',
        refreshToken: 'token',
        storedAt: Date.now(),
      };

      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials') return Promise.resolve(JSON.stringify(credentials));
        return Promise.resolve(null);
      });

      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      await BiometricService.authenticate();

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Use your Fingerprint to sign in',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });
    });

    it('handles Iris scanner', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.IRIS,
      ]);

      const credentials: BiometricCredentials = {
        email: 'test@example.com',
        refreshToken: 'token',
        storedAt: Date.now(),
      };

      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_enabled') return Promise.resolve('true');
        if (key === 'biometric_credentials') return Promise.resolve(JSON.stringify(credentials));
        return Promise.resolve(null);
      });

      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      await BiometricService.authenticate();

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Use your Iris to sign in',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });
    });
  });
});
