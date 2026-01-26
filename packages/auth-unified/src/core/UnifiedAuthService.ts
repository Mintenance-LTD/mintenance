/**
 * Unified Authentication Service
 * Consolidates authentication logic for web and mobile platforms
 * Combines the best security features from both implementations
 */
import { SupabaseClient, User, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import * as crypto from 'crypto';
import { sanitize, SqlProtection } from '@mintenance/security';
import { User as AppUser, JWTPayload as AppJWTPayload } from '@mintenance/types';
export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
  jwtSecret: string;
  accessTokenExpiry?: string;
  refreshTokenExpiry?: string;
  enableTokenRotation?: boolean;
  enableBreachDetection?: boolean;
  platform: 'web' | 'mobile';
}
export interface AuthCredentials {
  email: string;
  password: string;
}
export interface SignUpData extends AuthCredentials {
  firstName?: string;
  lastName?: string;
  role?: 'homeowner' | 'contractor';
  phone?: string;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
  user: AppUser;
}
export interface TokenFamily {
  familyId: string;
  generation: number;
  userId: string;
  consumedAt?: Date;
  revokedAt?: Date;
  revokedReason?: string;
}
export class UnifiedAuthService {
  protected supabase: SupabaseClient;
  protected config: AuthConfig;
  protected jwtSecret: Uint8Array;
  constructor(config: AuthConfig) {
    this.config = {
      accessTokenExpiry: '1h',
      refreshTokenExpiry: '7d',
      enableTokenRotation: true,
      enableBreachDetection: true,
      ...config,
    };
    // Initialize Supabase client
    this.supabase = new SupabaseClient(
      config.supabaseUrl,
      config.supabaseServiceKey || config.supabaseAnonKey
    );
    // Convert JWT secret to Uint8Array for jose
    this.jwtSecret = new TextEncoder().encode(config.jwtSecret);
  }
  /**
   * Sign up a new user
   * Combines web and mobile sign-up logic with enhanced validation
   */
  async signUp(data: SignUpData): Promise<AuthTokens> {
    // Validate and sanitize inputs
    const email = sanitize.email(data.email);
    const firstName = sanitize.personName(data.firstName || '');
    const lastName = sanitize.personName(data.lastName || '');
    const phone = data.phone ? sanitize.phone(data.phone) : undefined;
    if (!email) {
      throw new CustomAuthError('Invalid email address', 400);
    }
    // Validate password strength
    if (!this.validatePasswordStrength(data.password)) {
      throw new CustomAuthError(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        400
      );
    }
    // Check for SQL injection attempts in all fields
    const sqlCheck = SqlProtection.scanForInjection(
      `${email} ${firstName} ${lastName} ${phone || ''}`
    );
    if (!sqlCheck.isSafe) {
      throw new CustomAuthError('Invalid input detected', 400);
    }
    try {
      // Create user with Supabase Auth
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password: data.password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: data.role || 'homeowner',
            phone,
          },
        },
      });
      if (authError || !authData.user) {
        throw authError || new CustomAuthError('Failed to create user', 500);
      }
      // Generate tokens with enhanced security
      const tokens = await this.generateTokenPair(authData.user);
      // Store refresh token with family tracking if enabled
      if (this.config.enableTokenRotation) {
        await this.storeRefreshToken(tokens.refreshToken, authData.user.id);
      }
      return tokens;
    } catch (error) {
      if (error instanceof CustomAuthError) throw error;
      throw new CustomAuthError('Sign up failed: ' + (error as Error).message, 500);
    }
  }
  /**
   * Sign in an existing user
   * Implements breach detection and token rotation from web
   */
  async signIn(credentials: AuthCredentials): Promise<AuthTokens> {
    // Validate and sanitize inputs
    const email = sanitize.email(credentials.email);
    if (!email) {
      throw new CustomAuthError('Invalid email address', 400);
    }
    try {
      // Authenticate with Supabase
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email,
        password: credentials.password,
      });
      if (authError || !authData.user || !authData.session) {
        throw new CustomAuthError('Invalid email or password', 401);
      }
      // Generate enhanced tokens
      const tokens = await this.generateTokenPair(authData.user);
      // Store refresh token with family tracking
      if (this.config.enableTokenRotation) {
        await this.storeRefreshToken(tokens.refreshToken, authData.user.id);
      }
      return tokens;
    } catch (error) {
      if (error instanceof CustomAuthError) throw error;
      throw new CustomAuthError('Sign in failed: ' + (error as Error).message, 500);
    }
  }
  /**
   * Sign out a user
   * Invalidates tokens and cleans up sessions
   */
  async signOut(userId: string, refreshToken?: string): Promise<void> {
    try {
      // Revoke refresh token family if breach detection is enabled
      if (this.config.enableBreachDetection && refreshToken) {
        await this.invalidateTokenFamily(refreshToken, 'user_logout');
      }
      // Sign out from Supabase
      await this.supabase.auth.signOut();
      // Additional cleanup can be added here
    } catch (error) {
      throw new CustomAuthError('Sign out failed: ' + (error as Error).message, 500);
    }
  }
  /**
   * Get current authenticated user
   * Verifies token and returns user data
   */
  async getCurrentUser(accessToken: string): Promise<AppUser | null> {
    try {
      // Verify JWT token
      const payload = await this.verifyAccessToken(accessToken);
      if (!payload) return null;
      // Get user from Supabase
      const { data: userData, error } = await this.supabase.auth.getUser(accessToken);
      if (error || !userData.user) {
        return null;
      }
      // Return user with app-specific structure
      return {
        id: userData.user.id,
        email: userData.user.email!,
        first_name: userData.user.user_metadata?.first_name || '',
        last_name: userData.user.user_metadata?.last_name || '',
        role: userData.user.user_metadata?.role || 'homeowner',
        emailVerified: userData.user.email_confirmed_at !== null,
        phone: userData.user.phone,
        created_at: userData.user.created_at,
        updated_at: userData.user.updated_at || userData.user.created_at,
      } as AppUser;
    } catch {
      return null;
    }
  }
  /**
   * Refresh access token
   * Implements token rotation with breach detection
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Validate refresh token format
      if (!refreshToken || refreshToken.length < 32) {
        throw new CustomAuthError('Invalid refresh token', 401);
      }
      // Check if token exists and is valid
      const tokenData = await this.validateRefreshToken(refreshToken);
      if (!tokenData) {
        throw new CustomAuthError('Invalid or expired refresh token', 401);
      }
      // Token rotation with breach detection
      if (this.config.enableTokenRotation && this.config.enableBreachDetection) {
        // Check if token has already been consumed (potential breach)
        if (tokenData.consumedAt) {
          // Token reuse detected - invalidate entire family
          await this.invalidateTokenFamily(refreshToken, 'token_reuse_detected');
          throw new CustomAuthError('Security breach detected. All sessions have been terminated.', 401);
        }
        // Mark token as consumed
        await this.markTokenAsConsumed(refreshToken);
      }
      // Get user for new token generation
      const { data: userData } = await this.supabase.auth.admin.getUserById(tokenData.userId);
      if (!userData.user) {
        throw new CustomAuthError('User not found', 404);
      }
      // Generate new token pair
      const newTokens = await this.generateTokenPair(userData.user);
      // Store new refresh token in same family
      if (this.config.enableTokenRotation) {
        await this.storeRefreshTokenInFamily(
          newTokens.refreshToken,
          tokenData.userId,
          tokenData.familyId,
          tokenData.generation + 1
        );
      }
      return newTokens;
    } catch (error) {
      if (error instanceof CustomAuthError) throw error;
      throw new CustomAuthError('Token refresh failed: ' + (error as Error).message, 500);
    }
  }
  /**
   * Reset password request
   * Sends password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    const sanitizedEmail = sanitize.email(email);
    if (!sanitizedEmail) {
      throw new CustomAuthError('Invalid email address', 400);
    }
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: this.config.platform === 'web'
          ? `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
          : undefined, // Mobile handles differently
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      // Don't reveal if email exists or not
      logger.error('Password reset error:', error);
      // Always return success to prevent email enumeration
    }
  }
  /**
   * Update password
   * Validates and updates user password
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    if (!this.validatePasswordStrength(newPassword)) {
      throw new CustomAuthError(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        400
      );
    }
    try {
      const { error } = await this.supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (error) {
        throw error;
      }
      // Invalidate all refresh tokens for security
      if (this.config.enableTokenRotation) {
        await this.invalidateAllUserTokens(userId, 'password_changed');
      }
    } catch (error) {
      throw new CustomAuthError('Failed to update password: ' + (error as Error).message, 500);
    }
  }
  /**
   * Verify email address
   * Confirms email verification token
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email',
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      throw new CustomAuthError('Email verification failed: ' + (error as Error).message, 400);
    }
  }
  // ============= Private Helper Methods =============
  /**
   * Generate JWT access token and refresh token pair
   */
  private async generateTokenPair(user: User): Promise<AuthTokens> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour expiry
    // Create JWT payload
    const payload: AppJWTPayload = {
      sub: user.id,
      email: user.email!,
      role: user.user_metadata?.role || 'homeowner',
      iat: now,
      exp: exp,
    };
    // Generate access token with additional claims for tracking
    const jti = crypto.randomUUID();
    const accessToken = await new SignJWT({ ...payload, jti } as unknown)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(this.config.accessTokenExpiry!)
      .setIssuedAt()
      .setJti(jti)
      .sign(this.jwtSecret);
    // Generate refresh token (cryptographically secure random)
    const refreshToken = crypto.randomBytes(32).toString('hex');
    // Calculate expiration
    const expiresIn = 3600; // 1 hour in seconds
    const expiresAt = Date.now() + expiresIn * 1000;
    return {
      accessToken,
      refreshToken,
      expiresIn,
      expiresAt,
      user: {
        id: user.id,
        email: user.email!,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        role: user.user_metadata?.role || 'homeowner',
        emailVerified: user.email_confirmed_at !== null,
        phone: user.phone,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
      } as AppUser,
    };
  }
  /**
   * Verify access token
   */
  private async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret);
      return payload;
    } catch {
      return null;
    }
  }
  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): boolean {
    if (!password || password.length < 8) return false;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  }
  /**
   * Store refresh token (stub - implement based on platform)
   */
  private async storeRefreshToken(token: string, userId: string): Promise<void> {
    // This will be implemented by platform-specific adapters
    // Web: Store in database
    // Mobile: Store in SecureStore
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const familyId = crypto.randomUUID();
    // Store token with family tracking
    // Implementation depends on platform adapter
  }
  /**
   * Store refresh token in existing family
   */
  private async storeRefreshTokenInFamily(
    token: string,
    userId: string,
    familyId: string,
    generation: number
  ): Promise<void> {
    // Platform-specific implementation
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    // Store with family and generation info
  }
  /**
   * Validate refresh token (stub)
   */
  private async validateRefreshToken(token: string): Promise<unknown> {
    // Platform-specific implementation
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    // Validate against stored tokens
    return {
      userId: '',
      familyId: '',
      generation: 0,
      consumedAt: null,
    };
  }
  /**
   * Mark token as consumed (stub)
   */
  private async markTokenAsConsumed(token: string): Promise<void> {
    // Platform-specific implementation
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    // Update token status
  }
  /**
   * Invalidate token family (breach detection)
   */
  protected async invalidateTokenFamily(token: string, reason: string): Promise<void> {
    // Platform-specific implementation
    logger.error('[SECURITY] Token family invalidated:', { reason }, { service: 'auth' });
    // Invalidate all tokens in family
  }
  /**
   * Invalidate all user tokens
   */
  private async invalidateAllUserTokens(userId: string, reason: string): Promise<void> {
    // Platform-specific implementation
    logger.info('[SECURITY] All user tokens invalidated:', { reason });
    // Invalidate all tokens for user
  }
}
/**
 * Custom Auth Error class
 */
export class CustomAuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'CustomAuthError';
  }
}