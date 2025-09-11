import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { BiometricService } from '../../services/BiometricService';
import { Alert } from 'react-native';
import { logger } from '../../utils/logger';

// Get mocked modules
const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Create a spy for Alert.alert  
const mockAlert = {
  alert: jest.fn(),
};

// Mock sentry functions
jest.mock('../../config/sentry', () => ({
  trackUserAction: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

const { trackUserAction, addBreadcrumb } = require('../../config/sentry');

describe('BiometricService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Override Alert.alert with our mock
    Alert.alert = mockAlert.alert;
  });

  describe('isAvailable', () => {
    it('returns true when biometric hardware is available and enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ]);

      const result = await BiometricService.isAvailable();

      expect(result).toBe(true);
      expect(mockLocalAuth.hasHardwareAsync).toHaveBeenCalled();
      expect(mockLocalAuth.isEnrolledAsync).toHaveBeenCalled();
      expect(mockLocalAuth.supportedAuthenticationTypesAsync).toHaveBeenCalled();
    });

    it('returns false when hardware is not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);

      const result = await BiometricService.isAvailable();

      expect(result).toBe(false);
    });

    it('returns false when biometrics are not enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ]);

      const result = await BiometricService.isAvailable();

      expect(result).toBe(false);
    });

    it('handles errors gracefully', async () => {
      mockLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('Hardware check failed'));

      const result = await BiometricService.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    it('returns supported authentication types', async () => {
      const mockTypes = [
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      ];
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue(mockTypes);

      const result = await BiometricService.getSupportedTypes();

      expect(result).toEqual(mockTypes);
    });

    it('handles errors and returns empty array', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockRejectedValue(new Error('Failed'));

      const result = await BiometricService.getSupportedTypes();

      expect(result).toEqual([]);
    });
  });

  describe('getTypeDisplayName', () => {
    it('returns correct display name for fingerprint', () => {
      const name = BiometricService.getTypeDisplayName(LocalAuthentication.AuthenticationType.FINGERPRINT);
      expect(name).toBe('Fingerprint');
    });

    it('returns correct display name for face ID', () => {
      const name = BiometricService.getTypeDisplayName(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      expect(name).toBe('Face ID');
    });

    it('returns default for unknown type', () => {
      const name = BiometricService.getTypeDisplayName(999 as any);
      expect(name).toBe('Biometric');
    });
  });

  describe('isBiometricEnabled', () => {
    it('returns true when biometric is enabled', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('true');

      const result = await BiometricService.isBiometricEnabled();

      expect(result).toBe(true);
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('biometric_enabled');
    });

    it('returns false when biometric is not enabled', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('false');

      const result = await BiometricService.isBiometricEnabled();

      expect(result).toBe(false);
    });

    it('handles errors and returns false', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Storage error'));

      const result = await BiometricService.isBiometricEnabled();

      expect(result).toBe(false);
    });
  });

  describe('enableBiometric', () => {
    beforeEach(() => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ]);
    });

    it('successfully enables biometric authentication', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue();

      await BiometricService.enableBiometric('test@example.com', 'token123');

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'biometric_credentials',
        JSON.stringify({
          email: 'test@example.com',
          hashedToken: 'token123'
        })
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('biometric_enabled', 'true');
    });

    it('throws error when biometric is not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      await expect(
        BiometricService.enableBiometric('test@example.com', 'token123')
      ).rejects.toThrow('Biometric authentication is not available on this device');
    });
  });

  describe('authenticate', () => {
    beforeEach(() => {
      mockSecureStore.getItemAsync
        .mockImplementation((key) => {
          if (key === 'biometric_enabled') return Promise.resolve('true');
          if (key === 'biometric_credentials') return Promise.resolve(JSON.stringify({
            email: 'test@example.com',
            hashedToken: 'token123'
          }));
          return Promise.resolve(null);
        });

      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ]);
    });

    it('successfully authenticates and returns credentials', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
        warning: undefined,
      });

      const result = await BiometricService.authenticate();

      expect(result).toEqual({
        email: 'test@example.com',
        hashedToken: 'token123'
      });
    });

    it('returns null when authentication fails', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'UserCancel',
        warning: undefined,
      });

      const result = await BiometricService.authenticate();

      expect(result).toBeNull();
    });

    it('returns null when biometric is not enabled', async () => {
      mockSecureStore.getItemAsync
        .mockImplementation((key) => {
          if (key === 'biometric_enabled') return Promise.resolve('false');
          return Promise.resolve(null);
        });

      const result = await BiometricService.authenticate();

      expect(result).toBeNull();
    });

    it('throws error when credentials are not found', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
        warning: undefined,
      });
      mockSecureStore.getItemAsync
        .mockImplementation((key) => {
          if (key === 'biometric_enabled') return Promise.resolve('true');
          if (key === 'biometric_credentials') return Promise.resolve(null);
          return Promise.resolve(null);
        });

      await expect(BiometricService.authenticate()).rejects.toThrow('Biometric credentials not found');
    });
  });

  describe('disableBiometric', () => {
    it('successfully disables biometric authentication', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue();

      await BiometricService.disableBiometric();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_credentials');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_enabled');
    });

    it('handles errors gracefully', async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('Delete failed'));

      await expect(BiometricService.disableBiometric()).rejects.toThrow('Delete failed');
    });
  });

  describe('clearBiometricData', () => {
    it('clears all biometric data', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue();

      await BiometricService.clearBiometricData();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_credentials');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_enabled');
    });

    it('handles errors silently', async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('Delete failed'));

      // Should not throw
      await BiometricService.clearBiometricData();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalled();
    });
  });

  describe('promptEnableBiometric', () => {
    beforeEach(() => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ]);
    });

    it('shows prompt when biometric is available', async () => {
      const mockOnEnable = jest.fn();
      mockAlert.alert.mockImplementation((title, message, buttons) => {
        // Simulate user pressing "Enable"
        if (buttons && buttons[1] && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

      await BiometricService.promptEnableBiometric('test@example.com', mockOnEnable);

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Enable Fingerprint',
        'Would you like to enable Fingerprint for faster sign-ins?',
        expect.any(Array)
      );
      expect(mockOnEnable).toHaveBeenCalledWith('test@example.com', 'secure_session_token');
    });

    it('does not show prompt when biometric is not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
      const mockOnEnable = jest.fn();

      await BiometricService.promptEnableBiometric('test@example.com', mockOnEnable);

      expect(mockAlert.alert).not.toHaveBeenCalled();
      expect(mockOnEnable).not.toHaveBeenCalled();
    });
  });
});