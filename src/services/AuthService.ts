import { supabase } from '../config/supabase';
import { User } from '../types';

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'homeowner' | 'contractor';
}

export class AuthService {
  static async signUp(userData: SignUpData) : Promise<void> {
    // Validation
    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      throw new Error('Invalid email format');
    }
    
    if (!userData.password || userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    
    if (!userData.firstName.trim()) {
      throw new Error('First name is required');
    }
    
    if (!userData.lastName.trim()) {
      throw new Error('Last name is required');
    }

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
      // Provide more user-friendly error messages for registration
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please check your email and confirm your account before signing in.');
      } else if (error.message.includes('User already registered')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      } else if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      } else if (error.message.includes('Invalid email')) {
        throw new Error('Please enter a valid email address.');
      } else if (error.message.includes('Password')) {
        throw new Error('Password must be at least 8 characters long.');
      } else if (error.message.includes('row-level security') || error.message.includes('policy')) {
        throw new Error('Database security configuration issue. Please contact support.');
      } else {
        throw new Error(`Registration failed: ${error.message}`);
      }
    }
    
    // User profile is automatically created by the handle_new_user trigger
    // No manual profile creation needed
    
    return data;
  }

  static async signIn(email: string, password: string) : Promise<void> {
    // Validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }
    
    if (!password) {
      throw new Error('Password is required');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Provide more user-friendly error messages for sign in
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please check your email and confirm your account before signing in.');
      } else if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      } else {
        throw new Error(`Sign in failed: ${error.message}`);
      }
    }
    
    // Get user profile
    if (data.user) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      return {
        user: userProfile,
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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) return null;

    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return userProfile;
  }

  static async getCurrentSession() : Promise<void> {
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
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session);
    });
  }

  // Validate JWT token
  static validateToken(token: string): boolean {
    try {
      // Simple JWT format validation
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Try to decode the payload
      const payload = JSON.parse(atob(parts[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
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