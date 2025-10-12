import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a DOM environment for server-side DOMPurify
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: string[];
  maxLength?: number;
}): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Truncate if too long
  const maxLength = options?.maxLength || 10000;
  const truncated = input.length > maxLength ? input.substring(0, maxLength) : input;

  // Configure DOMPurify
  const config = {
    ALLOWED_TAGS: options?.allowedTags || ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: options?.allowedAttributes || [],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
  };

  return purify.sanitize(truncated, config);
}

/**
 * Sanitize plain text (removes all HTML)
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
 * Sanitize job description with specific rules
 */
export function sanitizeJobDescription(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    maxLength: 5000
  });
}

/**
 * Sanitize contractor bio with specific rules
 */
export function sanitizeContractorBio(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ['p', 'br', 'strong', 'em'],
    maxLength: 2000
  });
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
    throw new Error('Invalid email format');
  }

  const email = input.trim().toLowerCase();
  
  if (!email) {
    throw new Error('Invalid email format');
  }
  
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
    throw new Error('Invalid phone number format');
  }

  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');
  
  if (!digits) {
    throw new Error('Invalid phone number format');
  }
  
  // Phone number validation (10-14 digits to support international numbers)
  if (digits.length < 10 || digits.length > 14) {
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
