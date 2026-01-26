/**
 * Comprehensive tests for @mintenance/security package
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  sanitize,
  SqlProtection,
  SanitizationRateLimiter,
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeForSQL,
  utils,
} from '../index';

describe('@mintenance/security', () => {
  describe('Text Sanitization', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("XSS")</script>Hello <b>World</b>';
      const result = sanitize.text(input);
      expect(result).toBe('Hello World');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should handle null and undefined', () => {
      expect(sanitize.text(null)).toBe('');
      expect(sanitize.text(undefined)).toBe('');
      expect(sanitize.text('')).toBe('');
    });

    it('should respect max length', () => {
      const longText = 'a'.repeat(1000);
      const result = sanitize.text(longText, 100);
      expect(result.length).toBe(100);
    });

    it('should normalize whitespace', () => {
      const input = '  Hello   World  \n\t Test  ';
      const result = sanitize.text(input);
      expect(result).toBe('Hello World Test');
    });

    it('should remove HTML entities', () => {
      const input = 'Hello &lt;World&gt; &amp; &quot;Test&quot;';
      const result = sanitize.text(input);
      expect(result).toBe('Hello World Test');
    });
  });

  describe('SQL Injection Protection', () => {
    describe('Basic SQL Sanitization', () => {
      it('should escape SQL wildcards', () => {
        const input = "Hello%_World';DROP TABLE users;--";
        const result = sanitize.sql(input);
        expect(result).toContain('\\%');
        expect(result).toContain('\\_');
        expect(result).toContain("''");
        expect(result).not.toContain('<');
      });

      it('should handle ILIKE patterns', () => {
        const input = 'search_term';
        expect(sanitize.createILIKEPattern(input, 'contains')).toBe('%search\\_term%');
        expect(sanitize.createILIKEPattern(input, 'startsWith')).toBe('search\\_term%');
        expect(sanitize.createILIKEPattern(input, 'endsWith')).toBe('%search\\_term');
        expect(sanitize.createILIKEPattern(input, 'exact')).toBe('search\\_term');
      });

      it('should validate search terms', () => {
        expect(sanitize.isValidSearchTerm('normal search')).toBe(true);
        expect(sanitize.isValidSearchTerm("'; DROP TABLE--")).toBe(false);
        expect(sanitize.isValidSearchTerm('%%%___%%%')).toBe(false);
      });
    });

    describe('Advanced SQL Protection', () => {
      it('should detect SQL injection attempts', () => {
        const inputs = [
          "'; DROP TABLE users;--",
          "1' OR '1'='1",
          "admin' --",
          "' UNION SELECT * FROM users",
          "'; WAITFOR DELAY '00:00:05'--",
        ];

        inputs.forEach(input => {
          const result = SqlProtection.scanForInjection(input);
          expect(result.isSafe).toBe(false);
          expect(result.threats.length).toBeGreaterThan(0);
          expect(['medium', 'high', 'critical']).toContain(result.risk);
        });
      });

      it('should allow safe input', () => {
        const safeInputs = [
          'John Doe',
          'example@email.com',
          '12345',
          'Regular search term',
        ];

        safeInputs.forEach(input => {
          const result = SqlProtection.scanForInjection(input);
          expect(result.isSafe).toBe(true);
          expect(result.threats.length).toBe(0);
          expect(result.risk).toBe('low');
        });
      });

      it('should categorize threat levels correctly', () => {
        const tests = [
          { input: "SELECT * FROM users", expectedRisk: 'high' },
          { input: "' OR 1=1--", expectedRisk: 'high' },
          { input: "WAITFOR DELAY '00:00:05'", expectedRisk: 'critical' },
          { input: "0x1234ABCD", expectedRisk: 'low' },
          { input: "-- comment", expectedRisk: 'medium' },
        ];

        tests.forEach(test => {
          const result = SqlProtection.scanForInjection(test.input);
          expect(result.risk).toBe(test.expectedRisk);
        });
      });

      it('should sanitize dangerous input', () => {
        const input = "normal text'; DROP TABLE users;-- more text";
        const result = SqlProtection.scanForInjection(input);
        expect(result.sanitized).not.toContain('DROP');
        expect(result.sanitized).not.toContain('TABLE');
        expect(result.sanitized).toContain('normal text');
        expect(result.sanitized).toContain('more text');
      });
    });
  });

  describe('Email Sanitization', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@company.co.uk',
        'test+tag@domain.org',
      ];

      validEmails.forEach(email => {
        expect(sanitize.email(email)).toBe(email.toLowerCase());
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
      ];

      invalidEmails.forEach(email => {
        expect(sanitize.email(email)).toBe('');
      });
    });

    it('should convert to lowercase', () => {
      expect(sanitize.email('User@EXAMPLE.COM')).toBe('user@example.com');
    });
  });

  describe('Phone Sanitization', () => {
    it('should accept valid phone numbers', () => {
      const validPhones = [
        '1234567890',      // 10 digits
        '12345678901',     // 11 digits
        '441234567890',    // 12 digits (UK international)
        '12345678901234',  // 14 digits (max international)
      ];

      validPhones.forEach(phone => {
        expect(sanitize.phone(phone)).toBe(phone);
      });
    });

    it('should remove non-numeric characters', () => {
      expect(sanitize.phone('+1 (234) 567-8900')).toBe('12345678900');
      expect(sanitize.phone('44-1234-567890')).toBe('441234567890');
    });

    it('should reject invalid phone numbers', () => {
      expect(sanitize.phone('123')).toBe(''); // Too short
      expect(sanitize.phone('123456789012345')).toBe(''); // Too long
      expect(sanitize.phone('abcdefghijk')).toBe(''); // No digits
    });
  });

  describe('URL Sanitization', () => {
    it('should accept valid URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://www.example.com/path',
        'https://subdomain.example.co.uk:8080/path?query=1',
      ];

      validUrls.forEach(url => {
        expect(sanitize.url(url)).toBe(url);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox',
        'file:///etc/passwd',
        'ftp://example.com', // Only http(s) allowed
      ];

      invalidUrls.forEach(url => {
        expect(sanitize.url(url)).toBe('');
      });
    });
  });

  describe('File Name Sanitization', () => {
    it('should remove path traversal attempts', () => {
      expect(sanitize.fileName('../../../etc/passwd')).toBe('etcpasswd');
      expect(sanitize.fileName('..\\windows\\system32')).toBe('windowssystem32');
    });

    it('should preserve file extensions', () => {
      expect(sanitize.fileName('document.pdf')).toBe('document.pdf');
      expect(sanitize.fileName('image.jpeg')).toBe('image.jpeg');
    });

    it('should limit length while preserving extension', () => {
      const longName = 'a'.repeat(100) + '.pdf';
      const result = sanitize.fileName(longName);
      expect(result).toContain('.pdf');
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should remove special characters', () => {
      expect(sanitize.fileName('file@#$%^&*.txt')).toBe('file.txt');
    });
  });

  describe('Content Sanitizers', () => {
    it('should sanitize job descriptions', () => {
      const input = '<script>alert("XSS")</script>Job description with HTML';
      const result = sanitize.jobDescription(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Job description');
    });

    it('should respect content-specific length limits', () => {
      const longText = 'a'.repeat(10000);
      expect(sanitize.jobDescription(longText).length).toBeLessThanOrEqual(5000);
      expect(sanitize.contractorBio(longText).length).toBeLessThanOrEqual(2000);
      expect(sanitize.message(longText).length).toBeLessThanOrEqual(1000);
      expect(sanitize.searchQuery(longText).length).toBeLessThanOrEqual(200);
    });

    it('should sanitize addresses', () => {
      const input = '123 Main St.<script>alert(1)</script>, London';
      const result = sanitize.address(input);
      expect(result).toBe('123 Main St., London');
    });

    it('should sanitize company names', () => {
      const input = 'ABC & Company Ltd.';
      const result = sanitize.companyName(input);
      expect(result).toBe('ABC & Company Ltd.');
    });

    it('should sanitize person names', () => {
      const input = "John O'Brien-Smith123";
      const result = sanitize.personName(input);
      expect(result).toBe("John O'Brien-Smith");
    });

    it('should sanitize tags', () => {
      expect(sanitize.tag('My Tag!')).toBe('my-tag');
      expect(sanitize.tag('Multiple   Spaces')).toBe('multiple-spaces');
      expect(sanitize.tag('--leading-trailing--')).toBe('leading-trailing');
    });
  });

  describe('Numeric Sanitization', () => {
    it('should validate numeric input', () => {
      expect(sanitize.numeric('123')).toBe(123);
      expect(sanitize.numeric('123.45')).toBe(123.45);
      expect(sanitize.numeric('not-a-number')).toBe(null);
      expect(sanitize.numeric(null)).toBe(null);
    });

    it('should apply constraints', () => {
      const options = { min: 0, max: 100, decimals: 2 };
      expect(sanitize.numeric(-10, options)).toBe(0);
      expect(sanitize.numeric(200, options)).toBe(100);
      expect(sanitize.numeric(12.3456, options)).toBe(12.35);
    });
  });

  describe('Rate Limiting', () => {
    let rateLimiter: SanitizationRateLimiter;

    beforeEach(() => {
      rateLimiter = new SanitizationRateLimiter({
        maxAttempts: 3,
        windowMs: 1000,
      });
    });

    afterEach(() => {
      rateLimiter.destroy();
    });

    it('should allow requests within limit', () => {
      const key = 'test-user';
      expect(rateLimiter.trackAttempt(key)).toBe(true);
      expect(rateLimiter.trackAttempt(key)).toBe(true);
      expect(rateLimiter.trackAttempt(key)).toBe(true);
    });

    it('should block requests exceeding limit', () => {
      const key = 'test-user';
      rateLimiter.trackAttempt(key);
      rateLimiter.trackAttempt(key);
      rateLimiter.trackAttempt(key);
      expect(rateLimiter.trackAttempt(key)).toBe(false);
    });

    it('should reset after window expires', async () => {
      const key = 'test-user';
      rateLimiter.trackAttempt(key);
      rateLimiter.trackAttempt(key);
      rateLimiter.trackAttempt(key);
      expect(rateLimiter.trackAttempt(key)).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(rateLimiter.trackAttempt(key)).toBe(true);
    });

    it('should track different keys separately', () => {
      expect(rateLimiter.trackAttempt('user1')).toBe(true);
      expect(rateLimiter.trackAttempt('user2')).toBe(true);

      rateLimiter.trackAttempt('user1');
      rateLimiter.trackAttempt('user1');
      expect(rateLimiter.trackAttempt('user1')).toBe(false);
      expect(rateLimiter.trackAttempt('user2')).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should sanitize multiple fields at once', () => {
      const input = {
        name: '<script>John</script>',
        email: 'USER@EXAMPLE.COM',
        phone: '+1 (234) 567-8900',
        website: 'https://example.com',
        age: '25',
      };

      const result = utils.sanitizeFields(input, {
        name: 'text',
        email: 'email',
        phone: 'phone',
        website: 'url',
        age: 'number',
      });

      expect(result.name).toBe('John');
      expect(result.email).toBe('user@example.com');
      expect(result.phone).toBe('12345678900');
      expect(result.website).toBe('https://example.com');
      expect(result.age).toBe(25);
    });

    it('should detect platform correctly', () => {
      const platform = utils.getPlatform();
      expect(['web', 'server', 'mobile']).toContain(platform);
    });
  });

  describe('XSS Protection Edge Cases', () => {
    const xssVectors = [
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<body onload=alert(1)>',
      '<iframe src=javascript:alert(1)>',
      '<script>alert(1)</script>',
      '<script>alert(String.fromCharCode(88,83,83))</script>',
      '<img src="x" onerror="alert(1)">',
      '<img src=`x` onerror=`alert(1)`>',
      '<<SCRIPT>alert("XSS");//<</SCRIPT>',
      '<IMG """><SCRIPT>alert("XSS")</SCRIPT>">',
      '<IMG SRC=javascript:alert("XSS")>',
      '<IMG SRC=JaVaScRiPt:alert("XSS")>',
      '<IMG SRC=`javascript:alert("RSnake says, \'XSS\'")`>',
    ];

    xssVectors.forEach(vector => {
      it(`should sanitize XSS vector: ${vector.substring(0, 30)}...`, () => {
        const result = sanitize.text(vector);
        expect(result).not.toContain('<script');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
        expect(result).not.toContain('alert');
      });
    });
  });

  describe('SQL Injection Edge Cases', () => {
    const sqlVectors = [
      "admin'--",
      "admin' #",
      "admin'/*",
      "' or 1=1--",
      "' or 1=1#",
      "' or 1=1/*",
      "') or '1'='1--",
      "') or ('1'='1--",
      "' or '1'='1",
      "'; exec xp_cmdshell('dir')--",
      "'; WAITFOR DELAY '00:00:05'--",
      "1; DROP TABLE users--",
      "1' UNION SELECT NULL--",
      "1' UNION SELECT NULL, NULL--",
      "' AND 1=0 UNION ALL SELECT 'admin', '81dc9bdb52d04dc20036dbd8313ed055",
    ];

    sqlVectors.forEach(vector => {
      it(`should detect SQL injection: ${vector.substring(0, 30)}...`, () => {
        const result = SqlProtection.scanForInjection(vector);
        expect(result.isSafe).toBe(false);
        expect(result.threats.length).toBeGreaterThan(0);
      });
    });
  });
});