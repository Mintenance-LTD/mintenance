/**
 * Tests for Password Validator
 */

import { PasswordValidator } from '../password-validator';

describe('PasswordValidator', () => {
  describe('validate', () => {
    it('should validate a strong password', () => {
      const result = PasswordValidator.validate('StrongP@ss123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('strong');
    });

    it('should reject password that is too short', () => {
      const result = PasswordValidator.validate('Sh0rt!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = PasswordValidator.validate('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = PasswordValidator.validate('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = PasswordValidator.validate('NoNumbers!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = PasswordValidator.validate('NoSpecialChar123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common passwords', () => {
      const result = PasswordValidator.validate('password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This password is too common. Please choose a more unique password');
    });

    it('should reject passwords with sequential numbers', () => {
      const result = PasswordValidator.validate('Abc123456!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password should not contain sequential characters (e.g., 123, abc)');
    });

    it('should reject passwords with sequential letters', () => {
      const result = PasswordValidator.validate('Abcdefg1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password should not contain sequential characters (e.g., 123, abc)');
    });

    it('should reject passwords exceeding max length', () => {
      const longPassword = 'A'.repeat(129) + '1!';
      const result = PasswordValidator.validate(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });

    it('should accept password at minimum length', () => {
      const result = PasswordValidator.validate('Valid1P@');
      expect(result.isValid).toBe(true);
    });

    it('should allow custom requirements', () => {
      const result = PasswordValidator.validate('simple', {
        minLength: 6,
        requireUppercase: false,
        requireNumbers: false,
        requireSpecialChars: false,
      });
      expect(result.isValid).toBe(true);
    });

    it('should validate with partial custom requirements', () => {
      const result = PasswordValidator.validate('LongerPassword123!', {
        minLength: 12,
      });
      expect(result.isValid).toBe(true);
    });

    it('should handle case-insensitive common password check', () => {
      const result = PasswordValidator.validate('PASSWORD123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This password is too common. Please choose a more unique password');
    });
  });

  describe('calculateStrength', () => {
    it('should rate short simple password as weak', () => {
      const result = PasswordValidator.validate('Pass1!');
      expect(result.strength).toBe('weak');
    });

    it('should rate medium complexity password as medium', () => {
      const result = PasswordValidator.validate('GoodPass1!');
      expect(result.strength).toBe('medium');
    });

    it('should rate long complex password as strong', () => {
      const result = PasswordValidator.validate('VeryStr0ng&SecureP@ssw0rd!');
      expect(result.strength).toBe('strong');
    });

    it('should consider length in strength calculation', () => {
      const short = PasswordValidator.validate('Valid1P@');
      const medium = PasswordValidator.validate('Valid1Pass@');
      const long = PasswordValidator.validate('Valid1Password@');

      // Longer passwords should be rated higher
      expect(['weak', 'medium']).toContain(short.strength);
      expect(['medium', 'strong']).toContain(medium.strength);
      expect(long.strength).toBe('strong');
    });

    it('should consider character diversity', () => {
      const lowDiversity = PasswordValidator.validate('Aaaa1111!!!!');
      const highDiversity = PasswordValidator.validate('Tr1cky!P@ssw0rd');

      // More diverse passwords should be stronger
      expect(['weak', 'medium']).toContain(lowDiversity.strength);
      expect(highDiversity.strength).toBe('strong');
    });
  });

  describe('hasSequentialCharacters', () => {
    it('should detect numeric sequences', () => {
      const sequences = ['012', '123', '234', '345', '456', '567', '678', '789'];
      sequences.forEach(seq => {
        const result = PasswordValidator.validate(`Pass${seq}!`);
        expect(result.isValid).toBe(false);
      });
    });

    it('should detect alphabetic sequences', () => {
      const result = PasswordValidator.validate('Pabcd1!');
      expect(result.isValid).toBe(false);
    });

    it('should detect qwerty sequence', () => {
      const result = PasswordValidator.validate('Pqwer1!');
      expect(result.isValid).toBe(false);
    });

    it('should allow non-sequential characters', () => {
      const result = PasswordValidator.validate('P@ssw0rd!Random');
      expect(result.errors).not.toContain('Password should not contain sequential characters (e.g., 123, abc)');
    });
  });

  describe('isInPasswordHistory', () => {
    it('should return true if password is in history', async () => {
      const history = ['hash1', 'hash2', 'hash3'];
      const result = await PasswordValidator.isInPasswordHistory('hash2', history);
      expect(result).toBe(true);
    });

    it('should return false if password is not in history', async () => {
      const history = ['hash1', 'hash2', 'hash3'];
      const result = await PasswordValidator.isInPasswordHistory('hash4', history);
      expect(result).toBe(false);
    });

    it('should handle empty history', async () => {
      const result = await PasswordValidator.isInPasswordHistory('hash1', []);
      expect(result).toBe(false);
    });
  });

  describe('getRequirementsMessage', () => {
    it('should return default requirements message', () => {
      const message = PasswordValidator.getRequirementsMessage();
      expect(message).toContain('8 characters');
      expect(message).toContain('uppercase');
      expect(message).toContain('lowercase');
      expect(message).toContain('number');
      expect(message).toContain('special character');
    });

    it('should return custom requirements message', () => {
      const message = PasswordValidator.getRequirementsMessage({
        minLength: 12,
        requireSpecialChars: false,
      });
      expect(message).toContain('12 characters');
      expect(message).not.toContain('special character');
    });

    it('should handle minimal requirements', () => {
      const message = PasswordValidator.getRequirementsMessage({
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSpecialChars: false,
      });
      expect(message).toContain('8 characters');
      expect(message).not.toContain('uppercase');
      expect(message).not.toContain('special character');
    });
  });

  describe('edge cases', () => {
    it('should handle empty password', () => {
      const result = PasswordValidator.validate('');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle password with only spaces', () => {
      const result = PasswordValidator.validate('        ');
      expect(result.isValid).toBe(false);
    });

    it('should handle password with unicode characters', () => {
      const result = PasswordValidator.validate('Pässw0rd!🔒');
      expect(result.isValid).toBe(true);
    });

    it('should handle all special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{};\':"|,.<>/?';
      specialChars.split('').forEach(char => {
        const result = PasswordValidator.validate(`ValidP1${char}`);
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate password exactly at max length', () => {
      const password = 'A'.repeat(127) + '1!';
      const result = PasswordValidator.validate(password);
      expect(result.isValid).toBe(true);
    });
  });
});
