/**
 * Mobile Platform Authentication Adapter
 * Handles SecureStore sessions, biometric auth, and offline capabilities
 */
import { UnifiedAuthService, AuthConfig, AuthTokens, SignUpData, AuthCredentials } from '../core/UnifiedAuthService';
import { logger } from '@mintenance/shared';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as crypto from 'crypto';
export interface MobileAuthConfig extends AuthConfig {
  enableBiometric?: boolean;
  enableOfflineMode?: boolean;
  sessionExpiryDays?: number;
  autoRefreshBeforeMinutes?: number;
}
export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: unknown;
  expiresAt: number;
  createdAt: number;
  biometricEnabled?: boolean;
}
export interface BiometricResult {
  success: boolean;
  error?: string;
}
export class MobileAuthAdapter extends UnifiedAuthService {
  private mobileConfig: MobileAuthConfig;
  private refreshTimer?: NodeJS.Timeout;
  private sessionKey = 'auth_session';
  private biometricKey = 'biometric_enabled';
  constructor(config: MobileAuthConfig) {
    super({ ...config, platform: 'mobile' });
    this.mobileConfig = {
      sessionExpiryDays: 7,
      autoRefreshBeforeMinutes: 5,
      ...config,
    };
  }
  /**
   * Sign in with biometric authentication if enabled
   */
  async signInWithBiometric(): Promise<AuthTokens | null> {
    if (!this.mobileConfig.enableBiometric) {
      throw new Error('Biometric authentication is not enabled');
    }
    // Check if biometric is available
    const isAvailable = await this.isBiometricAvailable();
    if (!isAvailable) {
      throw new Error('Biometric authentication is not available on this device');
    }
    // Authenticate with biometric
    const biometricResult = await this.authenticateBiometric();
    if (!biometricResult.success) {
      throw new Error(biometricResult.error || 'Biometric authentication failed');
    }
    // Retrieve stored session
    const session = await this.getStoredSession();
    if (!session) {
      throw new Error('No stored session found');
    }
    // Check if session is expired
    if (this.isSessionExpired(session)) {
      // Try to refresh
      try {
        const newTokens = await this.refreshAccessToken(session.refreshToken);
        await this.storeSession(newTokens);
        return newTokens;
      } catch {
        throw new Error('Session expired, please sign in again');
      }
    }
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
      expiresAt: session.expiresAt,
      user: session.user,
    };
  }
  /**
   * Override sign in to store session
   */
  async signIn(credentials: AuthCredentials): Promise<AuthTokens> {
    const tokens = await super.signIn(credentials);
    // Store session in SecureStore
    await this.storeSession(tokens);
    // Start auto-refresh timer
    this.startAutoRefreshTimer(tokens);
    return tokens;
  }
  /**
   * Override sign up to store session
   */
  async signUp(data: SignUpData): Promise<AuthTokens> {
    const tokens = await super.signUp(data);
    // Store session in SecureStore
    await this.storeSession(tokens);
    // Start auto-refresh timer
    this.startAutoRefreshTimer(tokens);
    return tokens;
  }
  /**
   * Override sign out to clear session
   */
  async signOut(userId: string, refreshToken?: string): Promise<void> {
    // Clear stored session
    await this.clearSession();
    // Stop auto-refresh timer
    this.stopAutoRefreshTimer();
    // Call parent sign out
    await super.signOut(userId, refreshToken);
  }
  /**
   * Store session in SecureStore
   */
  async storeSession(tokens: AuthTokens): Promise<void> {
    const session: StoredSession = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: tokens.user,
      expiresAt: tokens.expiresAt,
      createdAt: Date.now(),
      biometricEnabled: await this.isBiometricEnabled(),
    };
    try {
      await SecureStore.setItemAsync(
        this.sessionKey,
        JSON.stringify(session)
      );
    } catch (error) {
      logger.error('Failed to store session:', error);
      throw new Error('Failed to store authentication session');
    }
  }
  /**
   * Retrieve stored session from SecureStore
   */
  async getStoredSession(): Promise<StoredSession | null> {
    try {
      const sessionData = await SecureStore.getItemAsync(this.sessionKey);
      if (!sessionData) {
        return null;
      }
      const session = JSON.parse(sessionData) as StoredSession;
      // Check if session is too old (beyond configured expiry)
      const maxAge = this.mobileConfig.sessionExpiryDays! * 24 * 60 * 60 * 1000;
      if (Date.now() - session.createdAt > maxAge) {
        await this.clearSession();
        return null;
      }
      return session;
    } catch (error) {
      logger.error('Failed to retrieve session:', error);
      return null;
    }
  }
  /**
   * Clear stored session
   */
  async clearSession(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.sessionKey);
    } catch (error) {
      logger.error('Failed to clear session:', error);
    }
  }
  /**
   * Check if session is expired
   */
  isSessionExpired(session: StoredSession): boolean {
    return Date.now() >= session.expiresAt;
  }
  /**
   * Check if session needs refresh
   */
  shouldRefreshToken(session: StoredSession): boolean {
    const refreshThreshold = this.mobileConfig.autoRefreshBeforeMinutes! * 60 * 1000;
    return (session.expiresAt - Date.now()) <= refreshThreshold;
  }
  /**
   * Start auto-refresh timer
   */
  private startAutoRefreshTimer(tokens: AuthTokens): void {
    this.stopAutoRefreshTimer();
    // Calculate when to refresh (5 minutes before expiry)
    const refreshIn = Math.max(
      0,
      tokens.expiresAt - Date.now() - (this.mobileConfig.autoRefreshBeforeMinutes! * 60 * 1000)
    );
    this.refreshTimer = setTimeout(async () => {
      try {
        const session = await this.getStoredSession();
        if (session) {
          const newTokens = await this.refreshAccessToken(session.refreshToken);
          await this.storeSession(newTokens);
          this.startAutoRefreshTimer(newTokens);
        }
      } catch (error) {
        logger.error('Auto-refresh failed:', error);
        // User will need to sign in again
      }
    }, refreshIn);
  }
  /**
   * Stop auto-refresh timer
   */
  private stopAutoRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }
  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  }
  /**
   * Authenticate with biometric
   */
  async authenticateBiometric(): Promise<BiometricResult> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your account',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });
      return {
        success: result.success,
        error: result.success ? undefined : 'Authentication failed',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
  /**
   * Enable biometric authentication
   */
  async enableBiometric(): Promise<void> {
    if (!await this.isBiometricAvailable()) {
      throw new Error('Biometric authentication is not available');
    }
    const result = await this.authenticateBiometric();
    if (!result.success) {
      throw new Error('Biometric authentication failed');
    }
    await SecureStore.setItemAsync(this.biometricKey, 'true');
    // Update stored session
    const session = await this.getStoredSession();
    if (session) {
      session.biometricEnabled = true;
      await SecureStore.setItemAsync(this.sessionKey, JSON.stringify(session));
    }
  }
  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    await SecureStore.deleteItemAsync(this.biometricKey);
    // Update stored session
    const session = await this.getStoredSession();
    if (session) {
      session.biometricEnabled = false;
      await SecureStore.setItemAsync(this.sessionKey, JSON.stringify(session));
    }
  }
  /**
   * Check if biometric is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(this.biometricKey);
      return enabled === 'true';
    } catch {
      return false;
    }
  }
  /**
   * Restore session on app launch
   */
  async restoreSession(): Promise<AuthTokens | null> {
    const session = await this.getStoredSession();
    if (!session) {
      return null;
    }
    // Check if session is expired
    if (this.isSessionExpired(session)) {
      // Try to refresh
      try {
        const newTokens = await this.refreshAccessToken(session.refreshToken);
        await this.storeSession(newTokens);
        this.startAutoRefreshTimer(newTokens);
        return newTokens;
      } catch {
        // Session invalid, clear it
        await this.clearSession();
        return null;
      }
    }
    // Check if should refresh soon
    if (this.shouldRefreshToken(session)) {
      // Refresh in background
      this.refreshAccessToken(session.refreshToken)
        .then(async (newTokens) => {
          await this.storeSession(newTokens);
          this.startAutoRefreshTimer(newTokens);
        })
        .catch((error) => {
          logger.error('Background refresh failed:', error);
        });
    } else {
      // Start auto-refresh timer
      this.startAutoRefreshTimer({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
        expiresAt: session.expiresAt,
        user: session.user,
      });
    }
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
      expiresAt: session.expiresAt,
      user: session.user,
    };
  }
  /**
   * Handle offline mode
   */
  async getOfflineSession(): Promise<AuthTokens | null> {
    if (!this.mobileConfig.enableOfflineMode) {
      return null;
    }
    const session = await this.getStoredSession();
    if (!session) {
      return null;
    }
    // In offline mode, we return the stored session even if expired
    // The app should handle API errors and prompt for re-authentication
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: 0, // Indicate it may be expired
      expiresAt: session.expiresAt,
      user: session.user,
    };
  }
  /**
   * Sync session when coming back online
   */
  async syncOnlineSession(): Promise<AuthTokens | null> {
    const session = await this.getStoredSession();
    if (!session) {
      return null;
    }
    try {
      // Always refresh when coming back online
      const newTokens = await this.refreshAccessToken(session.refreshToken);
      await this.storeSession(newTokens);
      this.startAutoRefreshTimer(newTokens);
      return newTokens;
    } catch {
      // Session invalid, user needs to sign in again
      await this.clearSession();
      return null;
    }
  }
}