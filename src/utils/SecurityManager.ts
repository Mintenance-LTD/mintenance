/**
 * Security Manager
 * 
 * Comprehensive security hardening for the Mintenance app.
 * Handles input validation, file upload security, and access control.
 */

import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Conditional import for FileSystem to handle test environments
let FileSystem: any;
try {
  FileSystem = require('expo-file-system');
} catch (error) {
  // Mock FileSystem for test environments
  FileSystem = {
    getInfoAsync: () => Promise.resolve({
      exists: true,
      size: 1024,
    }),
  };
}

// Security configuration
const SECURITY_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_FILENAME_LENGTH: 255,
  SENSITIVE_DATA_KEYS: ['password', 'token', 'secret', 'key'],
} as const;

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: any;
}

interface FileValidationResult extends ValidationResult {
  fileInfo?: {
    size: number;
    type: string;
    name: string;
  };
}

class SecurityManagerService {
  /**
   * Validate and sanitize text input
   */
  public validateTextInput(
    input: string,
    options: {
      maxLength?: number;
      minLength?: number;
      pattern?: RegExp;
      allowHtml?: boolean;
      fieldName?: string;
    } = {}
  ): ValidationResult {
    const errors: string[] = [];
    let sanitized = input;

    // Basic sanitization
    if (!options.allowHtml) {
      sanitized = this.stripHtml(sanitized);
    }

    // Length validation
    if (options.maxLength && sanitized.length > options.maxLength) {
      errors.push(`${options.fieldName || 'Input'} must be less than ${options.maxLength} characters`);
    }

    if (options.minLength && sanitized.length < options.minLength) {
      errors.push(`${options.fieldName || 'Input'} must be at least ${options.minLength} characters`);
    }

    // Pattern validation
    if (options.pattern && !options.pattern.test(sanitized)) {
      errors.push(`${options.fieldName || 'Input'} format is invalid`);
    }

    // XSS protection
    sanitized = this.preventXSS(sanitized);

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * Validate email format
   */
  public validateEmail(email: string): ValidationResult {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const result = this.validateTextInput(email, {
      pattern: emailPattern,
      maxLength: 254,
      fieldName: 'Email',
    });

    return result;
  }

  /**
   * Validate password strength
   */
  public validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check against common passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'abc123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate file upload
   */
  public async validateFileUpload(fileUri: string): Promise<FileValidationResult> {
    const errors: string[] = [];

    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      if (!fileInfo.exists) {
        errors.push('File does not exist');
        return { isValid: false, errors };
      }

      // Check file size
      if (fileInfo.size && fileInfo.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
        errors.push(`File size exceeds maximum allowed size of ${SECURITY_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      // Extract file extension and validate type
      const fileName = fileUri.split('/').pop() || '';
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      if (!fileExtension) {
        errors.push('File must have a valid extension');
      }

      // For images, validate MIME type would be done server-side
      // Here we do basic extension validation
      const imageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      if (fileExtension && !imageExtensions.includes(fileExtension)) {
        errors.push('Only JPEG, PNG, and WebP images are allowed');
      }

      // Validate filename length
      if (fileName.length > SECURITY_CONFIG.MAX_FILENAME_LENGTH) {
        errors.push('Filename is too long');
      }

      // Check for suspicious filenames
      if (this.hasSuspiciousFilename(fileName)) {
        errors.push('Invalid filename detected');
      }

      return {
        isValid: errors.length === 0,
        errors,
        fileInfo: {
          size: fileInfo.size || 0,
          type: `image/${fileExtension}`,
          name: fileName,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Failed to validate file'],
      };
    }
  }

  /**
   * Secure data storage
   */
  public async secureStore(key: string, value: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(key, value);
      return true;
    } catch (error) {
      console.error('Secure storage failed:', error);
      return false;
    }
  }

  /**
   * Secure data retrieval
   */
  public async secureRetrieve(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Secure retrieval failed:', error);
      return null;
    }
  }

  /**
   * Role-based access control
   */
  public hasPermission(
    userRole: 'homeowner' | 'contractor' | 'admin',
    requiredRole: 'homeowner' | 'contractor' | 'admin'
  ): boolean {
    const roleHierarchy = {
      admin: 3,
      contractor: 2,
      homeowner: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Sanitize object for logging (remove sensitive data)
   */
  public sanitizeForLogging(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized = { ...obj };

    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (SECURITY_CONFIG.SENSITIVE_DATA_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    });

    return sanitized;
  }

  /**
   * Rate limiting for API calls
   */
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  public checkRateLimit(identifier: string, maxRequests = 60, windowMs = 60000): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(identifier);

    if (!entry || now > entry.resetTime) {
      this.rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Private helper methods
   */
  private stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }

  private preventXSS(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  private hasSuspiciousFilename(filename: string): boolean {
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"\\|?*]/,  // Invalid characters
      /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i,  // Reserved names
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Generate security report
   */
  public generateSecurityReport(): {
    rateLimitStatus: Array<{ identifier: string; count: number; resetTime: number }>;
    securityConfig: typeof SECURITY_CONFIG;
  } {
    const rateLimitStatus = Array.from(this.rateLimitMap.entries()).map(([identifier, data]) => ({
      identifier,
      ...data,
    }));

    return {
      rateLimitStatus,
      securityConfig: SECURITY_CONFIG,
    };
  }
}

export const SecurityManager = new SecurityManagerService();
export default SecurityManager;
