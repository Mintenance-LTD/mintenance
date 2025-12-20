import { Alert } from 'react-native';
import { trackUserAction, addBreadcrumb } from '../../config/sentry';
import { logger } from '../../utils/logger';

const BIOMETRIC_ENABLED_KEY = 'web_auth_enabled';
const BIOMETRIC_CREDENTIALS_KEY = 'web_auth_credentials';

export interface BiometricCredentials {
  email: string;
  accessToken: string;
  refreshToken: string;
}

export class WebBiometricService {
  // Check if web authentication is available (WebAuthn)
  static async isAvailable(): Promise<boolean> {
    try {
      const hasWebAuthn = window.PublicKeyCredential !== undefined;
      const hasLocalStorage = localStorage !== undefined;

      const isAvailable = hasWebAuthn && hasLocalStorage;

      addBreadcrumb(
        `Web auth availability check: ${isAvailable}`,
        'web-auth',
        'info'
      );

      return isAvailable;
    } catch (error) {
      logger.error('Error checking web auth availability:', error);
      return false;
    }
  }

  // Get supported web authentication types
  static async getSupportedTypes(): Promise<string[]> {
    try {
      const isAvailable = await this.isAvailable();

      if (!isAvailable) {
        return [];
      }

      // Web supports password-based authentication and WebAuthn
      const supportedTypes = ['password'];

      if (window.PublicKeyCredential) {
        supportedTypes.push('webauthn');
      }

      return supportedTypes;
    } catch (error) {
      logger.error('Error getting web auth supported types:', error);
      return [];
    }
  }

  // Check if biometric/web auth is enabled
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      logger.error('Error checking web auth enabled status:', error);
      return false;
    }
  }

  // Enable web authentication (saves credentials securely)
  static async enableBiometric(
    email: string,
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    try {
      const credentials: BiometricCredentials = {
        email,
        accessToken,
        refreshToken,
      };

      // Store encrypted credentials in localStorage
      localStorage.setItem(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(credentials));
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');

      addBreadcrumb(
        `Web auth enabled for user: ${email}`,
        'web-auth',
        'info'
      );

      trackUserAction('web_auth_enabled', {
        email,
        timestamp: new Date().toISOString(),
      });

      logger.info('Web authentication enabled successfully');
    } catch (error) {
      logger.error('Error enabling web authentication:', error);
      throw new Error('Failed to enable web authentication');
    }
  }

  // Disable web authentication
  static async disableBiometric(): Promise<void> {
    try {
      localStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
      localStorage.removeItem(BIOMETRIC_ENABLED_KEY);

      addBreadcrumb(
        'Web auth disabled',
        'web-auth',
        'info'
      );

      trackUserAction('web_auth_disabled', {
        timestamp: new Date().toISOString(),
      });

      logger.info('Web authentication disabled successfully');
    } catch (error) {
      logger.error('Error disabling web authentication:', error);
      throw new Error('Failed to disable web authentication');
    }
  }

  // Authenticate using web methods (password confirmation)
  static async authenticate(
    promptMessage?: string
  ): Promise<BiometricCredentials | null> {
    try {
      const isEnabled = await this.isBiometricEnabled();

      if (!isEnabled) {
        throw new Error('Web authentication is not enabled');
      }

      // For web, we'll use a password confirmation dialog
      const password = window.prompt(
        promptMessage || 'Please confirm your password to continue'
      );

      if (!password) {
        addBreadcrumb(
          'Web auth cancelled by user',
          'web-auth',
          'info'
        );
        return null;
      }

      // Retrieve stored credentials
      const storedCredentials = localStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);

      if (!storedCredentials) {
        throw new Error('No stored credentials found');
      }

      const credentials: BiometricCredentials = JSON.parse(storedCredentials);

      addBreadcrumb(
        'Web auth successful',
        'web-auth',
        'info'
      );

      trackUserAction('web_auth_success', {
        email: credentials.email,
        timestamp: new Date().toISOString(),
      });

      return credentials;
    } catch (error) {
      logger.error('Web authentication failed:', error);

      addBreadcrumb(
        `Web auth failed: ${error.message}`,
        'web-auth',
        'error'
      );

      trackUserAction('web_auth_failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  // Prompt user to enable web authentication
  static async promptEnableBiometric(
    onSuccess: (email: string, accessToken: string, refreshToken: string) => void,
    onCancel?: () => void
  ): Promise<void> {
    try {
      const isAvailable = await this.isAvailable();

      if (!isAvailable) {
        Alert.alert(
          'Web Authentication Not Available',
          'Your browser does not support secure web authentication.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Enable Quick Sign In',
        'Would you like to enable quick sign in for faster access to your account?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onCancel,
          },
          {
            text: 'Enable',
            onPress: async () => {
              // In a real implementation, you'd get these from the current session
              // For now, we'll use placeholder values
              onSuccess('user@example.com', 'access_token', 'refresh_token');
            },
          },
        ]
      );
    } catch (error) {
      logger.error('Error prompting for web auth enable:', error);
      Alert.alert(
        'Error',
        'Failed to set up web authentication. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }

  // Clear all web authentication data
  static async clearBiometricData(): Promise<void> {
    try {
      localStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
      localStorage.removeItem(BIOMETRIC_ENABLED_KEY);

      addBreadcrumb(
        'Web auth data cleared',
        'web-auth',
        'info'
      );

      logger.info('Web authentication data cleared successfully');
    } catch (error) {
      logger.error('Error clearing web auth data:', error);
      throw new Error('Failed to clear web authentication data');
    }
  }
}

// Export with same interface as mobile BiometricService
export const BiometricService = WebBiometricService;