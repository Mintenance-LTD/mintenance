import { supabase } from '../config/supabase';
import type { User } from '@mintenance/types';
import { Session } from '@supabase/supabase-js';
import { ServiceErrorHandler } from '../utils/serviceErrorHandler';
import { logger } from '../utils/logger';
import { checkRateLimit, resetRateLimit } from '../middleware/RateLimiter';
import { mobileApiClient } from '../utils/mobileApiClient';

import {
  validateEmailFormat,
  validatePasswordStrength,
} from './auth/validators';
import {
  validateToken as runValidateToken,
  type TokenValidationResult,
} from './auth/jwt';
import {
  getCurrentSession as readCurrentSession,
  getCurrentUser as readCurrentUser,
  resolveSignedInUser,
  updateUserProfile as runUpdateUserProfile,
} from './auth/profile-fetch';
import { restoreSessionFromBiometricTokens as runBiometricRestore } from './auth/biometric-restore';

/**
 * AuthService — façade over Supabase auth + the canonical web profile
 * API. Refactored 2026-05-09: validators, JWT helpers, profile fetch,
 * and biometric session restore extracted to `services/auth/*`. This
 * file is the orchestrating class with sign-up / sign-in / reset
 * flows and re-exports the public types.
 */

// Re-exports so existing `import { ... } from '@/services/AuthService'`
// imports continue to work without sweeping every consumer.
export type { TokenValidationResult } from './auth/jwt';

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'homeowner' | 'contractor';
  /** 2026-05-23: forwarded to Supabase signup options.data so the
   *  handle_new_user trigger persists it to profiles.phone. The
   *  registration form validates this as required for contractors
   *  (useRegistrationForm) but the API contract is optional so
   *  legacy callers and homeowners can omit it. */
  phone?: string;
}

