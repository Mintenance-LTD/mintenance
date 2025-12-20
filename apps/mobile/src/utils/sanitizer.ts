/**
 * Input Sanitization Utilities for Mobile
 * Ported from web app for consistent security across platforms
 */

/**
 * Sanitize plain text (removes all HTML and special characters)
 */
export function sanitizeText(input: string, maxLength?: number): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove all HTML tags and decode entities
  const textOnly = input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[a-zA-Z0-9#]+;/g, ' ') // Replace HTML entities with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Truncate if too long
  const max = maxLength || 5000;
  return textOnly.length > max ? textOnly.substring(0, max) : textOnly;
}

/**
 * Sanitize job description
 */
export function sanitizeJobDescription(input: string): string {
  return sanitizeText(input, 5000);
}

/**
 * Sanitize contractor bio
 */
export function sanitizeContractorBio(input: string): string {
  return sanitizeText(input, 2000);
}

/**
 * Sanitize message content
 */
export function sanitizeMessage(input: string): string {
  return sanitizeText(input, 1000);
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(input: string): string {
  return sanitizeText(input, 200);
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const email = input.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  return email;
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');
  
  // US/UK phone number validation (10-11 digits)
  if (digits.length < 10 || digits.length > 11) {
    throw new Error('Invalid phone number format');
  }

  return digits;
}

/**
 * Sanitize file name for uploads
 */
export function sanitizeFileName(input: string): string {
  if (!input || typeof input !== 'string') {
    return 'unnamed';
  }

  return input
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace invalid chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .substring(0, 100) // Limit length
    .toLowerCase();
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  try {
    const url = new URL(input);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }

    return url.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}

/**
 * Sanitize numeric input (amount, price, etc.)
 */
export function sanitizeNumeric(input: string | number, options?: {
  min?: number;
  max?: number;
  decimals?: number;
}): number {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(num)) {
    throw new Error('Invalid numeric value');
  }

  // Apply min/max constraints
  let sanitized = num;
  if (options?.min !== undefined && sanitized < options.min) {
    sanitized = options.min;
  }
  if (options?.max !== undefined && sanitized > options.max) {
    sanitized = options.max;
  }

  // Round to specified decimal places
  if (options?.decimals !== undefined) {
    sanitized = parseFloat(sanitized.toFixed(options.decimals));
  }

  return sanitized;
}

/**
 * Sanitize amount (price, payment, etc.)
 */
export function sanitizeAmount(input: string | number): number {
  return sanitizeNumeric(input, {
    min: 0,
    max: 1000000, // $1 million max
    decimals: 2,
  });
}

/**
 * Sanitize rating (1-5 stars)
 */
export function sanitizeRating(input: string | number): number {
  return sanitizeNumeric(input, {
    min: 1,
    max: 5,
    decimals: 1,
  });
}

/**
 * Sanitize object by applying sanitization to all string fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldSanitizers?: Partial<Record<keyof T, (value: any) => any>>
): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    const value = sanitized[key];
    
    // Apply custom sanitizer if provided
    if (fieldSanitizers && fieldSanitizers[key]) {
      sanitized[key] = fieldSanitizers[key]!(value);
    }
    // Default: sanitize strings
    else if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value) as any;
    }
  }

  return sanitized;
}

