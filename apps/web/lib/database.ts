if (typeof window !== 'undefined') {
  throw new Error('[ServerOnly] apps/web/lib/database.ts must not run in the browser');
}

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { PasswordValidator } from '@mintenance/auth';
import { logger } from '@mintenance/shared';
import { getEnvConfig } from './env-validation';


// Initialize Supabase client for server-side operations with validated env
const envConfig = getEnvConfig();
const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

logger.info('Supabase client initialized', {
  service: 'database',
  url: supabaseUrl
});

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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
  password_hash?: string;
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  created_at: string;
  updated_at: string;
  email_verified?: boolean;
  phone?: string;
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
   * Create a new user with hashed password
   */
  static async createUser(userData: CreateUserData): Promise<Omit<User, 'password_hash'>> {
    // Validate password complexity
    const validationResult = PasswordValidator.validate(userData.password, passwordRequirements);
    if (!validationResult.isValid) {
      throw new Error(validationResult.errors.join(', '));
    }

    // Hash password with bcrypt
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    // Insert user into database
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: userData.email.toLowerCase().trim(),
        password_hash: passwordHash,
        first_name: userData.first_name.trim(),
        last_name: userData.last_name.trim(),
        role: userData.role,
        phone: userData.phone?.trim(),
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, email, first_name, last_name, role, created_at, updated_at, email_verified, phone')
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('User with this email already exists');
      }
      throw new Error(`Database error: ${error.message}`);
    }

    // Add password to history (using database function)
    try {
      await supabase.rpc('add_password_to_history', {
        history_user_id: data.id,
        new_password_hash: passwordHash
      });
    } catch (historyError) {
      // Log but don't fail registration if history fails
      logger.warn('Failed to add password to history', {
        service: 'auth',
        userId: data.id,
        error: historyError
      });
    }

    return data;
  }

  /**
   * Authenticate user with email and password
   */
  static async authenticateUser(email: string, password: string, ipAddress?: string): Promise<Omit<User, 'password_hash'> | null> {
    // Get user with password hash
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, created_at, updated_at, email_verified, phone, password_hash')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !data) {
      // Record failed attempt for non-existent user
      try {
        await supabase.rpc('record_failed_login', {
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
      const { data: isLocked } = await supabase.rpc('is_account_locked', {
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

    // Verify password
    const isValidPassword = await bcrypt.compare(password, data.password_hash);

    if (!isValidPassword) {
      // Record failed attempt
      try {
        await supabase.rpc('record_failed_login', {
          attempt_user_id: data.id,
          attempt_email: email.toLowerCase().trim(),
          attempt_ip: ipAddress || null,
          attempt_user_agent: null,
          attempt_failure_reason: 'invalid_password'
        });
      } catch (e) {
        logger.error('Failed to record failed login', e, { service: 'auth' });
      }
      return null;
    }

    // Record successful login and clear any lockouts
    try {
      await supabase.rpc('record_successful_login', {
        login_user_id: data.id,
        login_email: email.toLowerCase().trim(),
        login_ip: ipAddress || null,
        login_user_agent: null
      });
    } catch (e) {
      logger.error('Failed to record successful login', e, { service: 'auth' });
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = data;
    return userWithoutPassword;
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, created_at, updated_at, email_verified, phone')
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
  static async getUserByEmail(email: string): Promise<Omit<User, 'password_hash'> | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, created_at, updated_at, email_verified, phone')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Update user password
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
      const { data: passwordHistory, error: historyError } = await supabase
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

    // Hash the new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      return false;
    }

    // Add new password to history
    try {
      await supabase.rpc('add_password_to_history', {
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
  static async updateUser(userId: string, updates: Partial<Pick<User, 'first_name' | 'last_name' | 'phone' | 'email_verified'>>): Promise<Omit<User, 'password_hash'> | null> {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, email, first_name, last_name, role, created_at, updated_at, email_verified, phone')
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
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    return !!data && !error;
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
      const { data } = await supabase.rpc('is_account_locked', {
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


