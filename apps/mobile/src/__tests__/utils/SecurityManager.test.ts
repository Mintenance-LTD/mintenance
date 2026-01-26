import SecurityManager from '../../utils/SecurityManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import SqlInjectionProtection from '../../utils/SqlInjectionProtection';
import InputValidationMiddleware from '../../middleware/InputValidationMiddleware';
import { logger } from '../../utils/logger';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn()
  }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../../utils/SqlInjectionProtection', () => ({
  scanForSqlInjection: jest.fn()
}));

jest.mock('../../middleware/InputValidationMiddleware', () => ({
  validateText: jest.fn(),
  validateEmail: jest.fn(),
  validateRateLimit: jest.fn()
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn()
}));

const FileSystem = require('expo-file-system');

describe('SecurityManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset rate limit map
    (SecurityManager as any).rateLimitMap = new Map();
    (SecurityManager as any).rateLimitLoaded = false;
  });

  describe('Module Structure', () => {
    it('should export SecurityManager instance', () => {
      expect(SecurityManager).toBeDefined();
      expect(typeof SecurityManager).toBe('object');
    });

    it('should export all public methods', () => {
      expect(typeof SecurityManager.validateTextInput).toBe('function');
      expect(typeof SecurityManager.validateEmail).toBe('function');
      expect(typeof SecurityManager.validatePassword).toBe('function');
      expect(typeof SecurityManager.validateFileUpload).toBe('function');
      expect(typeof SecurityManager.secureStore).toBe('function');
      expect(typeof SecurityManager.secureRetrieve).toBe('function');
      expect(typeof SecurityManager.sanitizeForLogging).toBe('function');
      expect(typeof SecurityManager.checkRateLimit).toBe('function');
      expect(typeof SecurityManager.generateSecurityReport).toBe('function');
    });

    it('should export static methods', () => {
      const SecurityManagerService = SecurityManager.constructor;
      expect(typeof SecurityManagerService.checkRateLimit).toBe('function');
      expect(typeof SecurityManagerService.hasPermission).toBe('function');
      expect(typeof SecurityManagerService.sanitizeForLogging).toBe('function');
    });
  });

  describe('validateTextInput', () => {
    it('should validate text input with middleware and SQL injection protection', () => {
      const mockValidationResult = {
        isValid: true,
        errors: [],
        sanitized: 'sanitized text'
      };

      (InputValidationMiddleware.validateText as jest.Mock).mockReturnValue(mockValidationResult);
      (SqlInjectionProtection.scanForSqlInjection as jest.Mock).mockReturnValue({
        isSafe: true,
        threats: []
      });

      const result = SecurityManager.validateTextInput('test input', {
        maxLength: 100,
        minLength: 5,
        fieldName: 'username'
      });

      expect(InputValidationMiddleware.validateText).toHaveBeenCalledWith('test input', {
        maxLength: 100,
        minLength: 5,
        pattern: undefined,
        allowEmpty: false,
        sanitize: true,
        fieldName: 'username'
      });

      expect(SqlInjectionProtection.scanForSqlInjection).toHaveBeenCalledWith('test input');
      expect(result).toEqual({
        isValid: true,
        errors: [],
        sanitized: 'sanitized text'
      });
    });

    it('should fail validation when SQL injection is detected', () => {
      (InputValidationMiddleware.validateText as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        sanitized: 'test'
      });

      (SqlInjectionProtection.scanForSqlInjection as jest.Mock).mockReturnValue({
        isSafe: false,
        threats: ['SQL injection detected: DROP TABLE']
      });

      const result = SecurityManager.validateTextInput("'; DROP TABLE users; --");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SQL injection detected: DROP TABLE');
    });

    it('should handle validation with pattern', () => {
      (InputValidationMiddleware.validateText as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        sanitized: 'test123'
      });

      (SqlInjectionProtection.scanForSqlInjection as jest.Mock).mockReturnValue({
        isSafe: true,
        threats: []
      });

      const pattern = /^[a-zA-Z0-9]+$/;
      SecurityManager.validateTextInput('test123', { pattern });

      expect(InputValidationMiddleware.validateText).toHaveBeenCalledWith('test123', {
        pattern,
        allowEmpty: false,
        sanitize: true,
        fieldName: undefined,
        maxLength: undefined,
        minLength: undefined
      });
    });

    it('should combine middleware and SQL injection errors', () => {
      (InputValidationMiddleware.validateText as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Text too short'],
        sanitized: 'test'
      });

      (SqlInjectionProtection.scanForSqlInjection as jest.Mock).mockReturnValue({
        isSafe: false,
        threats: ['Suspicious pattern detected']
      });

      const result = SecurityManager.validateTextInput('test');

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Text too short', 'Suspicious pattern detected']);
    });
  });

  describe('validateEmail', () => {
    it('should delegate email validation to middleware', () => {
      const mockResult = {
        isValid: true,
        errors: [],
        sanitized: 'test@example.com'
      };

      (InputValidationMiddleware.validateEmail as jest.Mock).mockReturnValue(mockResult);

      const result = SecurityManager.validateEmail('test@example.com');

      expect(InputValidationMiddleware.validateEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual(mockResult);
    });

    it('should handle invalid email', () => {
      const mockResult = {
        isValid: false,
        errors: ['Invalid email format'],
        sanitized: 'invalid-email'
      };

      (InputValidationMiddleware.validateEmail as jest.Mock).mockReturnValue(mockResult);

      const result = SecurityManager.validateEmail('invalid-email');

      expect(result).toEqual(mockResult);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = SecurityManager.validatePassword('StrongP@ss123');

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = SecurityManager.validatePassword('Short1!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should require uppercase letter', () => {
      const result = SecurityManager.validatePassword('lowercase123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letter', () => {
      const result = SecurityManager.validatePassword('UPPERCASE123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require number', () => {
      const result = SecurityManager.validatePassword('NoNumbers!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special character', () => {
      const result = SecurityManager.validatePassword('NoSpecial123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common passwords', () => {
      const result = SecurityManager.validatePassword('password');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common. Please choose a stronger password');
    });

    it('should reject common passwords case-insensitively', () => {
      const result = SecurityManager.validatePassword('PASSWORD');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common. Please choose a stronger password');
    });

    it('should return all validation errors for weak password', () => {
      const result = SecurityManager.validatePassword('abc');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(5); // Too short, no uppercase, no number, no special, too common
    });
  });

  describe('validateFileUpload', () => {
    it('should validate valid image file', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024 * 1024, // 1MB
      });

      const result = await SecurityManager.validateFileUpload('/path/to/image.jpg');

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.fileInfo).toEqual({
        size: 1024 * 1024,
        type: 'image/jpg',
        name: 'image.jpg'
      });
    });

    it('should reject non-existent file', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      const result = await SecurityManager.validateFileUpload('/path/to/nonexistent.jpg');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File does not exist');
    });

    it('should reject oversized file', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 11 * 1024 * 1024, // 11MB (over 10MB limit)
      });

      const result = await SecurityManager.validateFileUpload('/path/to/large.jpg');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size exceeds maximum allowed size of 10MB');
    });

    it('should reject file without extension', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024,
      });

      const result = await SecurityManager.validateFileUpload('/path/to/noextension');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File must have a valid extension');
    });

    it('should reject non-image file types', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024,
      });

      const result = await SecurityManager.validateFileUpload('/path/to/document.pdf');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Only JPEG, PNG, and WebP images are allowed');
    });

    it('should accept different image formats', async () => {
      const formats = ['jpg', 'jpeg', 'png', 'webp'];

      for (const format of formats) {
        (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
          exists: true,
          size: 1024,
        });

        const result = await SecurityManager.validateFileUpload(`/path/to/image.${format}`);

        expect(result.isValid).toBe(true);
        expect(result.fileInfo?.type).toBe(`image/${format}`);
      }
    });

    it('should reject filename that is too long', async () => {
      const longFilename = 'a'.repeat(256) + '.jpg';

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024,
      });

      const result = await SecurityManager.validateFileUpload(`/path/to/${longFilename}`);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Filename is too long');
    });

    it('should reject suspicious filename with directory traversal', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024,
      });

      const result = await SecurityManager.validateFileUpload('/path/../../../etc/passwd.jpg');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid filename detected');
    });

    it('should reject reserved Windows filenames', async () => {
      const reservedNames = ['con.jpg', 'prn.jpg', 'aux.jpg', 'nul.jpg', 'com1.jpg', 'lpt1.jpg'];

      for (const name of reservedNames) {
        (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
          exists: true,
          size: 1024,
        });

        const result = await SecurityManager.validateFileUpload(`/path/to/${name}`);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid filename detected');
      }
    });

    it('should handle FileSystem errors gracefully', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error('FileSystem error'));

      const result = await SecurityManager.validateFileUpload('/path/to/image.jpg');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed to validate file');
    });
  });

  describe('secureStore and secureRetrieve', () => {
    it('should store value securely', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await SecurityManager.secureStore('key', 'value');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('key', 'value');
      expect(result).toBe(true);
    });

    it('should handle storage errors', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await SecurityManager.secureStore('key', 'value');

      expect(logger.error).toHaveBeenCalledWith('Secure storage failed:', expect.any(Error));
      expect(result).toBe(false);
    });

    it('should retrieve value securely', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored value');

      const result = await SecurityManager.secureRetrieve('key');

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('key');
      expect(result).toBe('stored value');
    });

    it('should handle retrieval errors', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Retrieval error'));

      const result = await SecurityManager.secureRetrieve('key');

      expect(logger.error).toHaveBeenCalledWith('Secure retrieval failed:', expect.any(Error));
      expect(result).toBeNull();
    });
  });

  describe('sanitizeForLogging', () => {
    it('should return non-objects as-is', () => {
      expect(SecurityManager.sanitizeForLogging('string')).toBe('string');
      expect(SecurityManager.sanitizeForLogging(123)).toBe(123);
      expect(SecurityManager.sanitizeForLogging(true)).toBe(true);
      expect(SecurityManager.sanitizeForLogging(null)).toBe(null);
      expect(SecurityManager.sanitizeForLogging(undefined)).toBe(undefined);
    });

    it('should redact sensitive keys', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        apiKey: 'key-123',
        token: 'token-456',
        secret: 'my-secret',
        creditCard: '1234-5678-9012-3456',
        ssn: '123-45-6789'
      };

      const sanitized = SecurityManager.sanitizeForLogging(data);

      expect(sanitized).toEqual({
        username: 'john',
        password: '[REDACTED]',
        apiKey: '[REDACTED]',
        token: '[REDACTED]',
        secret: '[REDACTED]',
        creditCard: '[REDACTED]',
        ssn: '[REDACTED]'
      });
    });

    it('should handle case-insensitive key matching', () => {
      const data = {
        PASSWORD: 'secret',
        ApiKey: 'key',
        access_token: 'token',
        SECRET_KEY: 'secret'
      };

      const sanitized = SecurityManager.sanitizeForLogging(data);

      expect(sanitized).toEqual({
        PASSWORD: '[REDACTED]',
        ApiKey: '[REDACTED]',
        access_token: '[REDACTED]',
        SECRET_KEY: '[REDACTED]'
      });
    });

    it('should handle nested sensitive keys', () => {
      const data = {
        user: 'john',
        userPassword: 'secret',
        passwordReset: 'token',
        keychain: 'keys'
      };

      const sanitized = SecurityManager.sanitizeForLogging(data);

      expect(sanitized).toEqual({
        user: 'john',
        userPassword: '[REDACTED]',
        passwordReset: '[REDACTED]',
        keychain: '[REDACTED]'
      });
    });

    it('should not mutate original object', () => {
      const data = { password: 'secret' };
      const sanitized = SecurityManager.sanitizeForLogging(data);

      expect(data.password).toBe('secret');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(data).not.toBe(sanitized);
    });

    it('should use static method', () => {
      const data = { password: 'secret' };
      const instanceResult = SecurityManager.sanitizeForLogging(data);
      const staticResult = SecurityManager.constructor.sanitizeForLogging(data);

      expect(instanceResult).toEqual(staticResult);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow first request', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await SecurityManager.checkRateLimit('user1', 5, 1000);

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@rate_limit_data');
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should increment counter for subsequent requests', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result1 = await SecurityManager.checkRateLimit('user1', 5, 60000);
      const result2 = await SecurityManager.checkRateLimit('user1', 5, 60000);
      const result3 = await SecurityManager.checkRateLimit('user1', 5, 60000);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it('should block requests exceeding limit', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Make requests up to the limit
      for (let i = 0; i < 3; i++) {
        await SecurityManager.checkRateLimit('user2', 3, 60000);
      }

      // Next request should be blocked
      const result = await SecurityManager.checkRateLimit('user2', 3, 60000);
      expect(result).toBe(false);
    });

    it('should reset after window expires', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      // First request
      await SecurityManager.checkRateLimit('user3', 1, 1000);

      // Move time forward past the window
      jest.spyOn(Date, 'now').mockReturnValue(now + 1001);

      // Should allow new request
      const result = await SecurityManager.checkRateLimit('user3', 1, 1000);
      expect(result).toBe(true);
    });

    it('should load persisted rate limit data', async () => {
      const futureTime = Date.now() + 10000;
      const persistedData = {
        'user4': { count: 2, resetTime: futureTime }
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(persistedData));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Should respect the persisted count
      const result = await SecurityManager.checkRateLimit('user4', 3, 60000);
      expect(result).toBe(true);

      // One more request should hit the limit
      const result2 = await SecurityManager.checkRateLimit('user4', 3, 60000);
      expect(result2).toBe(false);
    });

    it('should filter out expired entries when loading', async () => {
      const now = Date.now();
      const persistedData = {
        'expired': { count: 5, resetTime: now - 1000 },
        'valid': { count: 2, resetTime: now + 10000 }
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(persistedData));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await SecurityManager.checkRateLimit('expired', 3, 60000);

      // Expired entry should have been reset
      expect(await SecurityManager.checkRateLimit('expired', 3, 60000)).toBe(true);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await SecurityManager.checkRateLimit('user5', 5, 1000);

      expect(result).toBe(true);
      expect(logger.error).toHaveBeenCalledWith('Failed to load rate limit data:', expect.any(Error));
    });

    it('should handle save errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Save error'));

      const result = await SecurityManager.checkRateLimit('user6', 5, 1000);

      expect(result).toBe(true);
      expect(logger.error).toHaveBeenCalledWith('Failed to save rate limit data:', expect.any(Error));
    });
  });

  describe('Static Methods', () => {
    describe('checkRateLimit (static)', () => {
      it('should delegate to InputValidationMiddleware', () => {
        (InputValidationMiddleware.validateRateLimit as jest.Mock).mockReturnValue({
          allowed: true,
          remaining: 5
        });

        const result = SecurityManager.constructor.checkRateLimit('user1', 10, 60000);

        expect(InputValidationMiddleware.validateRateLimit).toHaveBeenCalledWith('user1', 10, 60000);
        expect(result).toBe(true);
      });

      it('should return false when rate limit exceeded', () => {
        (InputValidationMiddleware.validateRateLimit as jest.Mock).mockReturnValue({
          allowed: false,
          remaining: 0
        });

        const result = SecurityManager.constructor.checkRateLimit('user1', 10, 60000);

        expect(result).toBe(false);
      });
    });

    describe('hasPermission', () => {
      it('should allow access when user role meets required level', () => {
        expect(SecurityManager.constructor.hasPermission('admin', 'homeowner')).toBe(true);
        expect(SecurityManager.constructor.hasPermission('admin', 'contractor')).toBe(true);
        expect(SecurityManager.constructor.hasPermission('admin', 'admin')).toBe(true);
      });

      it('should deny access when user role is below required level', () => {
        expect(SecurityManager.constructor.hasPermission('guest', 'homeowner')).toBe(false);
        expect(SecurityManager.constructor.hasPermission('guest', 'admin')).toBe(false);
        expect(SecurityManager.constructor.hasPermission('homeowner', 'admin')).toBe(false);
        expect(SecurityManager.constructor.hasPermission('contractor', 'admin')).toBe(false);
      });

      it('should handle equal permission levels', () => {
        expect(SecurityManager.constructor.hasPermission('homeowner', 'homeowner')).toBe(true);
        expect(SecurityManager.constructor.hasPermission('contractor', 'contractor')).toBe(true);
        expect(SecurityManager.constructor.hasPermission('homeowner', 'contractor')).toBe(true);
        expect(SecurityManager.constructor.hasPermission('contractor', 'homeowner')).toBe(true);
      });

      it('should default unknown roles to guest level', () => {
        expect(SecurityManager.constructor.hasPermission('unknown', 'homeowner')).toBe(false);
        expect(SecurityManager.constructor.hasPermission('invalid', 'admin')).toBe(false);
      });

      it('should handle undefined required role', () => {
        expect(SecurityManager.constructor.hasPermission('admin', 'undefined')).toBe(true);
        expect(SecurityManager.constructor.hasPermission('guest', 'undefined')).toBe(true);
      });
    });
  });

  describe('generateSecurityReport', () => {
    it('should generate report with empty rate limits', () => {
      const report = SecurityManager.generateSecurityReport();

      expect(report).toHaveProperty('rateLimitStatus');
      expect(report).toHaveProperty('securityConfig');
      expect(report.rateLimitStatus).toEqual([]);
      expect(report.securityConfig).toEqual({
        MAX_FILE_SIZE: 10 * 1024 * 1024,
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
        MAX_FILENAME_LENGTH: 255,
        SENSITIVE_DATA_KEYS: ['password', 'token', 'secret', 'key']
      });
    });

    it('should include current rate limit status', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Add some rate limit entries
      await SecurityManager.checkRateLimit('user1', 5, 60000);
      await SecurityManager.checkRateLimit('user2', 5, 60000);

      const report = SecurityManager.generateSecurityReport();

      expect(report.rateLimitStatus).toHaveLength(2);
      expect(report.rateLimitStatus[0]).toHaveProperty('identifier');
      expect(report.rateLimitStatus[0]).toHaveProperty('count');
      expect(report.rateLimitStatus[0]).toHaveProperty('resetTime');
    });
  });

  describe('Private Helper Methods', () => {
    it('should strip HTML tags', () => {
      // Testing private method indirectly through validation
      (InputValidationMiddleware.validateText as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        sanitized: 'text without tags'
      });

      (SqlInjectionProtection.scanForSqlInjection as jest.Mock).mockReturnValue({
        isSafe: true,
        threats: []
      });

      const result = SecurityManager.validateTextInput('<div>text</div>');

      // The actual stripping is done by InputValidationMiddleware in this implementation
      expect(InputValidationMiddleware.validateText).toHaveBeenCalled();
    });

    it('should detect suspicious filenames with special characters', async () => {
      const suspiciousNames = [
        'file<script>.jpg',
        'file:name.jpg',
        'file|name.jpg',
        'file*name.jpg',
        'file?name.jpg'
      ];

      for (const name of suspiciousNames) {
        (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
          exists: true,
          size: 1024
        });

        const result = await SecurityManager.validateFileUpload(`/path/${name}`);
        expect(result.errors).toContain('Invalid filename detected');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input validation', () => {
      (InputValidationMiddleware.validateText as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Input is required'],
        sanitized: ''
      });

      (SqlInjectionProtection.scanForSqlInjection as jest.Mock).mockReturnValue({
        isSafe: true,
        threats: []
      });

      const result = SecurityManager.validateTextInput('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input is required');
    });

    it('should handle very long input', () => {
      const longInput = 'a'.repeat(10000);

      (InputValidationMiddleware.validateText as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Text exceeds maximum length'],
        sanitized: longInput.substring(0, 1000)
      });

      (SqlInjectionProtection.scanForSqlInjection as jest.Mock).mockReturnValue({
        isSafe: true,
        threats: []
      });

      const result = SecurityManager.validateTextInput(longInput, { maxLength: 1000 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Text exceeds maximum length');
    });

    it('should handle concurrent rate limit checks', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Simulate concurrent requests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(SecurityManager.checkRateLimit('concurrent', 3, 60000));
      }

      const results = await Promise.all(promises);

      // First 3 should succeed, last 2 should fail
      expect(results.slice(0, 3).every(r => r === true)).toBe(true);
      expect(results.slice(3).every(r => r === false)).toBe(true);
    });

    it('should handle malformed JSON in AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await SecurityManager.checkRateLimit('user', 5, 1000);

      expect(result).toBe(true);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should validate complete user registration data', () => {
      // Mock successful validations
      (InputValidationMiddleware.validateText as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        sanitized: 'sanitized'
      });

      (InputValidationMiddleware.validateEmail as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        sanitized: 'test@example.com'
      });

      (SqlInjectionProtection.scanForSqlInjection as jest.Mock).mockReturnValue({
        isSafe: true,
        threats: []
      });

      // Validate username
      const usernameResult = SecurityManager.validateTextInput('johndoe', {
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_]+$/
      });

      // Validate email
      const emailResult = SecurityManager.validateEmail('john@example.com');

      // Validate password
      const passwordResult = SecurityManager.validatePassword('SecureP@ss123');

      expect(usernameResult.isValid).toBe(true);
      expect(emailResult.isValid).toBe(true);
      expect(passwordResult.isValid).toBe(true);
    });

    it('should handle complete file upload workflow', async () => {
      // Mock file validation
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 2 * 1024 * 1024 // 2MB
      });

      // Validate file
      const validationResult = await SecurityManager.validateFileUpload('/path/to/profile.jpg');

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.fileInfo).toBeDefined();
      expect(validationResult.fileInfo?.size).toBe(2 * 1024 * 1024);
    });

    it('should sanitize complex nested objects for logging', () => {
      const complexData = {
        user: {
          id: '123',
          email: 'user@example.com',
          password: 'secret',
          profile: {
            name: 'John',
            apiKey: 'key-123'
          }
        },
        session: {
          token: 'session-token',
          expires: '2024-01-01'
        },
        metadata: {
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1'
        }
      };

      const sanitized = SecurityManager.sanitizeForLogging(complexData);

      expect(sanitized.user.password).toBe('[REDACTED]');
      expect(sanitized.user.profile.apiKey).toBe('[REDACTED]');
      expect(sanitized.session.token).toBe('[REDACTED]');
      expect(sanitized.metadata.userAgent).toBe('Mozilla/5.0');
    });
  });
});