/**
 * Tests for helper functions
 */

import {
  generateId,
  sanitizeString,
  isEmpty,
  capitalize,
  toTitleCase,
  truncate,
  getInitials,
} from '../helpers';

describe('helpers', () => {
  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate ID with prefix', () => {
      const id = generateId('user');
      expect(id).toMatch(/^user_/);
    });

    it('should generate ID without prefix', () => {
      const id = generateId();
      expect(id).not.toContain('_');
    });

    it('should generate alphanumeric ID', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate different IDs on consecutive calls', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('should handle custom prefixes correctly', () => {
      const id1 = generateId('order');
      const id2 = generateId('invoice');
      expect(id1).toMatch(/^order_/);
      expect(id2).toMatch(/^invoice_/);
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const sanitized = sanitizeString('<script>alert("xss")</script>');
      expect(sanitized).toBe('scriptalert("xss")/script');
    });

    it('should remove single quotes', () => {
      const sanitized = sanitizeString("It's a test");
      expect(sanitized).toBe('Its a test');
    });

    it('should remove double quotes', () => {
      const sanitized = sanitizeString('He said "hello"');
      expect(sanitized).toBe('He said hello');
    });

    it('should trim whitespace', () => {
      const sanitized = sanitizeString('  hello world  ');
      expect(sanitized).toBe('hello world');
    });

    it('should handle empty string', () => {
      const sanitized = sanitizeString('');
      expect(sanitized).toBe('');
    });

    it('should remove multiple special characters', () => {
      const sanitized = sanitizeString('<div>"It\'s" a <test></div>');
      expect(sanitized).toBe('divIts a test/div');
    });

    it('should preserve safe characters', () => {
      const sanitized = sanitizeString('Hello, World! 123');
      expect(sanitized).toBe('Hello, World! 123');
    });
  });

  describe('isEmpty', () => {
    it('should return true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('should return true for whitespace only', () => {
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty('\t\n')).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(isEmpty('hello')).toBe(false);
    });

    it('should return false for string with content and whitespace', () => {
      expect(isEmpty('  hello  ')).toBe(false);
    });

    it('should return false for single character', () => {
      expect(isEmpty('a')).toBe(false);
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should lowercase remaining letters', () => {
      expect(capitalize('HELLO')).toBe('Hello');
    });

    it('should handle mixed case', () => {
      expect(capitalize('hELLo')).toBe('Hello');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('should handle already capitalized', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle string starting with number', () => {
      expect(capitalize('1hello')).toBe('1hello');
    });
  });

  describe('toTitleCase', () => {
    it('should convert to title case', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
    });

    it('should handle all lowercase', () => {
      expect(toTitleCase('the quick brown fox')).toBe('The Quick Brown Fox');
    });

    it('should handle all uppercase', () => {
      expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
    });

    it('should handle mixed case', () => {
      expect(toTitleCase('hElLo WoRlD')).toBe('Hello World');
    });

    it('should handle single word', () => {
      expect(toTitleCase('hello')).toBe('Hello');
    });

    it('should handle multiple spaces', () => {
      expect(toTitleCase('hello  world')).toBe('Hello  World');
    });

    it('should handle empty string', () => {
      expect(toTitleCase('')).toBe('');
    });
  });

  describe('truncate', () => {
    it('should truncate long string', () => {
      const result = truncate('Hello World', 8);
      expect(result).toBe('Hello...');
    });

    it('should not truncate short string', () => {
      const result = truncate('Hello', 10);
      expect(result).toBe('Hello');
    });

    it('should handle exact length', () => {
      const result = truncate('Hello', 5);
      expect(result).toBe('Hello');
    });

    it('should use custom suffix', () => {
      const result = truncate('Hello World', 8, '…');
      expect(result).toBe('Hello W…');
    });

    it('should account for suffix length', () => {
      const result = truncate('Hello World', 8, '...');
      expect(result.length).toBe(8);
    });

    it('should handle empty string', () => {
      const result = truncate('', 10);
      expect(result).toBe('');
    });

    it('should handle very short max length', () => {
      const result = truncate('Hello World', 3);
      expect(result).toBe('');
    });

    it('should handle long suffix', () => {
      const result = truncate('Hello World', 10, ' [more]');
      expect(result).toBe('Hel [more]');
    });
  });

  describe('getInitials', () => {
    it('should get initials from first and last name', () => {
      expect(getInitials('John', 'Doe')).toBe('JD');
    });

    it('should capitalize initials', () => {
      expect(getInitials('john', 'doe')).toBe('JD');
    });

    it('should handle uppercase names', () => {
      expect(getInitials('JOHN', 'DOE')).toBe('JD');
    });

    it('should handle mixed case names', () => {
      expect(getInitials('JoHn', 'DoE')).toBe('JD');
    });

    it('should handle single character names', () => {
      expect(getInitials('J', 'D')).toBe('JD');
    });

    it('should handle long names', () => {
      expect(getInitials('Jonathan', 'Doe-Smith')).toBe('JD');
    });

    it('should handle names with spaces', () => {
      expect(getInitials('Mary Jane', 'Watson')).toBe('MW');
    });
  });
});
