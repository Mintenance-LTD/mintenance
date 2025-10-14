import { createToken, verifyToken, setAuthCookie, clearAuthCookie, createTokenPair, rotateTokens, revokeAllTokens } from './auth';
import { DatabaseManager, type User, type CreateUserData } from './database';
import { config } from './config';
import { logger } from '@mintenance/shared';

export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'password_hash'>;
  error?: string;
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
   * Authenticate user with email and password
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

      // Authenticate with database
      const user = await DatabaseManager.authenticateUser(email, password);

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Create and set JWT token pair
      const { accessToken, refreshToken } = await createTokenPair({
        id: user.id,
        email: user.email,
        role: user.role,
      }, undefined, undefined);

      await setAuthCookie(accessToken, rememberMe, refreshToken);
      // Note: Refresh token is stored in database AND as HTTP-only cookie

      return {
        success: true,
        user
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
      logger.info('Starting user registration', { email: userData.email, service: 'auth' });
      
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

      // Check if user already exists
      logger.info('Checking if user already exists', { email: userData.email, service: 'auth' });
      const existingUser = await DatabaseManager.userExists(userData.email);
      if (existingUser) {
        logger.warn('User already exists', { email: userData.email, service: 'auth' });
        return {
          success: false,
          error: 'An account with this email already exists'
        };
      }

      // Create user
      logger.info('Creating new user', { email: userData.email, service: 'auth' });
      const user = await DatabaseManager.createUser(userData);
      logger.info('User created successfully', { userId: user.id, email: user.email, service: 'auth' });

      // Create and set JWT token pair for immediate login
      logger.info('Creating JWT tokens', { userId: user.id, service: 'auth' });
      const { accessToken, refreshToken } = await createTokenPair({
        id: user.id,
        email: user.email,
        role: user.role,
      }, undefined, undefined);
      logger.info('JWT tokens created', { userId: user.id, service: 'auth' });

      logger.info('Setting authentication cookies', { userId: user.id, service: 'auth' });
      await setAuthCookie(accessToken, false, refreshToken);
      // Note: Refresh token is stored in database AND as HTTP-only cookie
      logger.info('Authentication cookies set', { userId: user.id, service: 'auth' });

      logger.info('Registration completed successfully', { userId: user.id, email: user.email, service: 'auth' });
      return {
        success: true,
        user
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