/**
 * Input Validation Middleware
 *
 * ⚠️ SECURITY CRITICAL: Comprehensive input validation and sanitization
 * Prevents SQL injection, XSS, and other injection attacks
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

// Validation rules and patterns
const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[\d\s()-]{10,}$/,
  alphanumeric: /^[a-zA-Z0-9\s]*$/,
  // Loosened 2026-05-10 (AUDIT_PUNCH_LIST P2 #55): the previous
  // pattern `[a-zA-Z0-9\s.,!?-]*` rejected normal English text with
  // apostrophes, ampersands, parentheses, slashes — e.g. "Tom's
  // bathroom", "Plumbing & electrical", "Pipe-fitting (kitchen)",
  // "£200/day". Now allows the standard set used in job
  // titles/descriptions; the SQL/XSS guards below catch the actual
  // attack patterns.
  safeText: /^[a-zA-Z0-9\s.,!?'"&()£$/\-:;]*$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9-]+$/,
} as const;

// 2026-05-10 (AUDIT_PUNCH_LIST P2 #55): the previous SQL_INJECTION_PATTERNS
// regex blacklist was both unsound (the mobile app talks to Supabase via
// the JS client, which uses parameterized queries — there is no string
// concatenation path that user input can poison) AND generated wide false
// positives. Common English use of words like SELECT / DROP / UNION,
// apostrophes in names ("O'Brien"), ampersands in service categories
// ("Plumbing & electrical"), and parentheses ("Pipe-fitting (kitchen)")
// were all being rejected as "potentially dangerous content".
//
// The architectural truth is: SQL injection cannot reach Postgres from
// these forms, because:
//   1. Mobile writes go through Supabase.from('...').insert(...) which
//      parameterizes everything.
//   2. API routes validate body via Zod (type + length).
//   3. Server-side `sanitize.text` and `sanitize.jobDescription` strip
//      raw HTML tags before persistence.
//   4. The narrow injection-adjacent surface (.ilike() in admin search,
//      FTS query builders) has its own dedicated escape helpers in
//      apps/web/lib/utils/sanitize-postgrest.ts.
//
// XSS guards remain because rendered text CAN execute scripts if not
// escaped at the React boundary. Those patterns have a much lower
// false-positive rate (no English homonyms for `<script>`).

// XSS patterns to detect and block
const XSS_PATTERNS = [
  // No `g` flag: these constants are shared and consumed via `.test()`, whose
  // statefulness with `g` (persisted `lastIndex`) makes detection order-dependent
  // and lets real payloads slip through. `g` is meaningless for `.test()` anyway.
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/i,
  /javascript:/i,
  /vbscript:/i,
  /onload\s*=/i,
  /onerror\s*=/i,
  /onclick\s*=/i,
  /onmouseover\s*=/i,
  /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/i,
] as const;

interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  allowEmpty?: boolean;
  sanitize?: boolean;
  fieldName?: string;
  customValidation?: (value: unknown) => { isValid: boolean; error?: string };
}

interface ValidationResult<T = unknown> {
  isValid: boolean;
  sanitized?: T;
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
  ): ValidationResult<string> {
    const {
      maxLength = 1000,
      minLength = 0,
      pattern = VALIDATION_PATTERNS.safeText,
      allowEmpty = false,
      sanitize = true,
      fieldName = 'input',
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

    // SQL injection blacklist removed 2026-05-10 (AUDIT_PUNCH_LIST P2 #55).
    // Mobile DB writes go through Supabase parameterized queries; user
    // input cannot reach raw SQL. See the comment block on the
    // (now-deleted) SQL_INJECTION_PATTERNS constant for the full
    // rationale.

    // XSS detection
    for (const xssPattern of XSS_PATTERNS) {
      if (xssPattern.test(sanitizedInput)) {
        errors.push(`${fieldName} contains potentially dangerous scripts`);
        logger.warn('InputValidation', 'XSS attempt detected', {
          fieldName,
          pattern: xssPattern.source,
          input: sanitizedInput.substring(0, 100),
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
      // XSS-relevant strip only (2026-05-10 P2 #55): the SQL comment
      // strip (`--`, `/*`, `*/`) was removed because it mangled
      // legitimate text — e.g. job descriptions with em-dashes
      // ("--") or inline ratings ("4*/5"). SQL comments cannot reach
      // Postgres anyway through the parameterized Supabase client.
      sanitizedInput = sanitizedInput
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/vbscript:/gi, '') // Remove vbscript: protocols
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers

      // Normalize whitespace
      sanitizedInput = sanitizedInput.replace(/\s+/g, ' ').trim();
    }

    return {
      isValid: errors.length === 0,
      sanitized: sanitizedInput,
      errors,
      warnings,
    };
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult<string> {
    const result = this.validateText(email, {
      pattern: VALIDATION_PATTERNS.email,
      maxLength: 254,
      fieldName: 'email',
      sanitize: false,
    });

    // Additional email-specific validation
    if (result.isValid && result.sanitized) {
      const emailParts = result.sanitized.split('@');
      if (emailParts.length !== 2) {
        result.isValid = false;
        result.errors.push('Invalid email format');
      } else {
        const [localPart, domain] = emailParts;
        if ((localPart?.length ?? 0) > 64 || (domain?.length ?? 0) > 253) {
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
  static validatePhone(phone: string): ValidationResult<string> {
    return this.validateText(phone, {
      pattern: VALIDATION_PATTERNS.phone,
      maxLength: 20,
      fieldName: 'phone number',
      sanitize: true,
    });
  }

  /**
   * Validate UUID
   */
  static validateUUID(uuid: string): ValidationResult<string> {
    return this.validateText(uuid, {
      pattern: VALIDATION_PATTERNS.uuid,
      maxLength: 36,
      minLength: 36,
      fieldName: 'UUID',
      sanitize: false,
    });
  }

  /**
   * Validate and sanitize job title
   */
  static validateJobTitle(title: string): ValidationResult<string> {
    return this.validateText(title, {
      maxLength: 100,
      minLength: 3,
      pattern: /^[a-zA-Z0-9\s.,&-]+$/,
      fieldName: 'job title',
      sanitize: true,
    });
  }

  /**
   * Validate and sanitize job description
   */
  static validateJobDescription(description: string): ValidationResult<string> {
    return this.validateText(description, {
      maxLength: 2000,
      minLength: 10,
      fieldName: 'job description',
      sanitize: true,
    });
  }

  /**
   * Validate monetary amount
   */
  static validateAmount(amount: number | string): ValidationResult<number> {
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
      warnings,
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
  ): ValidationResult<{ name: string; size: number; type: string }> {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
      maxNameLength = 255,
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
    const dangerousExtensions = [
      '.exe',
      '.bat',
      '.cmd',
      '.scr',
      '.pif',
      '.js',
      '.jar',
      '.php',
    ];
    const fileExt = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf('.'));
    if (dangerousExtensions.includes(fileExt)) {
      errors.push('File type not allowed for security reasons');
    }

    // Validate file size
    if (file.size > maxSize) {
      errors.push(
        `File size cannot exceed ${Math.round(maxSize / 1024 / 1024)}MB`
      );
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
      warnings,
    };
  }

  /**
   * Validate object with multiple fields
   */
  static validateObject(
    obj: Record<string, unknown>,
    schema: Record<string, ValidationOptions>
  ): {
    isValid: boolean;
    sanitized: Record<string, unknown>;
    errors: Record<string, string[]>;
  } {
    const sanitized: Record<string, unknown> = {};
    const errors: Record<string, string[]> = {};
    let isValid = true;

    for (const [fieldName, options] of Object.entries(schema)) {
      const value = obj[fieldName];

      // Use appropriate validator based on field type
      let result: ValidationResult<unknown>;

      if (fieldName.includes('email')) {
        result = this.validateEmail(String(value ?? ''));
      } else if (fieldName.includes('phone')) {
        result = this.validatePhone(String(value ?? ''));
      } else if (fieldName.includes('amount') || fieldName.includes('price')) {
        result = this.validateAmount(
          typeof value === 'number' ? value : String(value ?? '')
        );
      } else {
        result = this.validateText(String(value ?? ''), {
          ...options,
          fieldName,
        });
      }

      if (!result.isValid) {
        isValid = false;
        errors[fieldName] = result.errors;
      }

      sanitized[fieldName] = result.sanitized;
    }

    return { isValid, sanitized, errors };
  }

  // In-memory rate limit store (fallback when AsyncStorage is unavailable)
  private static memoryStore: Map<
    string,
    { attempts: number; windowStart: number }
  > = new Map();

  /**
   * Rate limiting validation with persistent storage via AsyncStorage.
   * Falls back to in-memory storage if AsyncStorage read/write fails.
   */
  static async validateRateLimit(
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 60000
  ): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const storageKey = `rate_limit_${identifier}`;

    let attempts = 0;
    let windowStart = now;
    let usedPersistent = false;

    // Try to load from AsyncStorage first
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          attempts: number;
          windowStart: number;
        };
        if (parsed.windowStart && parsed.attempts !== undefined) {
          windowStart = parsed.windowStart;
          attempts = parsed.attempts;
          usedPersistent = true;
        }
      }
    } catch {
      // AsyncStorage failed; fall back to in-memory store
      const memEntry = this.memoryStore.get(storageKey);
      if (memEntry) {
        windowStart = memEntry.windowStart;
        attempts = memEntry.attempts;
      }
    }

    // Reset window if expired
    if (now - windowStart >= windowMs) {
      attempts = 0;
      windowStart = now;
    }

    // Increment attempt count
    attempts += 1;
    const allowed = attempts <= maxAttempts;
    const remainingAttempts = Math.max(0, maxAttempts - attempts);
    const resetTime = windowStart + windowMs;

    // Persist updated counters
    const entry = { attempts, windowStart };
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
      usedPersistent = true;
    } catch {
      // Persist to memory as fallback
      this.memoryStore.set(storageKey, entry);
      if (!usedPersistent) {
        logger.warn(
          'InputValidation',
          'AsyncStorage unavailable for rate limiting; using in-memory fallback.'
        );
      }
    }

    if (!allowed) {
      logger.warn('InputValidation', 'Rate limit exceeded', {
        identifier,
        attempts,
        maxAttempts,
        resetTime,
      });
    }

    return { allowed, remainingAttempts, resetTime };
  }

  /**
   * Clear rate limit entry for an identifier (e.g., after successful auth).
   */
  static async clearRateLimit(identifier: string): Promise<void> {
    const storageKey = `rate_limit_${identifier}`;
    this.memoryStore.delete(storageKey);
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch {
      // Best-effort cleanup
    }
  }
}

export default InputValidationMiddleware;
