import * as validation from '../../../utils/validation';

describe('Validation Utilities - Comprehensive', () => {
  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      expect(validation.isValidEmail('user@example.com')).toBe(true);
      expect(validation.isValidEmail('user.name@example.co.uk')).toBe(true);
      expect(validation.isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validation.isValidEmail('invalid')).toBe(false);
      expect(validation.isValidEmail('user@')).toBe(false);
      expect(validation.isValidEmail('@example.com')).toBe(false);
      expect(validation.isValidEmail('user@.com')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validation.isValidEmail(null)).toBe(false);
      expect(validation.isValidEmail(undefined)).toBe(false);
      expect(validation.isValidEmail('')).toBe(false);
      expect(validation.isValidEmail(' ')).toBe(false);
    });
  });

  describe('Phone Validation', () => {
    it('should validate US phone numbers', () => {
      expect(validation.isValidPhone('+12125551234')).toBe(true);
      expect(validation.isValidPhone('2125551234')).toBe(true);
      expect(validation.isValidPhone('(212) 555-1234')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validation.isValidPhone('123')).toBe(false);
      expect(validation.isValidPhone('abcdefghij')).toBe(false);
    });
  });

  describe('Password Strength', () => {
    it('should validate strong passwords', () => {
      expect(validation.isStrongPassword('SecurePass123!')).toBe(true);
      expect(validation.isStrongPassword('MyP@ssw0rd2024')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validation.isStrongPassword('password')).toBe(false);
      expect(validation.isStrongPassword('12345678')).toBe(false);
      expect(validation.isStrongPassword('Password')).toBe(false);
    });

    it('should check password requirements', () => {
      const result = validation.checkPasswordRequirements('Pass123!');
      expect(result.length).toBe(true);
      expect(result.uppercase).toBe(true);
      expect(result.lowercase).toBe(true);
      expect(result.number).toBe(true);
      expect(result.special).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML input', () => {
      expect(validation.sanitizeInput('<script>alert("xss")</script>')).toBe('');
      expect(validation.sanitizeInput('Hello <b>World</b>')).toBe('Hello World');
    });

    it('should trim whitespace', () => {
      expect(validation.sanitizeInput('  hello  ')).toBe('hello');
      expect(validation.sanitizeInput('\n\ttext\n')).toBe('text');
    });
  });

  describe('Date Validation', () => {
    it('should validate date formats', () => {
      expect(validation.isValidDate('2024-01-01')).toBe(true);
      expect(validation.isValidDate('01/01/2024')).toBe(true);
      expect(validation.isValidDate('invalid')).toBe(false);
    });

    it('should check if date is in future', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(validation.isFutureDate(tomorrow)).toBe(true);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(validation.isFutureDate(yesterday)).toBe(false);
    });
  });

  describe('Credit Card Validation', () => {
    it('should validate credit card numbers', () => {
      expect(validation.isValidCreditCard('4242424242424242')).toBe(true); // Visa
      expect(validation.isValidCreditCard('5555555555554444')).toBe(true); // Mastercard
      expect(validation.isValidCreditCard('378282246310005')).toBe(true); // Amex
    });

    it('should detect card type', () => {
      expect(validation.getCardType('4242424242424242')).toBe('visa');
      expect(validation.getCardType('5555555555554444')).toBe('mastercard');
      expect(validation.getCardType('378282246310005')).toBe('amex');
    });

    it('should validate CVV', () => {
      expect(validation.isValidCVV('123', 'visa')).toBe(true);
      expect(validation.isValidCVV('1234', 'amex')).toBe(true);
      expect(validation.isValidCVV('12', 'visa')).toBe(false);
    });
  });

  describe('ZIP Code Validation', () => {
    it('should validate US ZIP codes', () => {
      expect(validation.isValidZIP('12345')).toBe(true);
      expect(validation.isValidZIP('12345-6789')).toBe(true);
      expect(validation.isValidZIP('1234')).toBe(false);
    });
  });

  describe('URL Validation', () => {
    it('should validate URLs', () => {
      expect(validation.isValidURL('https://example.com')).toBe(true);
      expect(validation.isValidURL('http://sub.example.com/path')).toBe(true);
      expect(validation.isValidURL('not-a-url')).toBe(false);
    });
  });
});