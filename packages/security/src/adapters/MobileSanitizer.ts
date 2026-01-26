/**
 * Mobile platform sanitizer for React Native
 * Uses regex-based sanitization since DOMPurify is not available
 */
import { BaseSanitizer, SanitizationOptions } from '../core/BaseSanitizer';
import { logger } from '@mintenance/shared';
export class MobileSanitizer extends BaseSanitizer {
  // Comprehensive regex patterns for security
  private static readonly SCRIPT_TAGS = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
  private static readonly STYLE_TAGS = /<style[\s\S]*?>[\s\S]*?<\/style>/gi;
  private static readonly EVENT_HANDLER_ATTRS = /\s*on\w+\s*=\s*["'][^"']*["']/gi;
  private static readonly EVENT_HANDLER_ATTRS_UNQUOTED = /\s*on\w+\s*=\s*[^\s>]+/gi;
  private static readonly DANGEROUS_PROTOCOLS = /\b(javascript|vbscript|data|file):/gi;
  private static readonly IFRAME_TAGS = /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi;
  private static readonly OBJECT_EMBED_TAGS = /<(object|embed|applet)[\s\S]*?>[\s\S]*?<\/(object|embed|applet)>/gi;
  private static readonly META_REFRESH = /<meta[^>]*http-equiv[^>]*refresh[^>]*>/gi;
  private static readonly BASE_TAG = /<base[^>]*>/gi;
  private static readonly FORM_TAGS = /<form[\s\S]*?>[\s\S]*?<\/form>/gi;
  private static readonly ALL_TAGS = /<[^>]*>/g;
  /**
   * Sanitize HTML content using regex patterns
   * Less comprehensive than DOMPurify but suitable for React Native
   */
  sanitizeHtml(input: string | undefined | null, options?: SanitizationOptions): string {
    if (!input || typeof input !== 'string') return '';
    // For mobile, we recommend not rendering HTML at all
    // All HTML should be sanitized server-side before sending to mobile
    if (process.env.NODE_ENV === 'development') {
      logger.warn(
        '[MobileSanitizer] HTML sanitization in mobile app detected. ' +
        'Consider sanitizing HTML server-side for better security.'
      );
    }
    // If stripTags is true or no HTML rendering is needed, return plain text
    if (options?.stripTags !== false) {
      return BaseSanitizer.sanitizeText(input, options?.maxLength);
    }
    let sanitized = input;
    // Remove dangerous elements and attributes in order of risk
    sanitized = sanitized.replace(MobileSanitizer.SCRIPT_TAGS, '');
    sanitized = sanitized.replace(MobileSanitizer.STYLE_TAGS, '');
    sanitized = sanitized.replace(MobileSanitizer.IFRAME_TAGS, '');
    sanitized = sanitized.replace(MobileSanitizer.OBJECT_EMBED_TAGS, '');
    sanitized = sanitized.replace(MobileSanitizer.META_REFRESH, '');
    sanitized = sanitized.replace(MobileSanitizer.BASE_TAG, '');
    sanitized = sanitized.replace(MobileSanitizer.FORM_TAGS, '');
    sanitized = sanitized.replace(MobileSanitizer.EVENT_HANDLER_ATTRS, '');
    sanitized = sanitized.replace(MobileSanitizer.EVENT_HANDLER_ATTRS_UNQUOTED, '');
    sanitized = sanitized.replace(MobileSanitizer.DANGEROUS_PROTOCOLS, '');
    // If allowed tags are specified, remove all other tags
    if (options?.allowedTags && options.allowedTags.length > 0) {
      const allowedTagsPattern = options.allowedTags.join('|');
      const keepTagsRegex = new RegExp(
        `<(?!\/?(?:${allowedTagsPattern})\\b)[^>]*>`,
        'gi'
      );
      sanitized = sanitized.replace(keepTagsRegex, '');
    }
    // Apply max length if specified
    if (options?.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }
    return sanitized;
  }
  /**
   * Enhanced text sanitization for mobile
   * More comprehensive than base implementation
   */
  static sanitizeTextEnhanced(input: string | undefined | null, maxLength?: number): string {
    if (!input || typeof input !== 'string') return '';
    let text = String(input);
    // Remove script tags (case-insensitive, handles variations)
    text = text.replace(this.SCRIPT_TAGS, '');
    text = text.replace(this.STYLE_TAGS, '');
    // Remove ALL event handlers (comprehensive list)
    text = text.replace(this.EVENT_HANDLER_ATTRS, '');
    text = text.replace(this.EVENT_HANDLER_ATTRS_UNQUOTED, '');
    // Remove dangerous protocols
    text = text.replace(this.DANGEROUS_PROTOCOLS, '');
    // Remove other dangerous tags
    text = text.replace(this.IFRAME_TAGS, '');
    text = text.replace(this.OBJECT_EMBED_TAGS, '');
    text = text.replace(this.META_REFRESH, '');
    text = text.replace(this.BASE_TAG, '');
    text = text.replace(this.FORM_TAGS, '');
    // Remove ALL remaining HTML tags
    text = text.replace(this.ALL_TAGS, '');
    // Decode common HTML entities
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&[a-zA-Z0-9#]+;/g, ' ');
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    // Truncate if needed
    const max = maxLength || 5000;
    return text.length > max ? text.substring(0, max) : text;
  }
  /**
   * Sanitize numeric input with mobile-specific constraints
   */
  static sanitizeAmount(input: unknown): number | null {
    return BaseSanitizer.sanitizeNumeric(input, {
      min: 0,
      max: 1000000, // £1M max
      decimals: 2,
    });
  }
  /**
   * Sanitize rating input (1-5 stars)
   */
  static sanitizeRating(input: unknown): number | null {
    return BaseSanitizer.sanitizeNumeric(input, {
      min: 1,
      max: 5,
      decimals: 1,
    });
  }
  /**
   * Sanitize object recursively
   * Useful for form data sanitization
   */
  static sanitizeObject<T extends Record<string, any>>(
    obj: T,
    fieldSanitizers?: Partial<Record<keyof T, (value: unknown) => any>>
  ): T {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = { ...obj };
    for (const key in sanitized) {
      if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
        const value = sanitized[key];
        // Use custom sanitizer if provided
        if (fieldSanitizers && fieldSanitizers[key]) {
          sanitized[key] = fieldSanitizers[key]!(value);
        }
        // Recursively sanitize nested objects
        else if (value && typeof value === 'object' && !Array.isArray(value)) {
          sanitized[key] = this.sanitizeObject(value) as any;
        }
        // Sanitize arrays
        else if (Array.isArray(value)) {
          sanitized[key] = value.map((item: unknown) =>
            typeof item === 'string' ? this.sanitizeTextEnhanced(item) : item
          ) as any;
        }
        // Default string sanitization
        else if (typeof value === 'string') {
          sanitized[key] = this.sanitizeTextEnhanced(value) as any;
        }
      }
    }
    return sanitized;
  }
  /**
   * Check if input contains potential XSS vectors
   * Used for validation before sanitization
   */
  static containsXSSPatterns(input: string): boolean {
    if (!input || typeof input !== 'string') return false;
    const xssPatterns = [
      this.SCRIPT_TAGS,
      this.EVENT_HANDLER_ATTRS,
      this.EVENT_HANDLER_ATTRS_UNQUOTED,
      this.DANGEROUS_PROTOCOLS,
      this.IFRAME_TAGS,
      /<img[^>]*src[^>]*onerror/gi,
      /<svg[^>]*onload/gi,
    ];
    return xssPatterns.some(pattern => pattern.test(input));
  }
  /**
   * Mobile-specific: Sanitize for React Native Text component
   * Ensures text is safe for display in React Native
   */
  static sanitizeForReactNative(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    // React Native Text component doesn't render HTML
    // So we just need to ensure no control characters or encoding issues
    let safe = String(input);
    // Remove null bytes and control characters
    safe = safe.replace(/\0/g, '');
    safe = safe.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // Normalize unicode
    if (safe.normalize) {
      safe = safe.normalize('NFC');
    }
    // Trim and return
    return safe.trim();
  }
}