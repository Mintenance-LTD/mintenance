/**
 * Password Validation and Security
 * 
 * Implements password complexity requirements, validation,
 * and security features per OWASP guidelines.
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxLength?: number;
}

export class PasswordValidator {
  private static readonly DEFAULT_REQUIREMENTS: PasswordRequirements = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxLength: 128
  };

  private static readonly COMMON_PASSWORDS = new Set([
    'password', 'password123', '12345678', 'qwerty', 'abc123',
    'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
    'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
    'bailey', 'passw0rd', 'shadow', '123123', '654321'
  ]);

  /**
   * Validate password against security requirements
   */
  static validate(
    password: string,
    requirements: Partial<PasswordRequirements> = {}
  ): PasswordValidationResult {
    const reqs = { ...this.DEFAULT_REQUIREMENTS, ...requirements };
    const errors: string[] = [];

    // Check minimum length
    if (password.length < reqs.minLength) {
      errors.push(`Password must be at least ${reqs.minLength} characters long`);
    }

    // Check maximum length
    if (reqs.maxLength && password.length > reqs.maxLength) {
      errors.push(`Password must not exceed ${reqs.maxLength} characters`);
    }

    // Check uppercase requirement
    if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check lowercase requirement
    if (reqs.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check number requirement
    if (reqs.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check special character requirement
    if (reqs.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    if (this.COMMON_PASSWORDS.has(password.toLowerCase())) {
      errors.push('This password is too common. Please choose a more unique password');
    }

    // Check for sequential characters
    if (this.hasSequentialCharacters(password)) {
      errors.push('Password should not contain sequential characters (e.g., 123, abc)');
    }

    // Calculate strength
    const strength = this.calculateStrength(password);

    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * Check if password contains sequential characters
   */
  private static hasSequentialCharacters(password: string): boolean {
    const sequences = [
      '012345678', '123456789', 'abcdefghij', 'qwertyuiop'
    ];
    
    const lower = password.toLowerCase();
    for (const seq of sequences) {
      for (let i = 0; i <= seq.length - 3; i++) {
        const subseq = seq.substring(i, i + 3);
        if (lower.includes(subseq)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Calculate password strength
   */
  private static calculateStrength(password: string): 'weak' | 'medium' | 'strong' {
    let score = 0;

    // Length score
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Complexity score
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

    // Diversity score
    const uniqueChars = new Set(password.split('')).size;
    if (uniqueChars >= password.length * 0.6) score += 1;

    if (score <= 3) return 'weak';
    if (score <= 6) return 'medium';
    return 'strong';
  }

  /**
   * Check if new password matches any in history
   */
  static async isInPasswordHistory(
    newPasswordHash: string,
    passwordHistory: string[]
  ): Promise<boolean> {
    // This would typically compare hashes
    // Implementation depends on how history is stored
    return passwordHistory.includes(newPasswordHash);
  }

  /**
   * Generate password requirements message
   */
  static getRequirementsMessage(requirements: Partial<PasswordRequirements> = {}): string {
    const reqs = { ...this.DEFAULT_REQUIREMENTS, ...requirements };
    const messages: string[] = [];

    messages.push(`At least ${reqs.minLength} characters long`);
    if (reqs.requireUppercase) messages.push('One uppercase letter');
    if (reqs.requireLowercase) messages.push('One lowercase letter');
    if (reqs.requireNumbers) messages.push('One number');
    if (reqs.requireSpecialChars) messages.push('One special character (!@#$%^&*)');

    return `Password must contain: ${messages.join(', ')}`;
  }
}

