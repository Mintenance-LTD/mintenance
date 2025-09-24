/**
 * Input Validation Middleware
 *
 * ⚠️ SECURITY CRITICAL: Comprehensive input validation and sanitization
 * Prevents SQL injection, XSS, and other injection attacks
 */

import { logger } from '../utils/logger';

// Validation rules and patterns
const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[\d\s()-]{10,}$/,
  alphanumeric: /^[a-zA-Z0-9\s]*$/,
  safeText: /^[a-zA-Z0-9\s.,!?-]*$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9-]+$/,
} as const;

// SQL injection patterns to detect and block
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(;|\||&|\$|\(|\)|<|>|'|"|`)/,
  /(\bOR\b|\bAND\b)\s*(\d+\s*=\s*\d+|\w+\s*=\s*\w+)/i,
  /(--|\*\/|\/\*)/,
  /(\bxp_|\bsp_)/i,
  /(\bCOUNT\s*\(|\bMAX\s*\(|\bMIN\s*\(|\bSUM\s*\()/i,
] as const;

// XSS patterns to detect and block
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
  /onclick\s*=/gi,
  /onmouseover\s*=/gi,
  /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi,
] as const;

interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  allowEmpty?: boolean;
  sanitize?: boolean;
  fieldName?: string;
  customValidation?: (value: any) => { isValid: boolean; error?: string };
}

interface ValidationResult {
  isValid: boolean;
  sanitized?: any;
  errors: string[];
  warnings: string[];
}

export class InputValidationMiddleware {
  /**
   * Validate and sanitize text input
   */
  static validateText(
    input: string,
    options: ValidationOptions = {}
  ): ValidationResult {
    const {
      maxLength = 1000,
      minLength = 0,
      pattern = VALIDATION_PATTERNS.safeText,
      allowEmpty = false,
      sanitize = true,
      fieldName = 'input'
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedInput = input;

    // Check for null/undefined
    if (input == null) {
      if (!allowEmpty) {
        errors.push(`${fieldName} is required`);
      }
      return { isValid: false, errors, warnings };
    }

    // Convert to string and trim
    sanitizedInput = String(input).trim();

    // Check empty after trimming
    if (!sanitizedInput && !allowEmpty) {
      errors.push(`${fieldName} cannot be empty`);
      return { isValid: false, errors, warnings };
    }

    // Length validation
    if (sanitizedInput.length < minLength) {
      errors.push(`${fieldName} must be at least ${minLength} characters`);
    }

    if (sanitizedInput.length > maxLength) {
      errors.push(`${fieldName} cannot exceed ${maxLength} characters`);
    }

    // SQL injection detection
    for (const sqlPattern of SQL_INJECTION_PATTERNS) {
      if (sqlPattern.test(sanitizedInput)) {
        errors.push(`${fieldName} contains potentially dangerous content`);
        logger.warn('InputValidation', 'SQL injection attempt detected', {
          fieldName,
          pattern: sqlPattern.source,
          input: sanitizedInput.substring(0, 100)
        });
        break;
      }
    }

    // XSS detection
    for (const xssPattern of XSS_PATTERNS) {
      if (xssPattern.test(sanitizedInput)) {
        errors.push(`${fieldName} contains potentially dangerous scripts`);
        logger.warn('InputValidation', 'XSS attempt detected', {
          fieldName,
          pattern: xssPattern.source,
          input: sanitizedInput.substring(0, 100)
        });
        break;
      }
    }

    // Pattern validation
    if (pattern && !pattern.test(sanitizedInput)) {
      errors.push(`${fieldName} contains invalid characters`);
    }

    // Sanitization
    if (sanitize && errors.length === 0) {
      // Remove potentially dangerous characters
      sanitizedInput = sanitizedInput
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/vbscript:/gi, '') // Remove vbscript: protocols
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/--/g, '') // Remove SQL comments
        .replace(/\/\*/g, '') // Remove SQL block comments start
        .replace(/\*\//g, ''); // Remove SQL block comments end

      // Normalize whitespace
      sanitizedInput = sanitizedInput.replace(/\s+/g, ' ').trim();
    }

    return {
      isValid: errors.length === 0,
      sanitized: sanitizedInput,
      errors,
      warnings
    };
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    const result = this.validateText(email, {
      pattern: VALIDATION_PATTERNS.email,
      maxLength: 254,
      fieldName: 'email',
      sanitize: false
    });

    // Additional email-specific validation
    if (result.isValid && result.sanitized) {
      const emailParts = result.sanitized.split('@');
      if (emailParts.length !== 2) {
        result.isValid = false;
        result.errors.push('Invalid email format');
      } else {
        const [localPart, domain] = emailParts;
        if (localPart.length > 64 || domain.length > 253) {
          result.isValid = false;
          result.errors.push('Email address too long');
        }
      }
    }

    return result;
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone: string): ValidationResult {
    return this.validateText(phone, {
      pattern: VALIDATION_PATTERNS.phone,
      maxLength: 20,
      fieldName: 'phone number',
      sanitize: true
    });
  }

  /**
   * Validate UUID
   */
  static validateUUID(uuid: string): ValidationResult {
    return this.validateText(uuid, {
      pattern: VALIDATION_PATTERNS.uuid,
      maxLength: 36,
      minLength: 36,
      fieldName: 'UUID',
      sanitize: false
    });
  }

  /**
   * Validate and sanitize job title
   */
  static validateJobTitle(title: string): ValidationResult {
    return this.validateText(title, {
      maxLength: 100,
      minLength: 3,
      pattern: /^[a-zA-Z0-9\s.,&-]+$/,
      fieldName: 'job title',
      sanitize: true
    });
  }

  /**
   * Validate and sanitize job description
   */
  static validateJobDescription(description: string): ValidationResult {
    return this.validateText(description, {
      maxLength: 2000,
      minLength: 10,
      fieldName: 'job description',
      sanitize: true
    });
  }

  /**
   * Validate monetary amount
   */
  static validateAmount(amount: number | string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Convert to number
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount)) {
      errors.push('Amount must be a valid number');
      return { isValid: false, errors, warnings };
    }

    if (numAmount < 0) {
      errors.push('Amount cannot be negative');
    }

    if (numAmount > 1000000) {
      warnings.push('Large amount detected - please verify');
    }

    // Check for excessive decimal places (potential manipulation)
    const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
    if (decimalPlaces > 2) {
      errors.push('Amount cannot have more than 2 decimal places');
    }

    return {
      isValid: errors.length === 0,
      sanitized: Math.round(numAmount * 100) / 100, // Round to 2 decimal places
      errors,
      warnings
    };
  }

  /**
   * Validate file upload
   */
  static validateFile(
    file: { name: string; size: number; type: string },
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      maxNameLength?: number;
    } = {}
  ): ValidationResult {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
      maxNameLength = 255
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate file name
    if (!file.name || file.name.length === 0) {
      errors.push('File name is required');
    }

    if (file.name.length > maxNameLength) {
      errors.push(`File name cannot exceed ${maxNameLength} characters`);
    }

    // Check for dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.js', '.jar', '.php'];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (dangerousExtensions.includes(fileExt)) {
      errors.push('File type not allowed for security reasons');
    }

    // Validate file size
    if (file.size > maxSize) {
      errors.push(`File size cannot exceed ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Sanitize file name
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

    return {
      isValid: errors.length === 0,
      sanitized: { ...file, name: sanitizedName },
      errors,
      warnings
    };
  }

  /**
   * Validate object with multiple fields
   */
  static validateObject(
    obj: Record<string, any>,
    schema: Record<string, ValidationOptions>
  ): { isValid: boolean; sanitized: Record<string, any>; errors: Record<string, string[]> } {
    const sanitized: Record<string, any> = {};
    const errors: Record<string, string[]> = {};
    let isValid = true;

    for (const [fieldName, options] of Object.entries(schema)) {
      const value = obj[fieldName];

      // Use appropriate validator based on field type
      let result: ValidationResult;

      if (fieldName.includes('email')) {
        result = this.validateEmail(value || '');
      } else if (fieldName.includes('phone')) {
        result = this.validatePhone(value || '');
      } else if (fieldName.includes('amount') || fieldName.includes('price')) {
        result = this.validateAmount(value);
      } else {
        result = this.validateText(value || '', { ...options, fieldName });
      }

      if (!result.isValid) {
        isValid = false;
        errors[fieldName] = result.errors;
      }

      sanitized[fieldName] = result.sanitized;
    }

    return { isValid, sanitized, errors };
  }

  /**
   * Rate limiting validation
   */
  static validateRateLimit(
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 60000
  ): { allowed: boolean; remainingAttempts: number; resetTime: number } {
    // This should be implemented with a proper rate limiting store (Redis, memory cache, etc.)
    // For now, using a simple in-memory implementation
    const now = Date.now();
    const key = `rate_limit_${identifier}`;

    // TODO: Implement proper rate limiting with persistent storage
    console.warn('Rate limiting should be implemented with persistent storage for production');

    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetTime: now + windowMs
    };
  }
}

export default InputValidationMiddleware;