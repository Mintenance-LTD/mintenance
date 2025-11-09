import { createToken, verifyToken, setAuthCookie, clearAuthCookie, createTokenPair, rotateTokens, revokeAllTokens, createAuthCookieHeaders } from './auth';
import { DatabaseManager, type User, type CreateUserData } from './database';
import { config } from './config';
import { logger } from '@mintenance/shared';
import { serverSupabase } from './api/supabaseServer';

export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'password_hash'>;
  error?: string;
  cookieHeaders?: Headers;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends CreateUserData {}

/**
 * Unified authentication manager for web applications
 * Handles user authentication, registration, and session management
 */
export class AuthManager {
  private static instance: AuthManager;

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Authenticate user with email and password using Supabase Auth
   */
  async login(credentials: LoginCredentials, rememberMe: boolean = false): Promise<AuthResult> {
    try {
      const { email, password } = credentials;

      // Validate input
      if (!email?.trim() || !password?.trim()) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Validate email format
      if (!DatabaseManager.isValidEmail(email)) {
        return {
          success: false,
          error: 'Please provide a valid email address'
        };
      }

      logger.info('Attempting login with Supabase Auth', { email, service: 'auth' });

      // Authenticate with Supabase Auth
      const { data: authData, error: authError } = await serverSupabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        logger.error('Supabase Auth login failed', authError, { email, service: 'auth' });

        // Handle specific Supabase Auth errors with better messages
        if (authError.message?.includes('Invalid login credentials') || 
            authError.message?.includes('invalid_password')) {
          return {
            success: false,
            error: 'Invalid email or password'
          };
        }
        
        // Handle email confirmation requirement
        if (authError.message?.includes('email_not_confirmed') ||
            authError.message?.includes('Email not confirmed') ||
            authError.code === 'email_not_confirmed') {
          return {
            success: false,
            error: 'Please verify your email address before signing in. Check your inbox for a confirmation email.'
          };
        }
        
        // Handle rate limiting
        if (authError.message?.includes('too many requests') ||
            authError.message?.includes('rate limit')) {
          return {
            success: false,
            error: 'Too many login attempts. Please try again later.'
          };
        }

        return {
          success: false,
          error: authError.message || 'Login failed. Please try again.'
        };
      }

      if (!authData.user) {
        logger.error('No user returned from Supabase Auth login', undefined, { service: 'auth' });
        return {
          success: false,
          error: 'Login failed. Please try again.'
        };
      }

      logger.info('Supabase Auth login successful', { userId: authData.user.id, service: 'auth' });

      // Get user profile from public.users (created by trigger)
      const { data: userProfile, error: profileError } = await serverSupabase
        .from('users')
        .select('id, email, first_name, last_name, role, created_at, updated_at, email_verified, phone')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !userProfile) {
        logger.warn('User profile not found in public.users', { 
          userId: authData.user.id,
          error: profileError,
          service: 'auth' 
        });
        // Return fallback user from auth metadata
      }

      const user = userProfile || {
        id: authData.user.id,
        email: authData.user.email || email,
        first_name: authData.user.user_metadata?.first_name || '',
        last_name: authData.user.user_metadata?.last_name || '',
        role: authData.user.user_metadata?.role || 'homeowner',
        created_at: authData.user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: !!authData.user.email_confirmed_at,
        phone: undefined
      };

      // Create and set JWT token pair from Supabase session
      const { accessToken, refreshToken } = await createTokenPair({
        id: user.id,
        email: user.email,
        role: user.role,
      }, undefined, undefined);

      const cookieHeaders = createAuthCookieHeaders(accessToken, rememberMe, refreshToken);