export class AuthService {
  static async signUp(userData: SignUpData): Promise<unknown> {
    const context = {
      service: 'AuthService',
      method: 'signUp',
      userId: undefined,
      params: { email: userData.email, role: userData.role },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      if (!checkRateLimit('auth_register', userData.email)) {
        throw new Error(
          'Too many registration attempts. Please try again later.'
        );
      }

      ServiceErrorHandler.validateRequired(userData.email, 'Email', context);
      if (!validateEmailFormat(userData.email)) {
        throw new Error('Please enter a valid email address');
      }
      ServiceErrorHandler.validateRequired(
        userData.password,
        'Password',
        context
      );
      const passwordResult = validatePasswordStrength(userData.password);
      if (!passwordResult.valid) {
        throw new Error(
          passwordResult.message || 'Password does not meet requirements'
        );
      }
      ServiceErrorHandler.validateRequired(
        userData.firstName,
        'First name',
        context
      );
      ServiceErrorHandler.validateRequired(
        userData.lastName,
        'Last name',
        context
      );

      // SECURITY: HIBP breach check via web API. Mobile cannot run
      // SHA-1 + range fetch locally without adding a crypto dep.
      // Fails open on network error so a flaky connection doesn't
      // lock users out of signup.
      try {
        const breachResult = await mobileApiClient.post<{
          isBreached: boolean;
          occurrences: number | null;
        }>('/api/auth/check-password-breach', {
          password: userData.password,
        });
        if (breachResult.isBreached) {
          throw new Error(
            `This password has been exposed in ${(
              breachResult.occurrences ?? 0
            ).toLocaleString()} data breaches. ` +
              `Please choose a different, more secure password.`
          );
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('This password')) {
          throw err;
        }
        logger.warn(
          '[AUTH] Password breach check failed, proceeding (fail-open)',
          err
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role,
            full_name: `${userData.firstName} ${userData.lastName}`,
            // 2026-05-23: snake_case to match the trigger's
            // raw_user_meta_data->>'phone' read.
            ...(userData.phone ? { phone: userData.phone.trim() } : {}),
          },
        },
      });

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      // The handle_new_user trigger creates the profile row. The
      // contractor-trial side-effect that web's /api/auth/register
      // does is wired into performSignIn (auth-actions.ts) instead
      // of here, because signUp may not yield a session immediately
      // when email confirmation is required.
      return data;
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to sign up user');
    }
    return result.data;
  }

  /**
   * Re-issue the email-confirmation link for an unverified signup.
   * Supabase throttles resends on the server (~60s default); the UI
   * should additionally rate-limit the button visually.
   */
  static async resendSignupConfirmation(email: string): Promise<void> {
    const context = {
      service: 'AuthService',
      method: 'resendSignupConfirmation',
      userId: undefined,
      params: { email },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(email, 'Email', context);
      if (!validateEmailFormat(email)) {
        throw new Error('Please enter a valid email address');
      }

      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }
      logger.info('[AUTH] Resent signup confirmation email');
      return null;
    }, context);

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to resend email');
    }
  }

  static async signIn(
    email: string,
    password: string
  ): Promise<{ user: User | null; session: Session | null }> {
    const context = {
      service: 'AuthService',
      method: 'signIn',
      userId: undefined,
      params: { email },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      if (!checkRateLimit('auth_login', email)) {
        throw new Error(
          'Too many login attempts. Please try again in 15 minutes.'
        );
      }

      ServiceErrorHandler.validateRequired(email, 'Email', context);
      ServiceErrorHandler.validateEmail(email, context);
      ServiceErrorHandler.validateRequired(password, 'Password', context);

      logger.info('Attempting login with Supabase...', {
        email: email.replace(/(.{2}).+(@.+)/, '$1***$2'),
        timestamp: new Date().toISOString(),
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('❌ Supabase auth error:', error);
        if (
          error.message?.toLowerCase().includes('network request failed') ||
          error.message?.toLowerCase().includes('fetch')
        ) {
          throw ServiceErrorHandler.handleNetworkError(error, context);
        }
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      logger.info('✅ Supabase auth successful');
      resetRateLimit('auth_login', email);

      if (data.user) {
        return resolveSignedInUser(data.user, data.session);
      }

      return data as unknown as { user: User | null; session: Session | null };
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to sign in user');
    }
    return result.data;
  }

  static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser(): Promise<User | null> {
    return readCurrentUser();
  }

  static async getCurrentSession(): Promise<unknown> {
    return readCurrentSession();
  }

  static async updateUserProfile(
    userId: string,
    updates: Partial<User>
  ): Promise<User> {
    return runUpdateUserProfile(userId, updates);
  }

  static async resetPassword(email: string): Promise<void> {
    if (!email || !validateEmailFormat(email)) {
      throw new Error('Please enter a valid email address');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      if (
        error.message.includes('Network request failed') ||
        error.message.includes('fetch')
      ) {
        throw new Error(
          'Network connection failed. Please check your internet connection and try again.'
        );
      } else if (error.message.includes('Invalid email')) {
        throw new Error('Please enter a valid email address.');
      } else {
        throw new Error(`Password reset failed: ${error.message}`);
      }
    }
  }

  static onAuthStateChange(
    callback: (event: string, session: unknown) => void
  ) {
    return supabase.auth.onAuthStateChange(
      (event: unknown, session: unknown) => {
        callback(event as string, session);
      }
    );
  }

  static async validateToken(token: string): Promise<TokenValidationResult> {
    return runValidateToken(token);
  }

  static async restoreSessionFromBiometricTokens(args: {
    accessToken: string;
    refreshToken: string;
  }): Promise<{ user: User | null; session: Session | null }> {
    return runBiometricRestore(args);
  }

  static async refreshToken(): Promise<unknown> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data;
  }

  static async isAuthenticated(): Promise<boolean> {
    const session = (await this.getCurrentSession()) as Session | null;
    return !!session?.access_token;
  }
}
