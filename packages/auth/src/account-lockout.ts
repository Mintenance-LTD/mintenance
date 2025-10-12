/**
 * Account Lockout Manager
 * 
 * Implements account lockout after failed login attempts
 * to prevent brute force attacks.
 */

export interface LockoutStatus {
  isLocked: boolean;
  remainingAttempts: number;
  lockedUntil?: Date;
  reason?: string;
}

export interface LockoutConfig {
  maxAttempts: number;
  lockoutDurationMinutes: number;
  attemptWindowMinutes: number;
}

export interface LoginAttempt {
  userId: string;
  timestamp: Date;
  success: boolean;
  ipAddress?: string;
}

export class AccountLockoutManager {
  private static readonly DEFAULT_CONFIG: LockoutConfig = {
    maxAttempts: 5,
    lockoutDurationMinutes: 15,
    attemptWindowMinutes: 15
  };

  /**
   * Check if account is locked
   */
  static isAccountLocked(
    attempts: LoginAttempt[],
    config: Partial<LockoutConfig> = {}
  ): LockoutStatus {
    const conf = { ...this.DEFAULT_CONFIG, ...config };
    const now = new Date();

    // Get recent failed attempts within the attempt window
    const windowStart = new Date(now.getTime() - conf.attemptWindowMinutes * 60 * 1000);
    const recentAttempts = attempts.filter(
      a => !a.success && a.timestamp >= windowStart
    );

    // Check if locked
    if (recentAttempts.length >= conf.maxAttempts) {
      const lastAttempt = recentAttempts[recentAttempts.length - 1];
      const lockedUntil = new Date(
        lastAttempt.timestamp.getTime() + conf.lockoutDurationMinutes * 60 * 1000
      );

      if (now < lockedUntil) {
        return {
          isLocked: true,
          remainingAttempts: 0,
          lockedUntil,
          reason: `Account locked due to ${conf.maxAttempts} failed login attempts`
        };
      }
    }

    // Not locked - return remaining attempts
    const remainingAttempts = conf.maxAttempts - recentAttempts.length;
    return {
      isLocked: false,
      remainingAttempts: Math.max(0, remainingAttempts)
    };
  }

  /**
   * Record login attempt
   */
  static recordAttempt(
    userId: string,
    success: boolean,
    ipAddress?: string
  ): LoginAttempt {
    return {
      userId,
      timestamp: new Date(),
      success,
      ipAddress
    };
  }

  /**
   * Clear login attempts (on successful login or manual unlock)
   */
  static clearAttempts(attempts: LoginAttempt[]): LoginAttempt[] {
    // Return only successful attempts or empty array
    return attempts.filter(a => a.success);
  }

  /**
   * Calculate lockout expiry time
   */
  static getLockoutExpiry(
    lastAttempt: Date,
    config: Partial<LockoutConfig> = {}
  ): Date {
    const conf = { ...this.DEFAULT_CONFIG, ...config };
    return new Date(lastAttempt.getTime() + conf.lockoutDurationMinutes * 60 * 1000);
  }

  /**
   * Get human-readable lockout message
   */
  static getLockoutMessage(status: LockoutStatus): string {
    if (!status.isLocked) {
      if (status.remainingAttempts <= 2) {
        return `Warning: ${status.remainingAttempts} login attempt(s) remaining before account lockout`;
      }
      return '';
    }

    if (status.lockedUntil) {
      const minutes = Math.ceil(
        (status.lockedUntil.getTime() - Date.now()) / (60 * 1000)
      );
      return `Account locked. Please try again in ${minutes} minute(s)`;
    }

    return 'Account locked. Please contact support';
  }
}