      return {
        success: true,
        user,
        cookieHeaders
      };

    } catch (error) {
      logger.error('Login error', error, { service: 'auth' });
      return {
        success: false,
        error: 'An unexpected error occurred during login'
      };
    }
  }

  /**
   * Register new user
   */
  async register(userData: RegisterData): Promise<AuthResult> {
    try {
      logger.info('Starting user registration with Supabase Auth', { email: userData.email, service: 'auth' });
      
      // Validate email format
      if (!DatabaseManager.isValidEmail(userData.email)) {
        logger.warn('Invalid email format provided', { email: userData.email, service: 'auth' });
        return {
          success: false,
          error: 'Please provide a valid email address'
        };
      }

      // Validate password strength
      logger.info('Validating password strength', { service: 'auth' });
      const passwordValidation = DatabaseManager.isValidPassword(userData.password);
      if (!passwordValidation.valid) {
        logger.warn('Password validation failed', { 
          email: userData.email, 
          errors: passwordValidation.message, 
          service: 'auth' 
        });
        return {
          success: false,
          error: passwordValidation.message
        };
      }
      logger.info('Password validation passed', { service: 'auth' });

      // Use Supabase Auth to create user (unified with mobile app)
      logger.info('Creating user with Supabase Auth', { email: userData.email, service: 'auth' });
      const { data: authData, error: authError } = await serverSupabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            role: userData.role,
            phone: userData.phone || null,
            full_name: `${userData.first_name} ${userData.last_name}`,
          },
        },
      });

      if (authError) {
        logger.error('Supabase Auth registration failed', authError, { 
          email: userData.email, 
          service: 'auth' 
        });
        
        // Handle specific Supabase Auth errors
        if (authError.message.includes('already registered') || 
            authError.message.includes('already exists') ||
            authError.message.includes('User already registered') ||
            authError.message.includes('email address is already registered')) {
          logger.warn('Registration attempted with existing email', { email: userData.email, service: 'auth' });
          return {
            success: false,
            error: 'An account with this email already exists. Please sign in instead.'
          };
        }
        
        // Handle other specific errors
        if (authError.message.includes('Password should be at least')) {
          return {
            success: false,
            error: 'Password is too short. Please use a password with at least 8 characters.'
          };
        }
        
        return {
          success: false,
          error: authError.message || 'Registration failed. Please try again.'
        };
      }

      if (!authData.user) {
        logger.error('No user returned from Supabase Auth', undefined, { service: 'auth' });
        return {
          success: false,
          error: 'Registration failed. Please try again.'
        };
      }

      logger.info('User created in Supabase Auth', { 
        userId: authData.user.id, 
        email: authData.user.email, 
        service: 'auth' 
      });

      // Wait for the database trigger to create profile in public.users
      // Retry up to 3 times with increasing delays
      let publicUserProfile = null;
      let fetchError = null;
      const maxRetries = 3;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        
        const { data, error } = await serverSupabase
          .from('users')
          .select('id, email, first_name, last_name, role, created_at, updated_at, email_verified, phone')
          .eq('id', authData.user.id)
          .single();
        
        if (data && !error) {
          publicUserProfile = data;
          fetchError = null;
          break;
        }
        
        fetchError = error;
        logger.warn(`Attempt ${attempt + 1} to fetch user profile failed`, { 
          userId: authData.user.id,
          error: fetchError,
          service: 'auth' 
        });
      }

      if (fetchError || !publicUserProfile) {
        logger.warn('User not found in public.users after trigger retries', { 
          userId: authData.user.id,
          error: fetchError,
          service: 'auth' 
        });
        
        // Try to manually create the profile if trigger failed
        try {
          const { data: manualProfile, error: manualError } = await serverSupabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: authData.user.email || userData.email,
              first_name: userData.first_name,
              last_name: userData.last_name,
              role: userData.role,
              phone: userData.phone || null,
              email_verified: authData.user.email_confirmed_at ? true : false,
              password_hash: null, // Supabase Auth users don't have password_hash
            })
            .select('id, email, first_name, last_name, role, created_at, updated_at, email_verified, phone')
            .single();
          
          if (manualProfile && !manualError) {
            logger.info('Manually created user profile after trigger failure', { userId: authData.user.id, service: 'auth' });
            publicUserProfile = manualProfile;
          }
        } catch (manualError) {
          logger.error('Failed to manually create user profile', manualError, { userId: authData.user.id, service: 'auth' });
          // Continue with fallback user data
        }
      }

      const user = publicUserProfile || {
        id: authData.user.id,
        email: authData.user.email || userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: authData.user.email_confirmed_at ? true : false,
        phone: undefined
      };

      // Create and set JWT token pair for immediate login
      logger.info('Creating JWT tokens', { userId: user.id, service: 'auth' });
      const { accessToken, refreshToken } = await createTokenPair({
        id: user.id,
        email: user.email,
        role: user.role,
      }, undefined, undefined);
      logger.info('JWT tokens created', { userId: user.id, service: 'auth' });

      logger.info('Creating authentication cookie headers', { userId: user.id, service: 'auth' });
      const cookieHeaders = createAuthCookieHeaders(accessToken, false, refreshToken);
      logger.info('Authentication cookie headers created', { userId: user.id, service: 'auth' });

      logger.info('Registration completed successfully', { userId: user.id, email: user.email, service: 'auth' });
      return {
        success: true,
        user,
        cookieHeaders
      };

    } catch (error) {
      logger.error('Registration error', error, { service: 'auth' });

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          return {
            success: false,
            error: 'An account with this email already exists'
          };
        }
      }

      return {
        success: false,
        error: 'An unexpected error occurred during registration'
      };
    }
  }

  /**
   * Logout user by clearing authentication cookies and revoking tokens
   */
  async logout(userId?: string): Promise<void> {
    try {
      // Revoke all refresh tokens for the user
      if (userId) {
        await revokeAllTokens(userId);
      }
      
      await clearAuthCookie();
    } catch (error) {
      logger.error('Logout error', error, { service: 'auth' });
      // Don't throw error for logout - always clear locally
    }
  }

  /**
   * Get current authenticated user from token
   */
  async getCurrentUser(token?: string): Promise<Omit<User, 'password_hash'> | null> {
    try {
      if (!token) {
        return null;
      }

      // Verify token
      const payload = await verifyToken(token);
      if (!payload || !payload.sub) {
        return null;
      }

      // Get fresh user data from database
      const user = await DatabaseManager.getUserById(payload.sub);
      return user;

    } catch (error) {
      logger.error('Get current user error', error, { service: 'auth' });
      return null;
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
    try {
      if (!token) {
        return { valid: false, error: 'No token provided' };
      }

      const payload = await verifyToken(token);

      if (!payload || !payload.sub) {
        return { valid: false, error: 'Invalid token' };
      }

      // Check if user still exists
      const user = await DatabaseManager.getUserById(payload.sub);
      if (!user) {
        return { valid: false, error: 'User no longer exists' };
      }

      return { valid: true, userId: payload.sub };

    } catch (error) {
      logger.error('Token validation error', error, { service: 'auth' });
      return { valid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      // Get user to verify current password
      const user = await DatabaseManager.getUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify current password by attempting authentication
      const authResult = await DatabaseManager.authenticateUser(user.email, currentPassword);
      if (!authResult) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Validate new password strength
      const passwordValidation = DatabaseManager.isValidPassword(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.message
        };
      }

      // Update password
      const success = await DatabaseManager.updateUserPassword(userId, newPassword);

      if (!success) {
        return {
          success: false,
          error: 'Failed to update password'
        };
      }

      return {
        success: true,
        user
      };

    } catch (error) {
      logger.error('Change password error', error, { service: 'auth' });
      return {
        success: false,
        error: 'An unexpected error occurred while changing password'
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<Pick<User, 'first_name' | 'last_name' | 'phone'>>): Promise<AuthResult> {
    try {
      const updatedUser = await DatabaseManager.updateUser(userId, updates);

      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to update profile'
        };
      }

      return {
        success: true,
        user: updatedUser
      };

    } catch (error) {
      logger.error('Update profile error', error, { service: 'auth' });
      return {
        success: false,
        error: 'An unexpected error occurred while updating profile'
      };
    }
  }

  /**
   * Check if the application is running in production mode
   */
  isProduction(): boolean {
    return config.isProduction();
  }

  /**
   * Get user-safe error messages (no internal details exposed)
   */
  private getSafeErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      // Only expose specific known safe error messages
      const safeMessages = [
        'User not found',
        'Invalid email or password',
        'Email already exists',
        'Password requirements not met'
      ];

      for (const safeMessage of safeMessages) {
        if (error.message.includes(safeMessage)) {
          return error.message;
        }
      }
    }

    // Default generic message for security
    return 'An unexpected error occurred';
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();