import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { trackUserAction, addBreadcrumb } from '../config/sentry';
import { logger } from '../utils/logger';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

export interface BiometricCredentials {
  email: string;
  refreshToken: string; // Only store refresh token for security
}

export class BiometricService {
  // Check if device supports biometric authentication
  static async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      const isAvailable =
        hasHardware && isEnrolled && supportedTypes.length > 0;

      addBreadcrumb(
        `Biometric availability check: ${isAvailable}`,
        'biometric',
        {
          hasHardware,
          isEnrolled,
          supportedTypes: supportedTypes.map(
            (type) => LocalAuthentication.AuthenticationType[type]
          ),
        }
      );

      return isAvailable;
    } catch (error) {
      logger.error('Error checking biometric availability:', error);
      return false;
    }
  }

  // Get supported authentication types
  static async getSupportedTypes(): Promise<
    LocalAuthentication.AuthenticationType[]
  > {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      logger.error('Error getting supported types:', error);
      return [];
    }
  }

  // Get biometric type names for display
  static getTypeDisplayName(
    type: LocalAuthentication.AuthenticationType
  ): string {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'Fingerprint';
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'Face ID';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'Iris';
      default:
        return 'Biometric';
    }
  }

  // Check if biometric login is enabled for the user
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      logger.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  // Enable biometric authentication
  static async enableBiometric(
    email: string,
    tokens: { accessToken: string; refreshToken: string }
  ): Promise<void> {
    try {
      trackUserAction('biometric.enable_attempt', { email });

      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        throw new Error(
          'Biometric authentication is not available on this device'
        );
      }

      // Only refresh token is required for biometric storage
      if (!tokens?.refreshToken) {
        throw new Error('Refresh token is required to enable biometric authentication');
      }

      // Security: Only store refresh token, not access token
      const credentials: BiometricCredentials = {
        email,
        refreshToken: tokens.refreshToken,
      };

      await SecureStore.setItemAsync(
        BIOMETRIC_CREDENTIALS_KEY,
        JSON.stringify(credentials)
      );
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

      trackUserAction('biometric.enable_success', { email });
      addBreadcrumb('Biometric authentication enabled', 'biometric');
    } catch (error) {
      trackUserAction('biometric.enable_failed', {
        email,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Disable biometric authentication
  static async disableBiometric(): Promise<void> {
    try {
      trackUserAction('biometric.disable_attempt');

      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);

      trackUserAction('biometric.disable_success');
      addBreadcrumb('Biometric authentication disabled', 'biometric');
    } catch (error) {
      trackUserAction('biometric.disable_failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Authenticate with biometrics
  static async authenticate(
    promptMessage?: string
  ): Promise<BiometricCredentials | null> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return null;
      }

      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        throw new Error('Biometric authentication is not available');
      }

      trackUserAction('biometric.auth_attempt');

      const supportedTypes = await this.getSupportedTypes();
      const typeNames = supportedTypes.map((type) =>
        this.getTypeDisplayName(type)
      );

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:
          promptMessage || `Use your ${typeNames.join(' or ')} to sign in`,
        disableDeviceFallback: false, // Allow passcode fallback
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        const credentialsStr = await SecureStore.getItemAsync(
          BIOMETRIC_CREDENTIALS_KEY
        );
        if (!credentialsStr) {
          throw new Error('Biometric credentials not found');
        }

        let credentials: BiometricCredentials;
        try {
          credentials = JSON.parse(credentialsStr) as BiometricCredentials;
        } catch (parseError) {
          // If JSON is corrupted, clear the credentials and throw
          await BiometricService.clearBiometricData();
          throw new Error('Invalid biometric credentials. Please enable biometric authentication again.');
        }

        if (!credentials.refreshToken) {
          throw new Error('Saved biometric credentials are incomplete. Please sign in again.');
        }

        // Note: Access token will be regenerated from refresh token by AuthService
        trackUserAction('biometric.auth_success', {
          email: credentials.email,
        });
        addBreadcrumb('Biometric authentication successful', 'biometric');

        return credentials;
      } else {
        trackUserAction('biometric.auth_cancelled', {
          error: result.error,
        });
        return null;
      }
    } catch (error) {
      trackUserAction('biometric.auth_failed', {
        error: (error as Error).message,
      });
      logger.error('Biometric authentication error:', error);
      throw error;
    }
  }

  // Show biometric setup prompt
  static async promptEnableBiometric(
    email: string,
    onEnable: (email: string) => Promise<void>
  ): Promise<void> {
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      return;
    }

    const supportedTypes = await this.getSupportedTypes();
    const typeNames = supportedTypes.map((type) =>
      this.getTypeDisplayName(type)
    );
    const biometricName = typeNames.join(' or ');

    Alert.alert(
      `Enable ${biometricName}`,
      `Would you like to enable ${biometricName} for faster sign-ins?`,
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => {
            trackUserAction('biometric.setup_declined', { email });
          },
        },
        {
          text: 'Enable',
          onPress: async () => {
            try {
              await onEnable(email);

              Alert.alert(
                'Success',
                `${biometricName} has been enabled for your account.`
              );
            } catch (error) {
              Alert.alert(
                'Error',
                `Failed to enable ${biometricName}. Please try again.`
              );
            }
          },
        },
      ]
    );
  }

  // Clear all biometric data (useful for account deletion or security reset)
  static async clearBiometricData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);

      trackUserAction('biometric.data_cleared');
      addBreadcrumb('Biometric data cleared', 'biometric');
    } catch (error) {
      logger.error('Error clearing biometric data:', error);
    }
  }
}
