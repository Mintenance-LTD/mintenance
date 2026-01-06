import { BaseService, ServiceConfig, ServiceError } from '../base';
import { User } from '@mintenance/types';
import { AuthError, Session } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData extends LoginCredentials {
  firstName: string;
  lastName: string;
  role: 'homeowner' | 'contractor' | 'admin';
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class AuthService extends BaseService {
  private currentSession: Session | null = null;

  // Core authentication methods
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) throw error;
      if (!data.user) throw new Error('Login failed');

      this.currentSession = data.session;

      // Fetch full user profile
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User profile not found');

      return user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async signup(data: SignupData): Promise<User> {
    try {
      // Create auth user
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.role
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');

      // Create profile
      const { error: profileError } = await this.supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role,
          phone: data.phone
        });

      if (profileError) throw profileError;

      return this.fromDatabase<User>({
        id: authData.user.id,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        phone: data.phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      this.currentSession = null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();

      if (error || !user) return null;

      // Fetch profile data
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) return null;

      return this.fromDatabase<User>(profile);
    } catch (error) {
      logger.error('Get current user error:', error', [object Object], { service: 'general' });
      return null;
    }
  }

  async refreshToken(): Promise<AuthTokens | null> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error || !data.session) return null;

      this.currentSession = data.session;

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at || 0
      };
    } catch (error) {
      logger.error('Refresh token error:', error', [object Object], { service: 'general' });
      return null;
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      return !error;
    } catch (error) {
      logger.error('Email verification error:', error', [object Object], { service: 'general' });
      return false;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${this.apiUrl}/reset-password`
      });

      if (error) throw error;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Session management
  getSession(): Session | null {
    return this.currentSession;
  }

  isAuthenticated(): boolean {
    return !!this.currentSession;
  }

  // Role checking
  async hasRole(role: 'homeowner' | 'contractor' | 'admin'): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === role;
  }

  async isAdmin(): Promise<boolean> {
    return this.hasRole('admin');
  }

  async isContractor(): Promise<boolean> {
    return this.hasRole('contractor');
  }

  async isHomeowner(): Promise<boolean> {
    return this.hasRole('homeowner');
  }
}