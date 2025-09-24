import { supabase } from '../config/supabase';
import { User } from '../types';
import type { Database } from '../types/database';
import { ServiceErrorHandler } from '../utils/serviceErrorHandler';
import { NetworkDiagnosticsService } from '../utils/networkDiagnostics';
import { logger } from '../utils/logger';

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'homeowner' | 'contractor';
}

export class AuthService {
  static async signUp(userData: SignUpData): Promise<any> {
    const context = {
      service: 'AuthService',
      method: 'signUp',
      userId: undefined,
      params: { email: userData.email, role: userData.role },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      // Validation using ServiceErrorHandler
      ServiceErrorHandler.validateRequired(userData.email, 'Email', context);
      ServiceErrorHandler.validateEmail(userData.email, context);
      ServiceErrorHandler.validateRequired(userData.password, 'Password', context);
      ServiceErrorHandler.validatePassword(userData.password, context);
      ServiceErrorHandler.validateRequired(userData.firstName, 'First name', context);
      ServiceErrorHandler.validateRequired(userData.lastName, 'Last name', context);

      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role,
            full_name: `${userData.firstName} ${userData.lastName}`,
          },
        },
      });

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      // User profile is automatically created by the handle_new_user trigger
      // No manual profile creation needed

      return data;
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to sign up user');
    }

    return result.data;
  }

  static async signIn(
    email: string,
    password: string
  ): Promise<{ user: any; session: any } | any> {
    const context = {
      service: 'AuthService',
      method: 'signIn',
      userId: undefined,
      params: { email },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      // Validation using ServiceErrorHandler
      ServiceErrorHandler.validateRequired(email, 'Email', context);
      ServiceErrorHandler.validateEmail(email, context);
      ServiceErrorHandler.validateRequired(password, 'Password', context);

      logger.info('🔐 Attempting login with Supabase...', { email, timestamp: new Date().toISOString() });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('❌ Supabase auth error:', error);

        // Handle specific network errors
        if (error.message?.toLowerCase().includes('network request failed') ||
            error.message?.toLowerCase().includes('fetch')) {
          throw ServiceErrorHandler.handleNetworkError(error, context);
        }

        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      logger.info('✅ Supabase auth successful');

      // Get user profile
      if (data.user) {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          logger.warn('Profile fetch error:', profileError);
          // Return user data from auth even if profile fetch fails
          const fallbackUser = {
            id: data.user.id,
            email: data.user.email || '',
            first_name: data.user.user_metadata?.first_name || '',
            last_name: data.user.user_metadata?.last_name || '',
            role: data.user.user_metadata?.role || 'homeowner',
            created_at: data.user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Computed fields for backward compatibility
            firstName: data.user.user_metadata?.first_name || '',
            lastName: data.user.user_metadata?.last_name || '',
            createdAt: data.user.created_at || new Date().toISOString(),
          };

          return {
            user: fallbackUser,
            session: data.session,
          };
        }

        // Add computed fields for backward compatibility
        const enhancedProfile = userProfile
          ? {
              ...userProfile,
              firstName: userProfile.first_name,
              lastName: userProfile.last_name,
              createdAt: userProfile.created_at,
            }
          : null;

        return {
          user: enhancedProfile,
          session: data.session,
        };
      }

      return data;
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
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return null;

      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.warn('Profile fetch error:', error);
        // Return fallback user data from auth metadata
        return {
          id: session.user.id,
          email: session.user.email || '',
          first_name: session.user.user_metadata?.first_name || '',
          last_name: session.user.user_metadata?.last_name || '',
          role: session.user.user_metadata?.role || 'homeowner',
          created_at: session.user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Computed fields for backward compatibility
          firstName: session.user.user_metadata?.first_name || '',
          lastName: session.user.user_metadata?.last_name || '',
          createdAt: session.user.created_at || new Date().toISOString(),
        };
      }

      // Add computed fields for backward compatibility
      if (userProfile) {
        return {
          ...userProfile,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          createdAt: userProfile.created_at,
        };
      }

      return userProfile;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  static async getCurrentSession(): Promise<any> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  }

  static async updateUserProfile(
    userId: string,
    updates: Partial<User>
  ): Promise<User> {
    // Validation
    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      throw new Error('Invalid email format');
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async resetPassword(email: string): Promise<void> {
    // Validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Please enter a valid email address');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      // Provide more user-friendly error messages for password reset
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

  static onAuthStateChange(callback: (session: any) => void) {
    return supabase.auth.onAuthStateChange((event: any, session: any) => {
      callback(session);
    });
  }

  // Validate JWT token with proper signature verification
  static async validateToken(token: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
    try {
      if (!token) {
        return { valid: false, error: 'No token provided' };
      }

      // Simple JWT format validation first
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' };
      }

      // Use Supabase's built-in JWT verification which validates signature
      const { data: user, error } = await supabase.auth.getUser(token);

      if (error) {
        return { valid: false, error: error.message };
      }

      if (!user?.user) {
        return { valid: false, error: 'Invalid or expired token' };
      }

      // Additional security checks
      const payload = this.decodeJWTPayload(token);
      if (!payload) {
        return { valid: false, error: 'Cannot decode token payload' };
      }

      // Verify token is not expired (extra check beyond Supabase validation)
      if (payload.exp && Number(payload.exp) < Date.now() / 1000) {
        return { valid: false, error: 'Token expired' };
      }

      // Verify issuer if configured
      if (payload.iss && !payload.iss.includes('supabase')) {
        return { valid: false, error: 'Invalid token issuer' };
      }

      return { valid: true, userId: user.user.id };
    } catch (error) {
      return { valid: false, error: 'Token validation failed' };
    }
  }

  // Helper method to safely decode JWT payload without signature verification (for additional checks)
  private static decodeJWTPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Safe base64 decode
      const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      let decoded = '';

      const g: any = globalThis as any;
      if (typeof g.atob === 'function') {
        decoded = g.atob(base64Url);
      } else if (typeof Buffer !== 'undefined') {
        decoded = Buffer.from(base64Url, 'base64').toString('utf8');
      } else {
        return null;
      }

      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }


  // Restore a session using stored biometric tokens
  static async restoreSessionFromBiometricTokens({
    accessToken,
    refreshToken,
  }: { accessToken: string; refreshToken: string }): Promise<{ user: User | null; session: any }> {
    if (!refreshToken) {
      throw new Error('We could not restore your session. Please sign in with your password.');
    }

    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        throw error;
      }

      const session = data.session;
      const user = await this.getCurrentUser();
      return { user, session };
    } catch (error) {
      logger.error('Failed to restore session from biometric tokens', error);
      throw new Error('Unable to restore session from biometric credentials.');
    }
  }

  // Refresh session token
  static async refreshToken(): Promise<any> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data;
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return !!session?.access_token;
  }
}
