import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { trackUserAction, addBreadcrumb } from '../config/sentry';
import { logger } from '../utils/logger';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
const MAX_TOKEN_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// 2026-06-15: stop the post-login "Enable biometrics?" prompt from nagging
// on every single sign-in. We remember how many times the user tapped
// "Not Now" and back off with a growing window; after a few declines we
// stop auto-prompting entirely. The user can still enable it from
// Settings → Account & Security → Biometric Sign-In (which clears this).
const BIOMETRIC_PROMPT_DECLINE_KEY = 'biometric_prompt_decline';
const DECLINE_BACKOFF_MS = [
  7 * 24 * 60 * 60 * 1000, // after the 1st decline: don't ask for 7 days
  30 * 24 * 60 * 60 * 1000, // after the 2nd decline: don't ask for 30 days
];
const MAX_DECLINES_BEFORE_SUPPRESS = 3;

export interface BiometricCredentials {
  email: string;
  refreshToken: string; // Only store refresh token for security
  storedAt: number; // Timestamp when credentials were stored (for age validation)
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
        throw new Error(
          'Refresh token is required to enable biometric authentication'
        );
      }

      // Security: Only store refresh token, not access token
      // Include timestamp for age validation
      const credentials: BiometricCredentials = {
        email,
        refreshToken: tokens.refreshToken,
        storedAt: Date.now(),
      };

      await SecureStore.setItemAsync(
        BIOMETRIC_CREDENTIALS_KEY,
        JSON.stringify(credentials)
      );
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

      // Enabling resets the auto-prompt decline backoff.
      await this.clearPromptDecline();

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

  /**
   * Persist a rotated refresh token back into the biometric store.
   *
   * Supabase rotates the refresh token on every refresh, so the token captured
   * at enable-time goes stale within one cycle of normal app use. Without
   * writing the new token back, biometric sign-in works once and then fails
   * with "session expired" (2026-07-10 audit P2-3). Safe to call after every
   * successful refresh: it's a no-op when biometric is disabled or no
   * credentials are stored, and never throws into the auth flow.
   */
  static async updateStoredRefreshToken(refreshToken: string): Promise<void> {
    try {
      if (!refreshToken) return;

      const enabled = await this.isBiometricEnabled();
      if (!enabled) return;

      const credentialsStr = await SecureStore.getItemAsync(
        BIOMETRIC_CREDENTIALS_KEY
      );
      if (!credentialsStr) return;

      let credentials: BiometricCredentials;
      try {
        credentials = JSON.parse(credentialsStr) as BiometricCredentials;
      } catch {
        return;
      }

      credentials.refreshToken = refreshToken;
      credentials.storedAt = Date.now();

      await SecureStore.setItemAsync(
        BIOMETRIC_CREDENTIALS_KEY,
        JSON.stringify(credentials)
      );
      addBreadcrumb('Biometric refresh token rotated', 'biometric');
    } catch (error) {
      // Non-fatal: a failed rotation-persist just means the next biometric
      // attempt may fall back to password. Never block the auth flow.
      trackUserAction('biometric.token_rotation_persist_failed', {
        error: (error as Error).message,
      });
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
          throw new Error(
            'Invalid biometric credentials. Please enable biometric authentication again.'
          );
        }

        if (!credentials.refreshToken) {
          throw new Error(
            'Saved biometric credentials are incomplete. Please sign in again.'
          );
        }

        // Validate token age
        const tokenAge = Date.now() - (credentials.storedAt || 0);
        if (tokenAge > MAX_TOKEN_AGE_MS) {
          await BiometricService.clearBiometricData();
          trackUserAction('biometric.token_expired', {
            email: credentials.email,
            ageInDays: Math.floor(tokenAge / (24 * 60 * 60 * 1000)),
          });
          throw new Error(
            'Biometric credentials have expired. Please sign in again to re-enable biometric authentication.'
          );
        }

        // Log token age for monitoring
        const ageInDays = Math.floor(tokenAge / (24 * 60 * 60 * 1000));
        addBreadcrumb(`Biometric token age: ${ageInDays} days`, 'biometric', {
          email: credentials.email,
          ageInDays,
        });

        // Note: Access token will be regenerated from refresh token by AuthService
        trackUserAction('biometric.auth_success', {
          email: credentials.email,
          tokenAgeInDays: ageInDays,
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

    // Respect the user's recent "Not Now" choices — don't nag every login.
    if (await this.shouldSuppressPrompt()) {
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
            void this.recordPromptDeclined();
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

  // ---- Auto-prompt decline backoff (2026-06-15) ----------------------

  /** Record that the user tapped "Not Now" on the enable-biometrics prompt. */
  static async recordPromptDeclined(): Promise<void> {
    try {
      const raw = await SecureStore.getItemAsync(BIOMETRIC_PROMPT_DECLINE_KEY);
      const prev = raw ? (JSON.parse(raw) as { count?: number }) : { count: 0 };
      const next = { count: (prev.count ?? 0) + 1, lastAt: Date.now() };
      await SecureStore.setItemAsync(
        BIOMETRIC_PROMPT_DECLINE_KEY,
        JSON.stringify(next)
      );
    } catch (error) {
      // Non-fatal — worst case the prompt simply shows again next time.
      logger.warn('Failed to record biometric prompt decline', { error });
    }
  }

  /**
   * Whether the post-login "Enable biometrics?" prompt should be suppressed
   * because the user recently declined it. Fails open (returns false) on any
   * read error so a storage glitch never permanently hides the prompt.
   */
  static async shouldSuppressPrompt(): Promise<boolean> {
    try {
      const raw = await SecureStore.getItemAsync(BIOMETRIC_PROMPT_DECLINE_KEY);
      if (!raw) return false;
      const { count = 0, lastAt = 0 } = JSON.parse(raw) as {
        count?: number;
        lastAt?: number;
      };
      if (count <= 0) return false;
      if (count >= MAX_DECLINES_BEFORE_SUPPRESS) return true;
      const backoffWindow =
        DECLINE_BACKOFF_MS[
          Math.min(count - 1, DECLINE_BACKOFF_MS.length - 1)
        ] ?? 0;
      return Date.now() - lastAt < backoffWindow;
    } catch {
      return false;
    }
  }

  private static async clearPromptDecline(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_PROMPT_DECLINE_KEY);
    } catch {
      /* non-fatal */
    }
  }
}
