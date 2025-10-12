/**
 * Password Validator Tests
 * 
 * Tests for password complexity validation
 */

import { PasswordValidator, PasswordRequirements } from '../src/password-validator';

describe('PasswordValidator', () => {
  let validator: PasswordValidator;
  let strictValidator: PasswordValidator;

  beforeEach(() => {
    // Default validator
    validator = new PasswordValidator();

    // Strict validator
    strictValidator = new PasswordValidator({
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      minUppercase: 2,
      minLowercase: 2,
      minNumbers: 2,
      minSpecialChars: 2,
    });
  });

  describe('validate()', () => {
    describe('with default requirements', () => {
      test('should accept valid password with all requirements', () => {
        const result = validator.validate('MyP@ssw0rd');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should reject password without uppercase', () => {
        const result = validator.validate('myp@ssw0rd');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least 1 uppercase letter');
      });

      test('should reject password without lowercase', () => {
        const result = validator.validate('MYP@SSW0RD');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least 1 lowercase letter');
      });

      test('should reject password without number', () => {
        const result = validator.validate('MyP@ssword');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least 1 number');
      });

      test('should reject password without special character', () => {
        const result = validator.validate('MyPassw0rd');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least 1 special character');
      });

      test('should reject password that is too short', () => {
        const result = validator.validate('MyP@s1');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
      });

      test('should accept minimum length password with all requirements', () => {
        const result = validator.validate('MyP@ss1!');
        expect(result.isValid).toBe(true);
      });

      test('should handle multiple validation errors', () => {
        const result = validator.validate('short');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        expect(result.errors).toContain('Password must be at least 8 characters long');
        expect(result.errors).toContain('Password must contain at least 1 uppercase letter');
        expect(result.errors).toContain('Password must contain at least 1 number');
        expect(result.errors).toContain('Password must contain at least 1 special character');
      });
    });

    describe('with strict requirements', () => {
      test('should accept password meeting strict requirements', () => {
        const result = strictValidator.validate('MyGR3@tP@ssw0rd!!');
        expect(result.isValid).toBe(true);
      });

      test('should reject password without enough uppercase letters', () => {
        const result = strictValidator.validate('myGR3@tP@ssw0rd!!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least 2 uppercase letters');
      });

      test('should reject password without enough numbers', () => {
        const result = strictValidator.validate('MyGREatP@ssword!!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least 2 numbers');
      });

      test('should reject password without enough special characters', () => {
        const result = strictValidator.validate('MyGR3atP@ssw0rd1');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least 2 special characters');
      });

      test('should reject password shorter than 12 characters', () => {
        const result = strictValidator.validate('MyP@ss11!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 12 characters long');
      });
    });

    describe('with custom requirements', () => {
      test('should allow disabling uppercase requirement', () => {
        const customValidator = new PasswordValidator({
          requireUppercase: false,
        });
        const result = customValidator.validate('myp@ssw0rd1');
        expect(result.isValid).toBe(true);
      });

      test('should allow disabling special characters requirement', () => {
        const customValidator = new PasswordValidator({
          requireSpecialChars: false,
        });
        const result = customValidator.validate('MyPassw0rd');
        expect(result.isValid).toBe(true);
      });

      test('should allow custom minimum length', () => {
        const customValidator = new PasswordValidator({
          minLength: 6,
        });
        const result = customValidator.validate('MyP@1!');
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('getRequirements()', () => {
    test('should return default requirements', () => {
      const requirements = validator.getRequirements();
      expect(requirements).toEqual({
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        minUppercase: 1,
        minLowercase: 1,
        minNumbers: 1,
        minSpecialChars: 1,
      });
    });

    test('should return custom requirements', () => {
      const requirements = strictValidator.getRequirements();
      expect(requirements.minLength).toBe(12);
      expect(requirements.minUppercase).toBe(2);
      expect(requirements.minNumbers).toBe(2);
    });
  });

  describe('edge cases', () => {
    test('should handle empty password', () => {
      const result = validator.validate('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('should handle password with only spaces', () => {
      const result = validator.validate('        ');
      expect(result.isValid).toBe(false);
    });

    test('should handle password with unicode characters', () => {
      const result = validator.validate('MyP@ssw0rd™');
      expect(result.isValid).toBe(true);
    });

    test('should handle very long password', () => {
      const longPassword = 'MyP@ssw0rd' + 'a'.repeat(1000);
      const result = validator.validate(longPassword);
      expect(result.isValid).toBe(true);
    });

    test('should handle password with emojis', () => {
      const result = validator.validate('MyP@ss😀w0rd');
      expect(result.isValid).toBe(true);
    });
  });

  describe('real-world password examples', () => {
    test('should reject common weak passwords', () => {
      const weakPasswords = [
        'password',
        'password123',
        'Password123',
        '12345678',
        'qwerty123',
      ];

      weakPasswords.forEach(pwd => {
        const result = validator.validate(pwd);
        expect(result.isValid).toBe(false);
      });
    });

    test('should accept strong passwords', () => {
      const strongPasswords = [
        'MyS3cure!Pass',
        'C0mpl3x@Password',
        'Str0ng!Passw0rd',
        'V3ry$ecure#123',
      ];

      strongPasswords.forEach(pwd => {
        const result = validator.validate(pwd);
        expect(result.isValid).toBe(true);
      });
    });
  });
});

