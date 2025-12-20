/**
 * Tests for sanitization utilities
 */

import {
  sanitizeHtml,
  sanitizeText,
  sanitizeJobDescription,
  sanitizeContractorBio,
  sanitizeMessage,
  sanitizeSearchQuery,
  sanitizeEmail,
  sanitizePhone,
  sanitizeFileName,
  sanitizeUrl,
} from '../sanitizer';

describe('sanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('should remove dangerous script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove event handlers', () => {
      const input = '<p onclick="alert(\'xss\')">Click me</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(\'xss\')">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
    });

    it('should truncate long content', () => {
      const longString = 'a'.repeat(15000);
      const result = sanitizeHtml(longString, { maxLength: 100 });
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should allow custom tags', () => {
      const input = '<div><span>Text</span></div>';
      const result = sanitizeHtml(input, { allowedTags: ['div', 'span'] });
      expect(result).toContain('<div>');
      expect(result).toContain('<span>');
    });

    it('should remove non-allowed tags', () => {
      const input = '<p>Safe</p><img src="x" /><script>Bad</script>';
      const result = sanitizeHtml(input, { allowedTags: ['p'] });
      expect(result).toContain('<p>');
      expect(result).not.toContain('<img');
      expect(result).not.toContain('<script>');
    });

    it('should handle nested tags', () => {
      const input = '<p><strong><em>Nested</em></strong></p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });
  });

  describe('sanitizeText', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeText(input);
      expect(result).toBe('Hello World');
      expect(result).not.toContain('<');
    });

    it('should decode HTML entities', () => {
      const input = 'Hello &amp; goodbye';
      const result = sanitizeText(input);
      expect(result).not.toContain('&amp;');
    });

    it('should normalize whitespace', () => {
      const input = 'Hello    World   \n\n  Test';
      const result = sanitizeText(input);
      expect(result).toBe('Hello World Test');
    });

    it('should trim whitespace', () => {
      const input = '   Hello World   ';
      const result = sanitizeText(input);
      expect(result).toBe('Hello World');
    });

    it('should truncate to max length', () => {
      const longText = 'a'.repeat(10000);
      const result = sanitizeText(longText, 100);
      expect(result.length).toBe(100);
    });

    it('should handle empty input', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null as any)).toBe('');
    });

    it('should remove complex XSS attempts', () => {
      const input = '<img src=x onerror="alert(1)">';
      const result = sanitizeText(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });
  });

  describe('sanitizeJobDescription', () => {
    it('should allow job description tags', () => {
      const input = '<p>Job <strong>description</strong></p><ul><li>Item</li></ul>';
      const result = sanitizeJobDescription(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<ul>');
    });

    it('should enforce max length', () => {
      const longDesc = '<p>' + 'a'.repeat(10000) + '</p>';
      const result = sanitizeJobDescription(longDesc);
      expect(result.length).toBeLessThanOrEqual(5000);
    });

    it('should remove dangerous content', () => {
      const input = '<p>Job</p><script>alert("xss")</script>';
      const result = sanitizeJobDescription(input);
      expect(result).not.toContain('<script>');
    });
  });

  describe('sanitizeContractorBio', () => {
    it('should allow bio tags', () => {
      const input = '<p>I am a <strong>contractor</strong></p>';
      const result = sanitizeContractorBio(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('should enforce stricter max length', () => {
      const longBio = '<p>' + 'a'.repeat(5000) + '</p>';
      const result = sanitizeContractorBio(longBio);
      expect(result.length).toBeLessThanOrEqual(2000);
    });

    it('should not allow lists', () => {
      const input = '<ul><li>Item</li></ul>';
      const result = sanitizeContractorBio(input);
      expect(result).not.toContain('<ul>');
      expect(result).not.toContain('<li>');
    });
  });

  describe('sanitizeMessage', () => {
    it('should convert HTML to plain text', () => {
      const input = '<p>Hello <strong>friend</strong></p>';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello friend');
    });

    it('should enforce 1000 char limit', () => {
      const longMessage = 'a'.repeat(2000);
      const result = sanitizeMessage(longMessage);
      expect(result.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should clean search query', () => {
      const input = '<script>plumber</script>';
      const result = sanitizeSearchQuery(input);
      expect(result).toBe('plumber');
      expect(result).not.toContain('<');
    });

    it('should enforce 200 char limit', () => {
      const longQuery = 'search term '.repeat(50);
      const result = sanitizeSearchQuery(longQuery);
      expect(result.length).toBeLessThanOrEqual(200);
    });

    it('should normalize whitespace in queries', () => {
      const input = '  plumber    near   me  ';
      const result = sanitizeSearchQuery(input);
      expect(result).toBe('plumber near me');
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate and lowercase email', () => {
      const result = sanitizeEmail('Test@Example.COM');
      expect(result).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      const result = sanitizeEmail('  test@example.com  ');
      expect(result).toBe('test@example.com');
    });

    it('should reject invalid email format', () => {
      expect(() => sanitizeEmail('notanemail')).toThrow('Invalid email format');
      expect(() => sanitizeEmail('@example.com')).toThrow('Invalid email format');
      expect(() => sanitizeEmail('test@')).toThrow('Invalid email format');
      expect(() => sanitizeEmail('')).toThrow('Invalid email format');
    });

    it('should reject null or undefined', () => {
      expect(() => sanitizeEmail(null as any)).toThrow('Invalid email format');
      expect(() => sanitizeEmail(undefined as any)).toThrow('Invalid email format');
    });

    it('should accept valid emails', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
      expect(sanitizeEmail('user.name@example.co.uk')).toBe('user.name@example.co.uk');
      expect(sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
    });
  });

  describe('sanitizePhone', () => {
    it('should extract digits only', () => {
      const result = sanitizePhone('(123) 456-7890');
      expect(result).toBe('1234567890');
    });

    it('should accept various formats', () => {
      expect(sanitizePhone('123-456-7890')).toBe('1234567890');
      expect(sanitizePhone('123.456.7890')).toBe('1234567890');
      expect(sanitizePhone('123 456 7890')).toBe('1234567890');
    });

    it('should reject too short numbers', () => {
      expect(() => sanitizePhone('12345')).toThrow('Invalid phone number format');
    });

    it('should reject too long numbers', () => {
      expect(() => sanitizePhone('123456789012345')).toThrow('Invalid phone number format');
    });

    it('should reject empty input', () => {
      expect(() => sanitizePhone('')).toThrow('Invalid phone number format');
      expect(() => sanitizePhone(null as any)).toThrow('Invalid phone number format');
    });

    it('should accept international formats', () => {
      expect(sanitizePhone('+1 234 567 8901')).toBe('12345678901');
      expect(sanitizePhone('+44 20 7123 4567')).toBe('442071234567');
    });

    it('should reject non-numeric input', () => {
      expect(() => sanitizePhone('abc')).toThrow('Invalid phone number format');
    });
  });

  describe('sanitizeFileName', () => {
    it('should replace special characters with underscore', () => {
      const result = sanitizeFileName('my file!@#$%.txt');
      expect(result).toBe('my_file_.txt');
    });

    it('should convert to lowercase', () => {
      const result = sanitizeFileName('MyFile.TXT');
      expect(result).toBe('myfile.txt');
    });

    it('should allow alphanumeric, dots, and dashes', () => {
      const result = sanitizeFileName('my-file.v2.txt');
      expect(result).toBe('my-file.v2.txt');
    });

    it('should collapse multiple underscores', () => {
      const result = sanitizeFileName('my___file.txt');
      expect(result).toBe('my_file.txt');
    });

    it('should limit length to 100 characters', () => {
      const longName = 'a'.repeat(200) + '.txt';
      const result = sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should handle empty input', () => {
      expect(sanitizeFileName('')).toBe('unnamed');
      expect(sanitizeFileName(null as any)).toBe('unnamed');
    });

    it('should handle Unicode characters', () => {
      const result = sanitizeFileName('файл.txt');
      expect(result).not.toContain('ф');
      expect(result).toContain('.txt');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTP URLs', () => {
      const result = sanitizeUrl('http://example.com');
      expect(result).toBe('http://example.com/');
    });

    it('should accept valid HTTPS URLs', () => {
      const result = sanitizeUrl('https://example.com/path?query=1');
      expect(result).toBe('https://example.com/path?query=1');
    });

    it('should reject javascript: protocol', () => {
      expect(() => sanitizeUrl('javascript:alert(1)')).toThrow('Invalid protocol');
    });

    it('should reject data: protocol', () => {
      expect(() => sanitizeUrl('data:text/html,<script>alert(1)</script>')).toThrow('Invalid protocol');
    });

    it('should reject file: protocol', () => {
      expect(() => sanitizeUrl('file:///etc/passwd')).toThrow('Invalid protocol');
    });

    it('should reject malformed URLs', () => {
      expect(() => sanitizeUrl('not a url')).toThrow('Invalid URL format');
      expect(() => sanitizeUrl('http://')).toThrow('Invalid URL format');
    });

    it('should handle empty input', () => {
      expect(sanitizeUrl('')).toBe('');
      expect(sanitizeUrl(null as any)).toBe('');
    });

    it('should preserve URL parameters', () => {
      const url = 'https://example.com/page?param1=value1&param2=value2';
      const result = sanitizeUrl(url);
      expect(result).toContain('param1=value1');
      expect(result).toContain('param2=value2');
    });

    it('should preserve URL fragments', () => {
      const url = 'https://example.com/page#section';
      const result = sanitizeUrl(url);
      expect(result).toContain('#section');
    });
  });

  describe('XSS protection', () => {
    const xssAttempts = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror="alert(1)">',
      '<svg/onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<body onload=alert(1)>',
      '<input onfocus=alert(1) autofocus>',
      '<select onfocus=alert(1) autofocus>',
      '<textarea onfocus=alert(1) autofocus>',
      '<marquee onstart=alert(1)>',
    ];

    xssAttempts.forEach(xss => {
      it(`should protect against: ${xss}`, () => {
        const resultHtml = sanitizeHtml(xss);
        const resultText = sanitizeText(xss);

        expect(resultHtml).not.toContain('alert');
        expect(resultText).not.toContain('alert');
        expect(resultHtml).not.toContain('onerror');
        expect(resultText).not.toContain('onerror');
      });
    });
  });
});
