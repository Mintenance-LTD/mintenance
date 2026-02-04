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
   * Store refresh token with new family ID
   * Creates a new token family for initial signup/signin
   */
  private async storeRefreshToken(token: string, userId: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const familyId = crypto.randomUUID();

    const { error } = await this.supabase.from('refresh_tokens').insert({
      user_id: userId,
      token_hash: tokenHash,
      family_id: familyId,
      generation: 0,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    if (error) {
      logger.error('Failed to store refresh token', { error, userId }, { service: 'auth' });
      throw new CustomAuthError('Failed to store refresh token', 500);
    }

    logger.debug('Refresh token stored successfully', { userId, familyId, generation: 0 }, { service: 'auth' });
  }
  /**
   * Store refresh token in existing family
   * Used for token rotation - preserves family_id and increments generation
   */
  private async storeRefreshTokenInFamily(
    token: string,
    userId: string,
    familyId: string,
    generation: number
  ): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { error } = await this.supabase.from('refresh_tokens').insert({
      user_id: userId,
      token_hash: tokenHash,
      family_id: familyId,
      generation,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    if (error) {
      logger.error('Failed to store refresh token in family', { error, userId, familyId, generation }, { service: 'auth' });
      throw new CustomAuthError('Failed to store refresh token', 500);
    }

    logger.debug('Refresh token rotated successfully', { userId, familyId, generation }, { service: 'auth' });
  }
  /**
   * Validate refresh token and detect breaches
   * Uses database function for atomic validation with built-in breach detection
   * @throws CustomAuthError if token is invalid, expired, revoked, or breach detected
   */
  private async validateRefreshToken(token: string): Promise<{
    userId: string;
    familyId: string;
    generation: number;
  }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Use database function for atomic validation with breach detection
    const { data, error } = await this.supabase.rpc('validate_refresh_token', {
      p_token_hash: tokenHash,
    }).single();

    if (error) {
      logger.error('Refresh token validation query failed', { error }, { service: 'auth' });
      throw new CustomAuthError('Token validation failed', 500);
    }

    // Database function returns: { is_valid, user_id, family_id, generation, reason }
    if (!data.is_valid) {
      logger.warn('Invalid refresh token', { reason: data.reason }, { service: 'auth' });

      // If token was consumed and reused, family is already revoked by database function
      if (data.reason.includes('consumed') || data.reason.includes('breach')) {
        logger.error('[SECURITY ALERT] Token reuse breach detected', {
          severity: 'CRITICAL',
          reason: data.reason,
          familyId: data.family_id,
        }, { service: 'auth' });
      }

      throw new CustomAuthError(data.reason, 401);
    }

    return {
      userId: data.user_id,
      familyId: data.family_id,
      generation: data.generation,
    };
  }
  /**
   * Mark token as consumed during rotation
   * Uses database function for atomic update
   */
  private async markTokenAsConsumed(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data, error } = await this.supabase.rpc('consume_refresh_token', {
      p_token_hash: tokenHash,
    }).single();

    if (error) {
      logger.error('Failed to consume refresh token', { error }, { service: 'auth' });
      throw new CustomAuthError('Failed to consume token', 500);
    }

    if (!data.success) {
      logger.warn('Token consumption failed', { tokenHash: tokenHash.substring(0, 8) + '...' }, { service: 'auth' });
    }

    logger.debug('Refresh token consumed', { service: 'auth' });
  }
  /**
   * Invalidate entire token family (breach detection)
   * Revokes all tokens in the same family - used when breach detected
   * Uses database function for atomic revocation
   */
  protected async invalidateTokenFamily(token: string, reason: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // First get the family_id from the token
    const { data: tokenData } = await this.supabase
      .from('refresh_tokens')
      .select('family_id')
      .eq('token_hash', tokenHash)
      .single();

    if (!tokenData?.family_id) {
      logger.warn('Token family not found for invalidation', { reason }, { service: 'auth' });
      return;
    }

    // Revoke entire family using database function
    const { data, error } = await this.supabase.rpc('revoke_token_family', {
      p_family_id: tokenData.family_id,
      p_reason: reason,
    }).single();

    if (error) {
      logger.error('Failed to invalidate token family', { error, reason }, { service: 'auth' });
      throw new CustomAuthError('Failed to invalidate token family', 500);
    }

    logger.error('[SECURITY] Token family invalidated', {
      severity: 'HIGH',
      familyId: tokenData.family_id,
      reason,
      revokedCount: data.revoked_count,
    }, { service: 'auth' });
  }
  /**
   * Invalidate all user tokens (logout all devices)
   * Uses database function for atomic revocation
   */
  private async invalidateAllUserTokens(userId: string, reason: string): Promise<void> {
    const { data, error } = await this.supabase.rpc('revoke_user_tokens', {
      p_user_id: userId,
      p_reason: reason,
    }).single();

    if (error) {
      logger.error('Failed to invalidate user tokens', { error, userId, reason }, { service: 'auth' });
      throw new CustomAuthError('Failed to invalidate tokens', 500);
    }

    logger.info('[SECURITY] All user tokens invalidated', {
      userId,
      reason,
      revokedCount: data.revoked_count,
    }, { service: 'auth' });
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