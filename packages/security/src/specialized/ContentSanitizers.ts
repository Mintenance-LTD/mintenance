/**
 * Specialized content sanitizers for specific use cases
 * Consistent across web and mobile platforms
 */
import { BaseSanitizer } from '../core/BaseSanitizer';
export class ContentSanitizers {
  /**
   * Sanitize job descriptions
   * Allows limited HTML for formatting
   */
  static jobDescription(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    // For now, use text sanitization
    // In production, this would use platform-specific HTML sanitizer
    const sanitized = BaseSanitizer.sanitizeText(input, 5000);
    return sanitized;
  }
  /**
   * Sanitize contractor bio
   * More restrictive than job descriptions
   */
  static contractorBio(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    const sanitized = BaseSanitizer.sanitizeText(input, 2000);
    return sanitized;
  }
  /**
   * Sanitize chat messages
   * Plain text only, no HTML
   */
  static message(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    const sanitized = BaseSanitizer.sanitizeText(input, 1000);
    return sanitized;
  }
  /**
   * Sanitize search queries
   * Remove SQL injection patterns and limit length
   */
  static searchQuery(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    // First, apply text sanitization
    let sanitized = BaseSanitizer.sanitizeText(input, 200);
    // Then remove SQL-specific patterns
    sanitized = BaseSanitizer.sanitizeForSQL(sanitized);
    // Remove wildcards that could affect search behavior
    sanitized = sanitized.replace(/[%_*]/g, '');
    // Trim and return
    return sanitized.trim();
  }
  /**
   * Sanitize property addresses
   * Allow alphanumeric, spaces, commas, and common address characters
   */
  static address(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    // Remove any HTML/script tags first
    let sanitized = BaseSanitizer.sanitizeText(input, 500);
    // Allow only address-safe characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s,.\-#]/g, '');
    // Normalize multiple spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    return sanitized;
  }
  /**
   * Sanitize company names
   * Allow alphanumeric, spaces, and common business characters
   */
  static companyName(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    let sanitized = BaseSanitizer.sanitizeText(input, 100);
    // Allow common business name characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s&.\-']/g, '');
    // Normalize spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    return sanitized;
  }
  /**
   * Sanitize person names
   * More restrictive than company names
   */
  static personName(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    let sanitized = BaseSanitizer.sanitizeText(input, 100);
    // Allow only letters, spaces, hyphens, and apostrophes
    sanitized = sanitized.replace(/[^a-zA-Z\s\-']/g, '');
    // Normalize spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    return sanitized;
  }
  /**
   * Sanitize review content
   * Similar to messages but slightly longer
   */
  static reviewContent(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    const sanitized = BaseSanitizer.sanitizeText(input, 2000);
    return sanitized;
  }
  /**
   * Sanitize invoice descriptions
   * Plain text, no special formatting
   */
  static invoiceDescription(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    let sanitized = BaseSanitizer.sanitizeText(input, 500);
    // Remove any characters that could cause issues in invoices
    sanitized = sanitized.replace(/[^\w\s\-.,£$€]/g, '');
    return sanitized.trim();
  }
  /**
   * Sanitize milestone titles
   * Short, descriptive text
   */
  static milestoneTitle(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    const sanitized = BaseSanitizer.sanitizeText(input, 100);
    return sanitized;
  }
  /**
   * Sanitize tags/categories
   * Alphanumeric with hyphens only
   */
  static tag(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    let sanitized = input.toLowerCase().trim();
    // Remove any non-alphanumeric characters except hyphens
    sanitized = sanitized.replace(/[^a-z0-9\-]/g, '');
    // Remove multiple hyphens
    sanitized = sanitized.replace(/\-+/g, '-');
    // Remove leading/trailing hyphens
    sanitized = sanitized.replace(/^\-|\-$/g, '');
    // Limit length
    const maxLength = 50;
    return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
  }
  /**
   * Sanitize JSON string input
   * Validates and sanitizes JSON data
   */
  static jsonString(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '{}';
    try {
      // Parse and re-stringify to ensure valid JSON
      const parsed = JSON.parse(input);
      // Recursively sanitize string values in the JSON
      const sanitizeJsonValue = (value: unknown): any => {
        if (typeof value === 'string') {
          return BaseSanitizer.sanitizeText(value);
        } else if (Array.isArray(value)) {
          return value.map(sanitizeJsonValue);
        } else if (value && typeof value === 'object') {
          const objValue = value as Record<string, unknown>;
          const sanitized: Record<string, unknown> = {};
          for (const key in objValue) {
            if (Object.prototype.hasOwnProperty.call(objValue, key)) {
              // Sanitize the key as well
              const safeKey = BaseSanitizer.sanitizeText(key, 50);
              sanitized[safeKey] = sanitizeJsonValue(objValue[key]);
            }
          }
          return sanitized;
        }
        return value;
      };
      const sanitized = sanitizeJsonValue(parsed);
      return JSON.stringify(sanitized);
    } catch {
      // If not valid JSON, return empty object
      return '{}';
    }
  }
  /**
   * Sanitize API keys or tokens
   * Validates format but doesn't expose the actual value
   */
  static apiKey(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    // Remove any whitespace
    const trimmed = input.trim();
    // Check if it looks like a valid API key (alphanumeric with hyphens/underscores)
    const apiKeyPattern = /^[a-zA-Z0-9\-_]{20,}$/;
    if (!apiKeyPattern.test(trimmed)) {
      return '';
    }
    return trimmed;
  }
  /**
   * Sanitize webhook URLs
   * Validates webhook endpoint format
   */
  static webhookUrl(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    // Use the base URL sanitizer
    const sanitized = BaseSanitizer.sanitizeUrl(input);
    if (!sanitized) return '';
    // Additional validation for webhooks
    try {
      const url = new URL(sanitized);
      // Webhooks should use HTTPS in production
      if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
        return '';
      }
      // Prevent localhost webhooks in production
      if (
        process.env.NODE_ENV === 'production' &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      ) {
        return '';
      }
      return sanitized;
    } catch {
      return '';
    }
  }
  /**
   * Create a sanitizer for a specific field type
   * Factory method for custom sanitizers
   */
  static createFieldSanitizer(
    fieldType: 'text' | 'html' | 'email' | 'phone' | 'url' | 'number',
    maxLength?: number
  ): (input: unknown) => string | number | null {
    switch (fieldType) {
      case 'text':
        return (input) => BaseSanitizer.sanitizeText(input as string | undefined | null, maxLength);
      case 'html':
        // This would use platform-specific HTML sanitizer
        return (input) => BaseSanitizer.sanitizeText(input as string | undefined | null, maxLength);
      case 'email':
        return (input) => BaseSanitizer.sanitizeEmail(input as string | undefined | null);
      case 'phone':
        return (input) => BaseSanitizer.sanitizePhone(input as string | undefined | null);
      case 'url':
        return (input) => BaseSanitizer.sanitizeUrl(input as string | undefined | null);
      case 'number':
        return (input) => BaseSanitizer.sanitizeNumeric(input as string | number | undefined | null);
      default:
        return (input) => BaseSanitizer.sanitizeText(input as string | undefined | null, maxLength);
    }
  }
}