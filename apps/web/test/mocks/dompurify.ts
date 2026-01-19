import { vi } from 'vitest';

// Create a mock DOMPurify implementation
export const createMockDOMPurify = () => {
  const sanitize = vi.fn((input: string, config?: any) => {
    if (!input || typeof input !== 'string') return '';

    let result = input;

    // Remove script tags completely
    result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    result = result.replace(/<script.*?\/>/gi, '');

    // Remove event handlers
    result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    result = result.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: URLs
    result = result.replace(/javascript:/gi, '');

    // Handle allowed tags if specified
    if (config?.ALLOWED_TAGS && Array.isArray(config.ALLOWED_TAGS)) {
      const allowedTags = config.ALLOWED_TAGS.map(t => t.toLowerCase());

      // Remove tags not in allowed list
      result = result.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tagName) => {
        const tag = tagName.toLowerCase();
        if (allowedTags.includes(tag)) {
          // Keep allowed tags but remove dangerous attributes
          return match.replace(/\s*(on\w+|javascript:)[^>\s]*/gi, '');
        }
        return ''; // Remove non-allowed tags
      });
    }

    // Truncate if needed
    if (config?.maxLength && result.length > config.maxLength) {
      result = result.substring(0, config.maxLength);
    }

    return result.trim();
  });

  return {
    sanitize,
    isSupported: true,
    version: '3.0.5',
    removed: [],
    isValidAttribute: vi.fn(() => true),
    addHook: vi.fn(),
    removeHook: vi.fn(),
    removeHooks: vi.fn(),
    removeAllHooks: vi.fn(),
    setConfig: vi.fn(),
    clearConfig: vi.fn(),
  };
};

// Default export for direct import
const mockDOMPurify = createMockDOMPurify();

export default vi.fn((window?: any) => mockDOMPurify);