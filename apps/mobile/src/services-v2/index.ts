/**
 * Shared Services Integration for Mobile App
 * This file provides the mobile-specific configuration for shared services
 */

import { AuthService, PaymentService, NotificationService } from '@mintenance/services';
import { supabase } from '../config/supabase';
import { config } from '../config/environment';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { logger } from '@mintenance/shared';

// Get environment configuration
const environment = (config.environment || 'development') as 'development' | 'staging' | 'production';
const apiUrl = config.apiBaseUrl || 'http://localhost:3000';

// Initialize shared services with mobile-specific configuration
export const authService = new AuthService({
  supabase,
  environment,
  apiUrl
});

export const paymentService = new PaymentService({
  supabase,
  environment,
  apiUrl,
  apiBaseUrl: apiUrl
});

export const notificationService = new NotificationService({
  supabase,
  environment,
  apiUrl
});

// Export service types for convenience
export type {
  LoginCredentials,
  SignupData,
  AuthTokens
} from '@mintenance/services/dist/auth/AuthService';

export type {
  PaymentMethod,
  PaymentIntent,
  CreatePaymentIntentParams,
  EscrowTransaction
} from '@mintenance/services/dist/payment/PaymentService';

export type {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationPreferences,
  SendNotificationParams
} from '@mintenance/services/dist/notification/NotificationService';

// Mobile-specific service extensions
export class MobileAuthService extends AuthService {
  /**
   * Mobile-specific: Store token securely on device
   */
  async storeTokenSecurely(token: string): Promise<void> {
    await SecureStore.setItemAsync('auth_token', token);
  }

  /**
   * Mobile-specific: Retrieve token from secure storage
   */
  async getStoredToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('auth_token');
  }

  /**
   * Mobile-specific: Clear secure storage on logout
   */
  async logout(): Promise<void> {
    await super.logout();
    await SecureStore.deleteItemAsync('auth_token');
  }

  /**
   * Mobile-specific: Biometric authentication check
   */
  async authenticateWithBiometric(): Promise<boolean> {
    // This would integrate with expo-local-authentication
    // Placeholder for now
    return true;
  }
}

export class MobileNotificationService extends NotificationService {
  /**
   * Mobile-specific: Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.info('Failed to get push token for push notification!', [object Object], { service: 'mobile' });
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // Store the token in the database
    const user = await authService.getCurrentUser();
    if (user) {
      await this.savePushToken(user.id, token);
    }

    return token;
  }

  /**
   * Mobile-specific: Save push token to database
   */
  private async savePushToken(userId: string, token: string): Promise<void> {
    await this.supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token: token,
        platform: 'expo',
        updated_at: new Date().toISOString()
      });
  }

  /**
   * Mobile-specific: Handle notification received while app is foregrounded
   */
  setupNotificationHandlers() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Handle notification taps
    Notifications.addNotificationResponseReceivedListener(response => {
      logger.info('Notification tapped:', response', [object Object], { service: 'mobile' });
      // Navigate to appropriate screen based on notification data
    });
  }
}

// Create mobile-specific service instances
export const mobileAuthService = new MobileAuthService({
  supabase,
  environment,
  apiUrl
});

export const mobileNotificationService = new MobileNotificationService({
  supabase,
  environment,
  apiUrl
});

// Setup notification handlers on initialization
mobileNotificationService.setupNotificationHandlers();