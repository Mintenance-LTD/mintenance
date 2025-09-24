import { createToken, verifyToken, setAuthCookie, clearAuthCookie } from './auth';
import { DatabaseManager, type User, type CreateUserData } from './database';
import { config } from './config';

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
  async login(credentials: LoginCredentials): Promise<AuthResult> {
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

      // Create and set JWT token
      const token = await createToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      await setAuthCookie(token);

      return {
        success: true,
        user
      };

    } catch (error) {
      console.error('Login error:', error);
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
      // Validate email format
      if (!DatabaseManager.isValidEmail(userData.email)) {
        return {
          success: false,
          error: 'Please provide a valid email address'
        };
      }

      // Validate password strength
      const passwordValidation = DatabaseManager.isValidPassword(userData.password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.message
        };
      }

      // Check if user already exists
      const existingUser = await DatabaseManager.userExists(userData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'An account with this email already exists'
        };
      }

      // Create user
      const user = await DatabaseManager.createUser(userData);

      // Create and set JWT token for immediate login
      const token = await createToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      await setAuthCookie(token);

      return {
        success: true,
        user
      };

    } catch (error) {
      console.error('Registration error:', error);

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
   * Logout user by clearing authentication cookies
   */
  async logout(): Promise<void> {
    try {
      await clearAuthCookie();
    } catch (error) {
      console.error('Logout error:', error);
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
      console.error('Get current user error:', error);
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
      console.error('Token validation error:', error);
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
      console.error('Change password error:', error);
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
      console.error('Update profile error:', error);
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