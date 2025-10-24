// Conditional import for bcryptjs (Node.js only, not Edge Runtime compatible)
let bcrypt: any = null;
try {
  // Check if we're in a Node.js environment
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    bcrypt = require('bcryptjs');
  }
} catch {
  // bcryptjs not available in Edge Runtime or other environments
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
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

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  if (!bcrypt) {
    throw new Error('Password hashing not available in Edge Runtime');
  }
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!bcrypt) {
    throw new Error('Password comparison not available in Edge Runtime');
  }
  return bcrypt.compare(password, hash);
}