/**
 * Pure functions that map Supabase Auth error messages to user-facing strings.
 * No side effects, no state dependencies.
 */

export interface MappedAuthError {
  matched: boolean;
  error: string;
}

/**
 * Map a Supabase auth login error to a user-safe message.
 * Returns { matched: false } if no specific mapping applies.
 */
export function mapLoginAuthError(authError: {
  message?: string;
  code?: string;
}): MappedAuthError {
  const message = authError.message || '';

  // Invalid credentials
  if (
    message.includes('Invalid login credentials') ||
    message.includes('invalid_password')
  ) {
    return { matched: true, error: 'Invalid email or password' };
  }

  // Email confirmation requirement
  if (
    message.includes('email_not_confirmed') ||
    message.includes('Email not confirmed') ||
    authError.code === 'email_not_confirmed'
  ) {
    return {
      matched: true,
      error:
        'Please verify your email address before signing in. Check your inbox for a confirmation email.',
    };
  }

  // Rate limiting
  if (
    message.includes('too many requests') ||
    message.includes('rate limit')
  ) {
    return {
      matched: true,
      error: 'Too many login attempts. Please try again later.',
    };
  }

  return {
    matched: false,
    error: message || 'Login failed. Please try again.',
  };
}

/**
 * Map a Supabase auth registration error to a user-safe message.
 * Returns { matched: false } if no specific mapping applies.
 */
export function mapRegisterAuthError(authError: {
  message: string;
}): MappedAuthError {
  const message = authError.message;

  if (
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('User already registered') ||
    message.includes('email address is already registered')
  ) {
    return {
      matched: true,
      error:
        'An account with this email already exists. Please sign in instead.',
    };
  }

  if (message.includes('Password should be at least')) {
    return {
      matched: true,
      error:
        'Password is too short. Please use a password with at least 8 characters.',
    };
  }

  return {
    matched: false,
    error: message || 'Registration failed. Please try again.',
  };
}

/**
 * Map a thrown Error from registration into a user-safe message.
 * Returns null if no specific mapping applies.
 */
export function mapRegistrationThrownError(error: Error): string | null {
  // Duplicate/conflict errors
  if (
    error.message.includes('already exists') ||
    error.message.includes('duplicate key') ||
    error.message.includes('unique constraint')
  ) {
    return 'An account with this email already exists. Please sign in instead.';
  }

  // Refresh token storage errors
  if (error.message.includes('Failed to store refresh token')) {
    return 'Account created but session initialization failed. Please try signing in.';
  }

  return null;
}

/**
 * Return a user-safe error message (no internal details exposed).
 * Only allows through messages that match known-safe strings.
 */
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const safeMessages = [
      'User not found',
      'Invalid email or password',
      'Email already exists',
      'Password requirements not met',
    ];

    for (const safeMessage of safeMessages) {
      if (error.message.includes(safeMessage)) {
        return error.message;
      }
    }
  }

  return 'An unexpected error occurred';
}
