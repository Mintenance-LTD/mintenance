/**
 * Shared Services Integration for Web App
 * This file provides the web-specific configuration for shared services
 */

import { AuthService, PaymentService, NotificationService } from '@mintenance/services';
import { createClient } from '@/lib/supabase/client';

// Get Supabase client
const supabase = createClient();

// Get environment configuration
const environment = (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Initialize shared services with web-specific configuration
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

// Web-specific service extensions
export class WebAuthService extends AuthService {
  /**
   * Web-specific: Handle OAuth login
   */
  async loginWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${this.apiUrl}/auth/callback`
      }
    });

    if (error) throw this.handleError(error);
    return data;
  }

  /**
   * Web-specific: Handle OAuth login with GitHub
   */
  async loginWithGitHub() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${this.apiUrl}/auth/callback`
      }
    });

    if (error) throw this.handleError(error);
    return data;
  }
}

// Create web-specific auth service instance
export const webAuthService = new WebAuthService({
  supabase,
  environment,
  apiUrl
});