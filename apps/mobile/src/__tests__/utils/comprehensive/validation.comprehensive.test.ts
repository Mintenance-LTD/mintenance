import * as validation from '../../../utils/validation';

// NOTE (test realignment 2026-06-02): the original "comprehensive" suite asserted
// a speculative API (isValidEmail/isValidPhone/getCardType/isValidZIP/isValidURL/
// isStrongPassword/sanitizeInput) that never existed in src/utils/validation.ts.
// The real module exports ValidationResult-returning validators plus sanitizers.
// Rewritten to exercise the CURRENT source contract. No source changes made.

describe('Validation Utilities - Comprehensive', () => {
  describe('Email Validation (validateEmail -> ValidationResult)', () => {
    it('should validate correct email formats', () => {
      expect(validation.validateEmail('user@example.com').isValid).toBe(true);
      expect(validation.validateEmail('user.name@example.co.uk').isValid).toBe(
        true
      );
      expect(validation.validateEmail('user+tag@example.com').isValid).toBe(
        true
      );
    });

    it('should reject invalid email formats', () => {
      expect(validation.validateEmail('invalid').isValid).toBe(false);
      expect(validation.validateEmail('user@').isValid).toBe(false);
      expect(validation.validateEmail('@example.com').isValid).toBe(false);
    });

    it('should surface an error message on failure', () => {
      const result = validation.validateEmail('nope');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
  });

  describe('Phone Validation (validatePhone -> ValidationResult)', () => {
    it('should validate phone numbers with 10-15 digits', () => {
      expect(validation.validatePhone('+12125551234').isValid).toBe(true);
      expect(validation.validatePhone('2125551234').isValid).toBe(true);
      expect(validation.validatePhone('(212) 555-1234').isValid).toBe(true);
    });

    it('should reject phone numbers outside 10-15 digits', () => {
      expect(validation.validatePhone('123').isValid).toBe(false);
      expect(validation.validatePhone('abcdefghij').isValid).toBe(false);
      const result = validation.validatePhone('123');
      expect(result.errors).toContain('Phone number must be 10-15 digits');
    });
  });

  describe('Required Field Validation', () => {
    it('should pass when all required fields are present', () => {
      const result = validation.validateRequired(
        { name: 'A', email: 'a@b.com' },
        ['name', 'email']
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail and list each missing field', () => {
      const result = validation.validateRequired(
        { name: '', email: undefined },
        ['name', 'email']
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('name is required');
      expect(result.errors).toContain('email is required');
    });
  });

  describe('String Length Validation', () => {
    it('should enforce minimum length', () => {
      const result = validation.validateStringLength('ab', 'title', 5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('title must be at least 5 characters');
    });

    it('should enforce maximum length', () => {
      const result = validation.validateStringLength('abcdef', 'code', 1, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('code must not exceed 3 characters');
    });

    it('should pass within bounds', () => {
      expect(
        validation.validateStringLength('hello', 'word', 1, 10).isValid
      ).toBe(true);
    });
  });

  describe('Numeric Validation', () => {
    it('should validate positive numbers', () => {
      expect(validation.validatePositiveNumber(10, 'budget').isValid).toBe(
        true
      );
      expect(validation.validatePositiveNumber(0, 'budget').isValid).toBe(
        false
      );
      expect(validation.validatePositiveNumber(-5, 'budget').isValid).toBe(
        false
      );
    });

    it('should validate ratings 1-5', () => {
      expect(validation.validateRating(1).isValid).toBe(true);
      expect(validation.validateRating(5).isValid).toBe(true);
      expect(validation.validateRating(0).isValid).toBe(false);
      expect(validation.validateRating(6).isValid).toBe(false);
      expect(validation.validateRating(3.5).isValid).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    it('should strip angle brackets via sanitizeString', () => {
      expect(validation.sanitizeString('<script>alert("xss")</script>')).toBe(
        'scriptalert("xss")/script'
      );
      expect(validation.sanitizeString('Hello <b>World</b>')).toBe(
        'Hello bWorld/b'
      );
    });

    it('should trim whitespace via sanitizeString', () => {
      expect(validation.sanitizeString('  hello  ')).toBe('hello');
      expect(validation.sanitizeString('\n\ttext\n')).toBe('text');
    });

    it('should escape HTML entities via sanitizeHtml', () => {
      expect(validation.sanitizeHtml('<b>')).toBe('&lt;b&gt;');
      expect(validation.sanitizeHtml('"a"')).toBe('&quot;a&quot;');
    });

    it('should coerce numeric input via sanitizeNumber', () => {
      expect(validation.sanitizeNumber('42')).toBe(42);
      expect(validation.sanitizeNumber('abc')).toBeNull();
    });
  });

  describe('Entity Validation Schemas', () => {
    it('should validate a well-formed user', () => {
      const result = validation.validateUser({
        id: '1',
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'homeowner',
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject a user with an invalid role', () => {
      const result = validation.validateUser({
        id: '1',
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'admin' as never,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Role must be either "homeowner" or "contractor"'
      );
    });

    it('should reject a job with too many photos', () => {
      const result = validation.validateJob({
        id: '1',
        title: 'Fix the leaking kitchen tap',
        description: 'The kitchen tap has been leaking for a week now.',
        location: 'London',
        homeownerId: 'h1',
        budget: 100,
        photos: new Array(11).fill('photo.jpg'),
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum 10 photos allowed per job');
    });

    it('should validate a bid amount is positive', () => {
      const result = validation.validateBid({
        id: 'b1',
        jobId: 'j1',
        contractorId: 'c1',
        amount: -10,
        description: 'I can do this job for you quickly.',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount must be a positive number');
    });
  });

  describe('Form Validation Helpers', () => {
    it('should enforce password complexity on registration', () => {
      const weak = validation.validateRegistrationForm({
        email: 'user@example.com',
        password: 'lowercaseonly',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'homeowner',
      });
      expect(weak.isValid).toBe(false);
      expect(
        weak.errors.some((e) => e.includes('Password must contain at least 3'))
      ).toBe(true);
    });

    it('should accept a strong registration payload', () => {
      const strong = validation.validateRegistrationForm({
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'homeowner',
      });
      expect(strong.isValid).toBe(true);
    });
  });
});
