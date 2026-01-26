import {
  sanitizeText,
  sanitizeJobDescription,
  sanitizeContractorBio,
  sanitizeMessage,
  sanitizeSearchQuery,
  sanitizeEmail,
  sanitizePhone,
  sanitizeFileName,
  sanitizeUrl,
  sanitizeNumeric,
  sanitizeAmount,
  sanitizeRating,
  sanitizeObject
} from '../../utils/sanitizer';

describe('Sanitizer Utility', () => {
  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const input = '<p>Hello <b>World</b></p>';
      expect(sanitizeText(input)).toBe('Hello World');
    });

    it('should replace HTML entities with spaces', () => {
      const input = 'Hello&nbsp;World&amp;Test';
      expect(sanitizeText(input)).toBe('Hello World Test');
    });

    it('should normalize whitespace', () => {
      const input = '  Hello    World   ';
      expect(sanitizeText(input)).toBe('Hello World');
    });

    it('should handle empty and invalid inputs', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
      expect(sanitizeText(123 as any)).toBe('');
    });

    it('should respect maxLength parameter', () => {
      const input = 'This is a very long text that should be truncated';
      expect(sanitizeText(input, 10)).toBe('This is a ');
    });

    it('should use default maxLength of 5000', () => {
      const longText = 'a'.repeat(6000);
      expect(sanitizeText(longText)).toHaveLength(5000);
    });

    it('should handle complex HTML with nested tags', () => {
      const input = '<div><p>Hello <span style="color:red">World</span></p></div>';
      expect(sanitizeText(input)).toBe('Hello World');
    });

    it('should handle script tags safely', () => {
      const input = '<script>alert("XSS")</script>Hello';
      // The regex removes tags but content between tags remains
      expect(sanitizeText(input)).toBe('alert("XSS")Hello');
    });
  });

  describe('sanitizeJobDescription', () => {
    it('should sanitize text with 5000 char limit', () => {
      const input = '<p>Job description with <b>HTML</b></p>';
      expect(sanitizeJobDescription(input)).toBe('Job description with HTML');
    });

    it('should enforce 5000 character limit', () => {
      const longText = 'a'.repeat(6000);
      expect(sanitizeJobDescription(longText)).toHaveLength(5000);
    });
  });

  describe('sanitizeContractorBio', () => {
    it('should sanitize text with 2000 char limit', () => {
      const input = '<p>Contractor bio with <b>HTML</b></p>';
      expect(sanitizeContractorBio(input)).toBe('Contractor bio with HTML');
    });

    it('should enforce 2000 character limit', () => {
      const longText = 'a'.repeat(3000);
      expect(sanitizeContractorBio(longText)).toHaveLength(2000);
    });
  });

  describe('sanitizeMessage', () => {
    it('should sanitize text with 1000 char limit', () => {
      const input = '<p>Message with <b>HTML</b></p>';
      expect(sanitizeMessage(input)).toBe('Message with HTML');
    });

    it('should enforce 1000 character limit', () => {
      const longText = 'a'.repeat(1500);
      expect(sanitizeMessage(longText)).toHaveLength(1000);
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should sanitize text with 200 char limit', () => {
      const input = '<script>alert()</script>search query';
      // The regex removes tags but content between tags remains
      expect(sanitizeSearchQuery(input)).toBe('alert()search query');
    });

    it('should enforce 200 character limit', () => {
      const longText = 'a'.repeat(300);
      expect(sanitizeSearchQuery(longText)).toHaveLength(200);
    });
  });

  describe('sanitizeEmail', () => {
    it('should sanitize valid emails', () => {
      expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
      expect(sanitizeEmail('  user@domain.org  ')).toBe('user@domain.org');
      expect(sanitizeEmail('name.surname@company.co.uk')).toBe('name.surname@company.co.uk');
    });

    it('should throw error for invalid email formats', () => {
      expect(() => sanitizeEmail('invalid')).toThrow('Invalid email format');
      expect(() => sanitizeEmail('missing@domain')).toThrow('Invalid email format');
      expect(() => sanitizeEmail('@example.com')).toThrow('Invalid email format');
      expect(() => sanitizeEmail('user@')).toThrow('Invalid email format');
      expect(() => sanitizeEmail('user name@example.com')).toThrow('Invalid email format');
    });

    it('should handle empty and invalid inputs', () => {
      expect(sanitizeEmail('')).toBe('');
      expect(sanitizeEmail(null as any)).toBe('');
      expect(sanitizeEmail(undefined as any)).toBe('');
      expect(sanitizeEmail(123 as any)).toBe('');
    });
  });

  describe('sanitizePhone', () => {
    it('should extract digits from phone numbers', () => {
      expect(sanitizePhone('(123) 456-7890')).toBe('1234567890');
      expect(sanitizePhone('+1-234-567-8900')).toBe('12345678900');
      expect(sanitizePhone('123.456.7890')).toBe('1234567890');
    });

    it('should validate phone number length (10-11 digits)', () => {
      expect(() => sanitizePhone('123456789')).toThrow('Invalid phone number format'); // 9 digits
      expect(() => sanitizePhone('123456789012')).toThrow('Invalid phone number format'); // 12 digits
      expect(sanitizePhone('1234567890')).toBe('1234567890'); // 10 digits - valid
      expect(sanitizePhone('12345678901')).toBe('12345678901'); // 11 digits - valid
    });

    it('should handle empty and invalid inputs', () => {
      expect(sanitizePhone('')).toBe('');
      expect(sanitizePhone(null as any)).toBe('');
      expect(sanitizePhone(undefined as any)).toBe('');
      expect(sanitizePhone(123 as any)).toBe('');
    });

    it('should handle phone numbers with letters', () => {
      expect(() => sanitizePhone('abc-def-ghij')).toThrow('Invalid phone number format');
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize file names', () => {
      expect(sanitizeFileName('My File Name.txt')).toBe('my_file_name.txt');
      expect(sanitizeFileName('file@#$%name.pdf')).toBe('file_name.pdf');
      expect(sanitizeFileName('UPPERCASE.DOC')).toBe('uppercase.doc');
    });

    it('should replace multiple underscores with single', () => {
      expect(sanitizeFileName('file___name.txt')).toBe('file_name.txt');
    });

    it('should limit file name length to 100 characters', () => {
      const longName = 'a'.repeat(150) + '.txt';
      const result = sanitizeFileName(longName);
      expect(result).toHaveLength(100);
      expect(result.startsWith('aaa')).toBe(true);
    });

    it('should handle empty and invalid inputs', () => {
      expect(sanitizeFileName('')).toBe('unnamed');
      expect(sanitizeFileName(null as any)).toBe('unnamed');
      expect(sanitizeFileName(undefined as any)).toBe('unnamed');
      expect(sanitizeFileName(123 as any)).toBe('unnamed');
    });

    it('should preserve dots and hyphens', () => {
      expect(sanitizeFileName('file-name.test.js')).toBe('file-name.test.js');
    });
  });

  describe('sanitizeUrl', () => {
    it('should sanitize valid URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
      expect(sanitizeUrl('https://example.com/path?query=value')).toBe('https://example.com/path?query=value');
      expect(sanitizeUrl('https://subdomain.example.org:8080/path')).toBe('https://subdomain.example.org:8080/path');
    });

    it('should reject invalid protocols', () => {
      // These throw "Invalid URL format" since the URL constructor fails for these
      expect(() => sanitizeUrl('ftp://example.com')).toThrow('Invalid URL format');
      expect(() => sanitizeUrl('javascript:alert(1)')).toThrow('Invalid URL format');
      expect(() => sanitizeUrl('file:///etc/passwd')).toThrow('Invalid URL format');
    });

    it('should reject invalid URL formats', () => {
      expect(() => sanitizeUrl('not a url')).toThrow('Invalid URL format');
      expect(() => sanitizeUrl('http://')).toThrow('Invalid URL format');
      expect(() => sanitizeUrl('//example.com')).toThrow('Invalid URL format');
    });

    it('should handle empty and invalid inputs', () => {
      expect(sanitizeUrl('')).toBe('');
      expect(sanitizeUrl(null as any)).toBe('');
      expect(sanitizeUrl(undefined as any)).toBe('');
      expect(sanitizeUrl(123 as any)).toBe('');
    });
  });

  describe('sanitizeNumeric', () => {
    it('should parse and validate numeric values', () => {
      expect(sanitizeNumeric('123.45')).toBe(123.45);
      expect(sanitizeNumeric(456.78)).toBe(456.78);
      expect(sanitizeNumeric('-10')).toBe(-10);
    });

    it('should apply min constraint', () => {
      expect(sanitizeNumeric(-5, { min: 0 })).toBe(0);
      expect(sanitizeNumeric(10, { min: 20 })).toBe(20);
      expect(sanitizeNumeric(30, { min: 20 })).toBe(30);
    });

    it('should apply max constraint', () => {
      expect(sanitizeNumeric(150, { max: 100 })).toBe(100);
      expect(sanitizeNumeric(50, { max: 100 })).toBe(50);
      expect(sanitizeNumeric(-10, { max: 0 })).toBe(-10);
    });

    it('should apply both min and max constraints', () => {
      expect(sanitizeNumeric(-5, { min: 0, max: 10 })).toBe(0);
      expect(sanitizeNumeric(15, { min: 0, max: 10 })).toBe(10);
      expect(sanitizeNumeric(5, { min: 0, max: 10 })).toBe(5);
    });

    it('should round to specified decimal places', () => {
      expect(sanitizeNumeric(123.456789, { decimals: 2 })).toBe(123.46);
      expect(sanitizeNumeric(10.999, { decimals: 0 })).toBe(11);
      expect(sanitizeNumeric(5.5555, { decimals: 3 })).toBe(5.556);
    });

    it('should throw error for invalid numeric values', () => {
      expect(() => sanitizeNumeric('not a number')).toThrow('Invalid numeric value');
      expect(() => sanitizeNumeric(NaN)).toThrow('Invalid numeric value');
      expect(() => sanitizeNumeric('abc123')).toThrow('Invalid numeric value');
    });

    it('should handle string numbers with spaces', () => {
      expect(sanitizeNumeric(' 123.45 ')).toBe(123.45);
    });
  });

  describe('sanitizeAmount', () => {
    it('should sanitize monetary amounts', () => {
      expect(sanitizeAmount('123.456')).toBe(123.46);
      expect(sanitizeAmount(999.999)).toBe(1000.00);
      expect(sanitizeAmount('0.01')).toBe(0.01);
    });

    it('should enforce minimum of 0', () => {
      expect(sanitizeAmount(-100)).toBe(0);
      expect(sanitizeAmount('-50.55')).toBe(0);
    });

    it('should enforce maximum of 1000000', () => {
      expect(sanitizeAmount(2000000)).toBe(1000000);
      expect(sanitizeAmount('1500000.99')).toBe(1000000);
    });

    it('should round to 2 decimal places', () => {
      expect(sanitizeAmount(99.999)).toBe(100.00);
      expect(sanitizeAmount('123.456')).toBe(123.46);
      expect(sanitizeAmount(0.001)).toBe(0.00);
    });
  });

  describe('sanitizeRating', () => {
    it('should sanitize rating values', () => {
      expect(sanitizeRating('3.5')).toBe(3.5);
      expect(sanitizeRating(4.75)).toBe(4.8);
      expect(sanitizeRating('1')).toBe(1.0);
    });

    it('should enforce minimum of 1', () => {
      expect(sanitizeRating(0)).toBe(1);
      expect(sanitizeRating('-2.5')).toBe(1);
      expect(sanitizeRating(0.5)).toBe(1);
    });

    it('should enforce maximum of 5', () => {
      expect(sanitizeRating(10)).toBe(5);
      expect(sanitizeRating('6.5')).toBe(5);
      expect(sanitizeRating(5.1)).toBe(5);
    });

    it('should round to 1 decimal place', () => {
      expect(sanitizeRating(3.14159)).toBe(3.1);
      expect(sanitizeRating('4.56')).toBe(4.6);
      expect(sanitizeRating(2.25)).toBe(2.3);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string fields by default', () => {
      const obj = {
        name: '<b>John</b>',
        description: '<script>alert()</script>Test',
        count: 123,
        active: true
      };

      const result = sanitizeObject(obj);
      expect(result.name).toBe('John');
      expect(result.description).toBe('alert()Test'); // Script tags removed but content remains
      expect(result.count).toBe(123); // Numbers unchanged
      expect(result.active).toBe(true); // Booleans unchanged
    });

    it('should apply custom field sanitizers', () => {
      const obj = {
        email: 'USER@EXAMPLE.COM',
        phone: '(123) 456-7890',
        amount: '123.456',
        name: '<b>John</b>'
      };

      const result = sanitizeObject(obj, {
        email: (v) => sanitizeEmail(v as string),
        phone: (v) => sanitizePhone(v as string),
        amount: (v) => sanitizeAmount(v as string)
      });

      expect(result.email).toBe('user@example.com');
      expect(result.phone).toBe('1234567890');
      expect(result.amount).toBe(123.46);
      expect(result.name).toBe('John'); // Default sanitization applied
    });

    it('should preserve non-string fields when no custom sanitizer provided', () => {
      const obj = {
        id: 123,
        active: true,
        data: { nested: 'value' },
        items: [1, 2, 3],
        nullable: null,
        undef: undefined
      };

      const result = sanitizeObject(obj);
      expect(result.id).toBe(123);
      expect(result.active).toBe(true);
      expect(result.data).toEqual({ nested: 'value' });
      expect(result.items).toEqual([1, 2, 3]);
      expect(result.nullable).toBe(null);
      expect(result.undef).toBe(undefined);
    });

    it('should not mutate original object', () => {
      const obj = { name: '<b>Test</b>' };
      const result = sanitizeObject(obj);

      expect(obj.name).toBe('<b>Test</b>'); // Original unchanged
      expect(result.name).toBe('Test'); // Result sanitized
    });

    it('should handle empty objects', () => {
      expect(sanitizeObject({})).toEqual({});
    });

    it('should handle objects with mixed field types', () => {
      const obj = {
        string1: '<p>HTML</p>',
        string2: '  spaced  ',
        number: 42,
        boolean: false,
        array: ['a', 'b'],
        nested: { key: 'value' }
      };

      const result = sanitizeObject(obj);
      expect(result.string1).toBe('HTML');
      expect(result.string2).toBe('spaced');
      expect(result.number).toBe(42);
      expect(result.boolean).toBe(false);
      expect(result.array).toEqual(['a', 'b']);
      expect(result.nested).toEqual({ key: 'value' });
    });
  });
});