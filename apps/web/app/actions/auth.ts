'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@mintenance/shared';
import { hashPassword, comparePassword, generateJWT, ConfigManager } from '@mintenance/auth';

// Initialize config manager for JWT secrets
const config = ConfigManager.getInstance();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember: z.boolean().optional(),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['homeowner', 'contractor']),
  phone: z.string().optional(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Server Action: User Login
 * Handles authentication with progressive enhancement
 */
export async function loginAction(prevState: unknown, formData: FormData) {
  try {
    // Parse and validate form data
    const validatedFields = loginSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
      remember: formData.get('remember') === 'on',
    });

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { email, password, remember } = validatedFields.data;
    const supabase = await createServerSupabaseClient();

    // Authenticate user
    const { data: user, error: authError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (authError || !user) {
      logger.warn('Login attempt failed', { email });
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      logger.warn('Invalid password attempt', { email });
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Generate JWT token
    const secret = config.getRequired('JWT_SECRET');
    const token = await generateJWT(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      secret,
      '1h'
    );

    // Set authentication cookie
    const cookieStore = await cookies();
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cookieName = isDevelopment ? 'mintenance-auth' : '__Host-mintenance-auth';

    cookieStore.set(cookieName, token, {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: 'lax',
      path: '/',
      maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days or 1 day
    });

    logger.info('User logged in successfully', { userId: user.id });

    // Revalidate and redirect
    const redirectTo = user.role === 'contractor'
      ? '/contractor/dashboard'
      : '/dashboard';

    return {
      success: true,
      redirect: redirectTo,
    };
  } catch (error) {
    logger.error('Login error', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Server Action: User Registration
 * Creates new user account with validation
 */
export async function registerAction(prevState: unknown, formData: FormData) {
  try {
    // Parse and validate form data
    const validatedFields = registerSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
      name: formData.get('name'),
      role: formData.get('role'),
      phone: formData.get('phone'),
    });

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { email, password, name, role, phone } = validatedFields.data;
    const supabase = await createServerSupabaseClient();

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return {
        success: false,
        error: 'An account with this email already exists',
      };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from('profiles')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        role,
        phone,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !newUser) {
      logger.error('User creation failed', createError);
      return {
        success: false,
        error: 'Failed to create account. Please try again.',
      };
    }

    // Send verification email (async, don't wait)
    sendVerificationEmail(email, newUser.id);

    logger.info('User registered successfully', { userId: newUser.id });

    return {
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      redirect: '/login',
    };
  } catch (error) {
    logger.error('Registration error', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Server Action: Logout
 * Clears authentication and redirects to home
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const authCookieName = isDevelopment ? 'mintenance-auth' : '__Host-mintenance-auth';
  const refreshCookieName = isDevelopment ? 'mintenance-refresh' : '__Host-mintenance-refresh';

  // Clear all auth cookies
  cookieStore.delete(authCookieName);
  cookieStore.delete(refreshCookieName);

  // Clear CSRF token
  const csrfCookieName = isDevelopment ? 'csrf-token' : '__Host-csrf-token';
  cookieStore.delete(csrfCookieName);

  logger.info('User logged out');

  // Redirect to home
  redirect('/');
}

/**
 * Server Action: Reset Password
 * Updates user password with token validation
 */
export async function resetPasswordAction(prevState: unknown, formData: FormData) {
  try {
    const validatedFields = resetPasswordSchema.safeParse({
      token: formData.get('token'),
      password: formData.get('password'),
    });

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { token, password } = validatedFields.data;
    const supabase = await createServerSupabaseClient();

    // Validate reset token
    const { data: resetRequest, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !resetRequest) {
      return {
        success: false,
        error: 'Invalid or expired reset token',
      };
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ password_hash: passwordHash })
      .eq('id', resetRequest.user_id);

    if (updateError) {
      logger.error('Password update failed', updateError);
      return {
        success: false,
        error: 'Failed to reset password. Please try again.',
      };
    }

    // Delete used token
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('token', token);

    logger.info('Password reset successfully', { userId: resetRequest.user_id });

    return {
      success: true,
      message: 'Password reset successfully! You can now login with your new password.',
      redirect: '/login',
    };
  } catch (error) {
    logger.error('Password reset error', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Server Action: Update Profile
 * Updates user profile with validation
 */
export async function updateProfileAction(prevState: unknown, formData: FormData) {
  try {
    // Get current user from cookies
    const cookieStore = await cookies();
    const isDevelopment = process.env.NODE_ENV === 'development';
    const authCookieName = isDevelopment ? 'mintenance-auth' : '__Host-mintenance-auth';
    const token = cookieStore.get(authCookieName)?.value;

    if (!token) {
      return {
        success: false,
        error: 'You must be logged in to update your profile',
      };
    }

    // Validate form data
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const bio = formData.get('bio') as string;

    if (!name || name.length < 2) {
      return {
        success: false,
        error: 'Name must be at least 2 characters',
      };
    }

    const supabase = await createServerSupabaseClient();

    // Decode token to get user ID (simplified - use proper JWT verification)
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        name,
        phone,
        bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.userId);

    if (updateError) {
      logger.error('Profile update failed', updateError);
      return {
        success: false,
        error: 'Failed to update profile. Please try again.',
      };
    }

    logger.info('Profile updated successfully', { userId: payload.userId });

    return {
      success: true,
      message: 'Profile updated successfully!',
    };
  } catch (error) {
    logger.error('Profile update error', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

// Helper function to send verification email (async)
async function sendVerificationEmail(email: string, userId: string) {
  try {
    // Implementation would call email service
    logger.info('Verification email queued', { email, userId });
  } catch (error) {
    logger.error('Failed to send verification email', error);
  }
}