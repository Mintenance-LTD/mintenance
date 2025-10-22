/**
 * Tests for formatting utilities
 */

import { formatDate, formatCurrency, formatPhone } from '../formatters';

describe('formatters', () => {
  describe('formatDate', () => {
    it('should format Date object with default options', () => {
      const date = new Date('2025-01-15T14:30:00');
      const formatted = formatDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('should format string date with default options', () => {
      const dateStr = '2025-01-15T14:30:00';
      const formatted = formatDate(dateStr);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('should accept custom formatting options', () => {
      const date = new Date('2025-01-15T14:30:00');
      const formatted = formatDate(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('should override default options with custom options', () => {
      const date = new Date('2025-01-15T14:30:00');
      const formatted = formatDate(date, {
        month: 'long',
      });
      expect(formatted).toContain('January');
    });

    it('should handle different date formats', () => {
      const date1 = formatDate('2025-12-31T23:59:59');
      const date2 = formatDate(new Date('2025-12-31T23:59:59'));
      // Both should format to similar output
      expect(date1).toContain('Dec');
      expect(date2).toContain('Dec');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD by default', () => {
      const formatted = formatCurrency(1234.56);
      expect(formatted).toBe('$1,234.56');
    });

    it('should format different currencies', () => {
      const usd = formatCurrency(1000, 'USD');
      const eur = formatCurrency(1000, 'EUR');
      const gbp = formatCurrency(1000, 'GBP');

      expect(usd).toBe('$1,000.00');
      expect(eur).toBe('€1,000.00');
      expect(gbp).toBe('£1,000.00');
    });

    it('should handle zero amounts', () => {
      const formatted = formatCurrency(0);
      expect(formatted).toBe('$0.00');
    });

    it('should handle negative amounts', () => {
      const formatted = formatCurrency(-500.75);
      expect(formatted).toBe('-$500.75');
    });

    it('should handle large amounts with thousands separators', () => {
      const formatted = formatCurrency(1234567.89);
      expect(formatted).toBe('$1,234,567.89');
    });

    it('should round to two decimal places', () => {
      const formatted = formatCurrency(10.999);
      expect(formatted).toBe('$11.00');
    });

    it('should handle very small amounts', () => {
      const formatted = formatCurrency(0.01);
      expect(formatted).toBe('$0.01');
    });
  });

  describe('formatPhone', () => {
    it('should format 10-digit US phone number', () => {
      const formatted = formatPhone('1234567890');
      expect(formatted).toBe('(123) 456-7890');
    });

    it('should format phone number with country code', () => {
      const formatted = formatPhone('11234567890');
      expect(formatted).toBe('+1 (123) 456-7890');
    });

    it('should handle phone numbers with special characters', () => {
      const formatted = formatPhone('(123) 456-7890');
      expect(formatted).toBe('(123) 456-7890');
    });

    it('should handle phone numbers with dots', () => {
      const formatted = formatPhone('123.456.7890');
      expect(formatted).toBe('(123) 456-7890');
    });

    it('should handle phone numbers with spaces', () => {
      const formatted = formatPhone('123 456 7890');
      expect(formatted).toBe('(123) 456-7890');
    });

    it('should handle phone numbers with dashes', () => {
      const formatted = formatPhone('123-456-7890');
      expect(formatted).toBe('(123) 456-7890');
    });

    it('should return original for non-US formats', () => {
      const phone = '12345';
      const formatted = formatPhone(phone);
      expect(formatted).toBe(phone);
    });

    it('should return original for international formats', () => {
      const phone = '+44 20 7123 4567';
      const formatted = formatPhone(phone);
      expect(formatted).toBe(phone);
    });

    it('should handle empty string', () => {
      const formatted = formatPhone('');
      expect(formatted).toBe('');
    });

    it('should handle mixed format with +1', () => {
      const formatted = formatPhone('+1-123-456-7890');
      expect(formatted).toBe('+1 (123) 456-7890');
    });

    it('should strip all non-numeric characters before formatting', () => {
      const formatted = formatPhone('abc123def456ghi7890');
      expect(formatted).toBe('(123) 456-7890');
    });
  });
});
