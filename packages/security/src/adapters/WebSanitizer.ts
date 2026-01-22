/**
 * Web platform sanitizer using DOMPurify
 * Provides comprehensive XSS protection for web applications
 */
import DOMPurify from 'dompurify';
import { BaseSanitizer, SanitizationOptions } from '../core/BaseSanitizer';
export class WebSanitizer extends BaseSanitizer {
  private static purifyInstance: typeof DOMPurify | null = null;
  /**
   * Initialize DOMPurify instance
   * Handles both client and server environments
   */
  private static getPurify(): typeof DOMPurify {
    if (this.purifyInstance) {
      return this.purifyInstance;
    }
    // Client-side: Use browser's native window
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.purifyInstance = DOMPurify;
      return this.purifyInstance;
    }
    // Server-side: Use jsdom to create a window
    if (typeof window === 'undefined') {
      try {
        const { JSDOM } = require('jsdom');
        const domWindow = new JSDOM('').window;
        this.purifyInstance = DOMPurify(domWindow as any);
        return this.purifyInstance;
      } catch (error) {
        throw new Error(
          'DOMPurify requires jsdom for server-side usage. Please install jsdom: npm install jsdom'
        );
      }
    }
    throw new Error('Unable to initialize DOMPurify');
  }
  /**
   * Sanitize HTML content using DOMPurify
   * Removes XSS vectors while preserving safe HTML
   */
  sanitizeHtml(input: string | undefined | null, options?: SanitizationOptions): string {
    if (!input || typeof input !== 'string') return '';
    const purify = WebSanitizer.getPurify();
    // Default configuration
    const defaultConfig: DOMPurify.Config = {
      ALLOWED_TAGS: options?.allowedTags || [
        'p', 'br', 'strong', 'em', 'u', 's',
        'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'a', 'code', 'pre',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
      ALLOW_DATA_ATTR: false,
      USE_PROFILES: { html: true },
      FORCE_BODY: true,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
      IN_PLACE: false,
    };
    // Merge with custom options if provided
    if (options?.allowedAttributes) {
      defaultConfig.ALLOWED_ATTR = Object.keys(options.allowedAttributes);
    }
    // Strip all tags if requested
    if (options?.stripTags) {
      return BaseSanitizer.sanitizeText(input, options.maxLength);
    }
    // Sanitize with DOMPurify
    let sanitized = purify.sanitize(input, defaultConfig);
    // Apply max length if specified
    if (options?.maxLength && sanitized.length > options.maxLength) {
      // Try to cut at a tag boundary to avoid breaking HTML
      sanitized = this.truncateHtml(sanitized, options.maxLength);
    }
    return sanitized;
  }
  /**
   * Truncate HTML while preserving valid structure
   */
  private truncateHtml(html: string, maxLength: number): string {
    if (html.length <= maxLength) return html;
    // Simple truncation - in production, use a proper HTML truncation library
    let truncated = html.substring(0, maxLength);
    // Try to find the last complete tag
    const lastTagEnd = truncated.lastIndexOf('>');
    if (lastTagEnd > 0) {
      truncated = truncated.substring(0, lastTagEnd + 1);
    }
    // Close any open tags (simplified approach)
    const openTags: string[] = [];
    const tagRegex = /<\/?([a-zA-Z]+)[^>]*>/g;
    let match;
    while ((match = tagRegex.exec(truncated)) !== null) {
      const [fullMatch, tagName] = match;
      if (fullMatch.startsWith('</')) {
        // Closing tag
        const index = openTags.lastIndexOf(tagName);
        if (index >= 0) {
          openTags.splice(index, 1);
        }
      } else if (!fullMatch.endsWith('/>')) {
        // Opening tag (not self-closing)
        openTags.push(tagName);
      }
    }
    // Close remaining open tags
    for (let i = openTags.length - 1; i >= 0; i--) {
      truncated += `</${openTags[i]}>`;
    }
    return truncated;
  }
  /**
   * Server-side specific HTML sanitization
   * Throws error if used client-side
   */
  static sanitizeHtmlServer(input: string | undefined | null, options?: SanitizationOptions): string {
    if (typeof window !== 'undefined') {
      throw new Error('sanitizeHtmlServer can only be used server-side. Use sanitizeHtml instead.');
    }
    const instance = new WebSanitizer();
    return instance.sanitizeHtml(input, options);
  }
  /**
   * Check if running in a server environment
   */
  static isServerEnvironment(): boolean {
    return typeof window === 'undefined';
  }
  /**
   * Check if DOMPurify is available
   */
  static isDOMPurifyAvailable(): boolean {
    try {
      this.getPurify();
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Get DOMPurify version for debugging
   */
  static getDOMPurifyVersion(): string | null {
    try {
      const purify = this.getPurify();
      return (purify as any).version || null;
    } catch {
      return null;
    }
  }
}