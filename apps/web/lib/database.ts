if (typeof window !== 'undefined') {
  throw new Error('[ServerOnly] apps/web/lib/database.ts must not run in the browser');
}

import { serverSupabase } from '@/lib/api/supabaseServer';
import bcrypt from 'bcryptjs';
import { PasswordValidator } from '@mintenance/auth';
import { logger } from '@mintenance/shared';

// Password validation requirements
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  created_at: string;
  updated_at: string;
  verified?: boolean;
  phone?: string;
  phone_verified?: boolean;
  phone_verified_at?: string;
  location?: string;
  profile_image_url?: string;
  bio?: string;
  address?: string;
  city?: string;
  postcode?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  phone?: string;
}

export class DatabaseManager {
  /**
   * Create a new user profile
   * NOTE: Password handling is done by Supabase Auth (auth.users table), NOT in profiles.
   */
  static async createUser(userData: CreateUserData): Promise<User> {
    // Validate password complexity (for Supabase Auth, not stored in profiles)
    const validationResult = PasswordValidator.validate(userData.password, passwordRequirements);
    if (!validationResult.isValid) {
      throw new Error(validationResult.errors.join(', '));
    }

    // Insert user profile into database
    // NOTE: password_hash is NOT stored in profiles - Supabase Auth handles password storage
    const { data, error } = await serverSupabase
      .from('profiles')
      .insert({
        email: userData.email.toLowerCase().trim(),
        first_name: userData.first_name.trim(),
        last_name: userData.last_name.trim(),
        role: userData.role,
        phone: userData.phone?.trim(),
        verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, email, first_name, last_name, role, created_at, updated_at, verified, phone')
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('User with this email already exists');
      }
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  /**
   * Authenticate user with email and password
   * TODO: This is a LEGACY method. Authentication should be handled entirely by Supabase Auth
   * (serverSupabase.auth.signInWithPassword). The profiles table does NOT store password_hash.
   * This method now only looks up the user profile; actual password verification
   * must be done via Supabase Auth before calling this.
   */
  static async authenticateUser(email: string, _password: string, ipAddress?: string): Promise<User | null> {
    // TODO: Replace with serverSupabase.auth.signInWithPassword() for actual password verification.
    // The profiles table does not have a password_hash column - Supabase Auth handles passwords.

    // Get user profile (no password_hash - it does not exist in profiles)
    const { data, error } = await serverSupabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, created_at, updated_at, verified, phone')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !data) {
      // Record failed attempt for non-existent user
      try {
        await serverSupabase.rpc('record_failed_login', {
          attempt_user_id: null,
          attempt_email: email.toLowerCase().trim(),
          attempt_ip: ipAddress || null,
          attempt_user_agent: null,
          attempt_failure_reason: 'user_not_found'
        });
      } catch (e) {
        logger.error('Failed to record login attempt', e, { service: 'auth' });
      }
      return null;
    }

    // Check if account is locked
    try {
      const { data: isLocked } = await serverSupabase.rpc('is_account_locked', {
        check_user_id: data.id
      });

      if (isLocked) {
        logger.warn('Login attempt on locked account', {
          service: 'auth',
          userId: data.id,
          email: data.email
        });
        return null;
      }
    } catch (e) {
      logger.error('Failed to check account lockout', e, { service: 'auth' });
    }

    // TODO: Password verification should be done via Supabase Auth BEFORE calling this method.
    // The profiles table does not store password_hash. Supabase Auth (auth.users) handles passwords.

    // Record successful login and clear any lockouts
    try {
      await serverSupabase.rpc('record_successful_login', {
        login_user_id: data.id,
        login_email: email.toLowerCase().trim(),
        login_ip: ipAddress || null,
        login_user_agent: null
      });
    } catch (e) {
      logger.error('Failed to record successful login', e, { service: 'auth' });
    }

    return data;
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    const { data, error } = await serverSupabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, created_at, updated_at, verified, phone, phone_verified, phone_verified_at, location, profile_image_url, bio, address, city, postcode, country, company_name, admin_verified, is_available, onboarding_completed, rating, total_jobs_completed')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await serverSupabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, created_at, updated_at, verified, phone, location, profile_image_url')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Update user password
   * TODO: Password updates should be done via Supabase Auth (serverSupabase.auth.admin.updateUserById
   * or serverSupabase.auth.updateUser). The profiles table does NOT store password_hash.
   * This method currently only validates the password and updates the updated_at timestamp.
   */
  static async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    // Validate password complexity
    const validationResult = PasswordValidator.validate(newPassword, passwordRequirements);
    if (!validationResult.isValid) {
      throw new Error(validationResult.errors.join(', '));
    }

    // Check if password is in history by comparing against stored hashes
    try {
      // Get password history from database
      const { data: passwordHistory, error: historyError } = await serverSupabase
        .from('password_history')
        .select('password_hash')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5); // Check last 5 passwords

      if (!historyError && passwordHistory) {
        // Use bcrypt.compare() to check each stored hash
        for (const record of passwordHistory) {
          const isMatch = await bcrypt.compare(newPassword, record.password_hash);
          if (isMatch) {
            throw new Error('Password has been used recently. Please choose a different password.');
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('recently')) {
        throw e; // Re-throw password reuse error
      }
      logger.error('Failed to check password history', e, { service: 'auth', userId });
    }

    // TODO: Use serverSupabase.auth.admin.updateUserById(userId, { password: newPassword })
    // to update the password in Supabase Auth. The profiles table does NOT have password_hash.

    // Update the updated_at timestamp on the profile
    const { error } = await serverSupabase
      .from('profiles')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      return false;
    }

    // Add new password to history (password_history table is separate from profiles)
    try {
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      await serverSupabase.rpc('add_password_to_history', {
        history_user_id: userId,
        new_password_hash: passwordHash
      });
    } catch (historyError) {
      logger.warn('Failed to add password to history', {
        service: 'auth',
        userId,
        error: historyError
      });
    }

    return true;
  }

  /**
   * Update user profile
   */
  static async updateUser(userId: string, updates: Partial<Pick<User, 'first_name' | 'last_name' | 'phone' | 'verified'>>): Promise<User | null> {
    const { data, error } = await serverSupabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, email, first_name, last_name, role, created_at, updated_at, verified, phone')
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Check if user exists by email
   */
  static async userExists(email: string): Promise<boolean> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const { data, error } = await serverSupabase
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned, which is expected
        logger.error('Error checking user existence', error, { 
          service: 'database', 
          email: normalizedEmail 
        });
      }

      return !!data && !error;
    } catch (error) {
      logger.error('Exception checking user existence', error, { 
        service: 'database', 
        email 
      });
      return false;
    }
  }

  /**
   * Verify email format
   */
  static isValidEmail(email: string): boolean {
    // RFC 5322 compliant email regex (simplified but more robust than basic version)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }

  /**
   * Verify password strength (using PasswordValidator)
   */
  static isValidPassword(password: string): { valid: boolean; message?: string } {
    const result = PasswordValidator.validate(password, passwordRequirements);
    return {
      valid: result.isValid,
      message: result.errors.join(', ')
    };
  }

  /**
   * Check if account is locked
   */
  static async isAccountLocked(userId: string): Promise<boolean> {
    try {
      const { data } = await serverSupabase.rpc('is_account_locked', {
        check_user_id: userId
      });
      return !!data;
    } catch (error) {
      logger.error('Failed to check account lockout', error, { service: 'auth', userId });
      // SECURITY: Fail closed - if we can't verify lockout status, deny access
      // This prevents locked accounts from bypassing security if the check fails
      return true;
    }
  }
}


