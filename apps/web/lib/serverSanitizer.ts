/**
 * Server-only sanitization utilities
 * This file should only be imported in server components/API routes
 * DO NOT import in client components - use sanitizer.ts instead
 */

import DOMPurify from 'dompurify';

// Lazy-load jsdom only when needed (server-side)
let serverPurify: typeof DOMPurify | null = null;

function getServerPurify(): typeof DOMPurify {
  if (serverPurify) {
    return serverPurify;
  }

  // Only run on server
  if (typeof window !== 'undefined') {
    throw new Error('serverSanitizer should only be used on the server');
  }

  // Dynamic require to avoid bundling in client
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JSDOM } = require('jsdom');
  const domWindow = new JSDOM('').window;
  serverPurify = DOMPurify(domWindow as any);
  
  return serverPurify;
}

/**
 * Sanitize HTML content on the server side
 * Only use this in API routes or server components
 */
export function sanitizeHtmlServer(input: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: string[];
  maxLength?: number;
}): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const maxLength = options?.maxLength || 10000;
  const truncated = input.length > maxLength ? input.substring(0, maxLength) : input;

  const config = {
    ALLOWED_TAGS: options?.allowedTags || ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: options?.allowedAttributes || [],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
  };

  return getServerPurify().sanitize(truncated, config);
}

