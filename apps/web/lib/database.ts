if (typeof window !== 'undefined') {
  throw new Error('[ServerOnly] apps/web/lib/database.ts must not run in the browser');
}

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';


// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for server-side operations');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

    return data;
  }

  /**
   * Authenticate user with email and password
   */
  static async authenticateUser(email: string, password: string): Promise<Omit<User, 'password_hash'> | null> {
    // Get user with password hash
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, created_at, updated_at, email_verified, phone, password_hash')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !data) {
      return null;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, data.password_hash);

    if (!isValidPassword) {
      return null;
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
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const { error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    return !error;
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Verify password strength
   */
  static isValidPassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character (@$!%*?&)' };
    }

    return { valid: true };
  }
}


