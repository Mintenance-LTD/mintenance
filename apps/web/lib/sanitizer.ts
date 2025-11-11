import DOMPurify from 'dompurify';

// Environment-aware DOMPurify initialization
// Client-side: Use browser's native window
// Server-side: Should use serverSanitizer.ts instead, but this provides fallback
let purify: typeof DOMPurify | null = null;

function getPurify(): typeof DOMPurify {
  if (purify) {
    return purify;
  }

  // Client-side: Use browser's native window (most common case)
  // This path is taken when code runs in browser (e.g., exportUtils.ts)
  if (typeof window !== 'undefined') {
    purify = DOMPurify;
    return purify;
  }

  // Server-side: Only executed in Node.js environment
  // This code path should never be reached in client bundles
  // Using string-based require to prevent static analysis by bundlers
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const requireFunc = typeof require !== 'undefined' ? require : null;
  if (!requireFunc) {
    throw new Error('require is not available - this should only run server-side');
  }
  
  // Use indirect require to prevent static analysis
  const jsdomModule = requireFunc('jsdom');
  const { JSDOM } = jsdomModule;
  const domWindow = new JSDOM('').window;
  purify = DOMPurify(domWindow as any);
  
  return purify;
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * Works in both server and client environments
 * 
 * Note: For server-side usage in API routes, prefer using sanitizeHtmlServer
 * from @/lib/serverSanitizer for better compatibility with bundlers
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

  return getPurify().sanitize(truncated, config);
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

  // RFC 5322 compliant email regex (simplified but more robust)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

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

/**
 * Escapes SQL wildcards and special characters for use in ILIKE queries.
 * 
 * Protects against SQL injection attacks like:
 * - Input: "%' OR '1'='1" → Escaped: "\%' OR '1'='1"
 * - Input: "test_%" → Escaped: "test\_\%"
 * 
 * @param input - User-provided search term
 * @returns Safely escaped string suitable for SQL ILIKE patterns
 */
export function escapeSQLWildcards(input: string): string {
  if (!input) return '';

  return input
    // Escape backslashes first (must be first to avoid double-escaping)
    .replace(/\\/g, '\\\\')
    // Escape SQL wildcards
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    // Escape single quotes for SQL string safety
    .replace(/'/g, "''");
}

/**
 * Sanitizes and escapes user input for safe use in SQL ILIKE queries.
 * 
 * This is a two-step process:
 * 1. Remove XSS/HTML injection attempts (via sanitizeText)
 * 2. Escape SQL wildcards and special characters
 * 
 * @param input - User-provided search term
 * @returns Sanitized and SQL-safe search term
 * 
 * @example
 * ```typescript
 * const userInput = "%' OR '1'='1 <script>alert('xss')</script>";
 * const safe = sanitizeForSQL(userInput);
 * // Result: "\%' OR '1'='1 "
 * 
 * // Use in Supabase query:
 * .ilike('column_name', `%${safe}%`)
 * ```
 */
export function sanitizeForSQL(input: string | undefined | null): string {
  if (!input) return '';

  // Step 1: Remove HTML/XSS attempts
  const xssSafe = sanitizeText(input);

  // Step 2: Escape SQL wildcards
  const sqlSafe = escapeSQLWildcards(xssSafe);

  // Trim whitespace
  return sqlSafe.trim();
}