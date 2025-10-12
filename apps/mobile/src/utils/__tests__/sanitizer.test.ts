/**
 * Tests for input sanitization utilities
 */

import {
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeFileName,
  sanitizeUrl,
  sanitizeAmount,
  sanitizeRating,
  sanitizeMessage,
  sanitizeSearchQuery,
} from '../sanitizer';

describe('Input Sanitization', () => {
  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeText('<script>alert("xss")</script>')).toBe('');
      expect(sanitizeText('<b>Bold</b> text')).toBe('Bold text');
    });

    it('should remove HTML entities', () => {
      expect(sanitizeText('Test &amp; string')).toBe('Test string');
      expect(sanitizeText('&lt;script&gt;')).toBe('script');
    });

    it('should normalize whitespace', () => {
      expect(sanitizeText('  multiple   spaces  ')).toBe('multiple spaces');
      expect(sanitizeText('line\n\nbreaks')).toBe('line breaks');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(6000);
      expect(sanitizeText(longString).length).toBe(5000);
      expect(sanitizeText(longString, 100).length).toBe(100);
    });

    it('should handle empty/invalid input', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate and normalize email', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
      expect(sanitizeEmail('user@domain.co.uk')).toBe('user@domain.co.uk');
    });

    it('should reject invalid emails', () => {
      expect(() => sanitizeEmail('invalid')).toThrow('Invalid email format');
      expect(() => sanitizeEmail('no@domain')).toThrow('Invalid email format');
      expect(() => sanitizeEmail('@domain.com')).toThrow('Invalid email format');
    });
  });

  describe('sanitizePhone', () => {
    it('should extract digits from phone numbers', () => {
      expect(sanitizePhone('(555) 123-4567')).toBe('5551234567');
      expect(sanitizePhone('+1 555-123-4567')).toBe('15551234567');
    });

    it('should reject invalid phone numbers', () => {
      expect(() => sanitizePhone('123')).toThrow('Invalid phone number format');
      expect(() => sanitizePhone('123456789012')).toThrow('Invalid phone number format');
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize file names', () => {
      expect(sanitizeFileName('My Document.pdf')).toBe('my_document.pdf');
      expect(sanitizeFileName('file name with spaces')).toBe('file_name_with_spaces');
      expect(sanitizeFileName('file/with\\slashes')).toBe('file_with_slashes');
    });

    it('should handle empty input', () => {
      expect(sanitizeFileName('')).toBe('unnamed');
      expect(sanitizeFileName(null as any)).toBe('unnamed');
    });
  });

  describe('sanitizeUrl', () => {
    it('should validate HTTPS URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(sanitizeUrl('http://test.com/path')).toBe('http://test.com/path');
    });

    it('should reject invalid protocols', () => {
      expect(() => sanitizeUrl('javascript:alert(1)')).toThrow();
      expect(() => sanitizeUrl('file:///etc/passwd')).toThrow();
      expect(() => sanitizeUrl('ftp://server.com')).toThrow();
    });

    it('should reject malformed URLs', () => {
      expect(() => sanitizeUrl('not a url')).toThrow('Invalid URL format');
    });
  });

  describe('sanitizeAmount', () => {
    it('should sanitize monetary amounts', () => {
      expect(sanitizeAmount('123.456')).toBe(123.46);
      expect(sanitizeAmount(99.999)).toBe(100);
      expect(sanitizeAmount('50')).toBe(50);
    });

    it('should enforce minimum of 0', () => {
      expect(sanitizeAmount('-100')).toBe(0);
      expect(sanitizeAmount(-50.5)).toBe(0);
    });

    it('should enforce maximum', () => {
      expect(sanitizeAmount(2000000)).toBe(1000000);
    });
  });

  describe('sanitizeRating', () => {
    it('should sanitize ratings', () => {
      expect(sanitizeRating('4.5')).toBe(4.5);
      expect(sanitizeRating(3)).toBe(3);
    });

    it('should enforce 1-5 range', () => {
      expect(sanitizeRating(0)).toBe(1);
      expect(sanitizeRating(10)).toBe(5);
    });
  });

  describe('sanitizeMessage', () => {
    it('should sanitize and limit message length', () => {
      const longMessage = 'a'.repeat(2000);
      expect(sanitizeMessage(longMessage).length).toBe(1000);
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should sanitize and limit search query length', () => {
      const longQuery = 'a'.repeat(500);
      expect(sanitizeSearchQuery(longQuery).length).toBe(200);
    });
  });
});

