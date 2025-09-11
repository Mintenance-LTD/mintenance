import { supabase } from '../config/supabase';
import { User } from '../types';
import { ErrorHandler } from '../utils/errorHandler';

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'homeowner' | 'contractor';
}

export class AuthService {
  static async signUp(userData: SignUpData) : Promise<any> {
    // Validation using ErrorHandler
    ErrorHandler.validateEmail(userData.email);
    ErrorHandler.validatePassword(userData.password);
    ErrorHandler.validateRequired(userData.firstName, 'First name');
    ErrorHandler.validateRequired(userData.lastName, 'Last name');

    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          full_name: `${userData.firstName} ${userData.lastName}`
        }
      }
    });

    if (error) {
      const userMessage = ErrorHandler.getUserMessage(error);
      throw ErrorHandler.createError(error.message, error.code, userMessage);
    }
    
    // User profile is automatically created by the handle_new_user trigger
    // No manual profile creation needed
    
    return data;
  }

  static async signIn(email: string, password: string) : Promise<{user: any, session: any} | any> {
    // Validation using ErrorHandler
    ErrorHandler.validateEmail(email);
    ErrorHandler.validateRequired(password, 'Password');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const userMessage = ErrorHandler.getUserMessage(error);
      throw ErrorHandler.createError(error.message, error.code, userMessage);
    }
    
    // Get user profile
    if (data.user) {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.warn('Profile fetch error:', profileError);
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
          session: data.session
        };
      }
      
      // Add computed fields for backward compatibility
      const enhancedProfile = userProfile ? {
        ...userProfile,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        createdAt: userProfile.created_at,
      } : null;
      
      return {
        user: enhancedProfile,
        session: data.session
      };
    }
    
    return data;
  }

  static async signOut() : Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
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

  static async getCurrentSession() : Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  static async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
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
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
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

  // Validate JWT token
  static validateToken(token: string): boolean {
    try {
      // Simple JWT format validation
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      // Safe base64 decode that works in Node (tests) and RN
      const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      let decoded = '';
      try {
        // Prefer global atob when available (some RN envs polyfill it)
        const g: any = (globalThis as any);
        if (typeof g.atob === 'function') {
          decoded = g.atob(base64Url);
        } else if (typeof Buffer !== 'undefined') {
          decoded = Buffer.from(base64Url, 'base64').toString('utf8');
        } else {
          // Last resort: manual decode failure -> consider invalid
          return false;
        }
      } catch {
        return false;
      }

      let payload: any;
      try {
        payload = JSON.parse(decoded);
      } catch {
        return false;
      }

      // Check expiry (exp is in seconds)
      if (payload?.exp && Number(payload.exp) < Date.now() / 1000) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
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
