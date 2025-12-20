/**
 * Password History Manager Tests
 * 
 * Tests for password history tracking and reuse prevention
 */

import { PasswordHistoryManager } from '../src/password-history';
import bcrypt from 'bcryptjs';

describe('PasswordHistoryManager', () => {
  let manager: PasswordHistoryManager;
  const testUserId = 'test-user-123';
  const testPassword1 = 'TestPassword1!';
  const testPassword2 = 'TestPassword2!';
  const testPassword3 = 'TestPassword3!';

  beforeEach(async () => {
    manager = new PasswordHistoryManager(3); // Keep last 3 passwords
  });

  describe('addPassword()', () => {
    test('should add first password to history', async () => {
      await manager.addPassword(testUserId, testPassword1);
      const isInHistory = await manager.isPasswordInHistory(testUserId, testPassword1);
      expect(isInHistory).toBe(true);
    });

    test('should add multiple passwords to history', async () => {
      await manager.addPassword(testUserId, testPassword1);
      await manager.addPassword(testUserId, testPassword2);
      await manager.addPassword(testUserId, testPassword3);

      expect(await manager.isPasswordInHistory(testUserId, testPassword1)).toBe(true);
      expect(await manager.isPasswordInHistory(testUserId, testPassword2)).toBe(true);
      expect(await manager.isPasswordInHistory(testUserId, testPassword3)).toBe(true);
    });

    test('should maintain max history size', async () => {
      const password4 = 'TestPassword4!';
      
      await manager.addPassword(testUserId, testPassword1);
      await manager.addPassword(testUserId, testPassword2);
      await manager.addPassword(testUserId, testPassword3);
      await manager.addPassword(testUserId, password4); // Should remove password1

      expect(await manager.isPasswordInHistory(testUserId, testPassword1)).toBe(false);
      expect(await manager.isPasswordInHistory(testUserId, testPassword2)).toBe(true);
      expect(await manager.isPasswordInHistory(testUserId, testPassword3)).toBe(true);
      expect(await manager.isPasswordInHistory(testUserId, password4)).toBe(true);
    });

    test('should handle same password added multiple times', async () => {
      await manager.addPassword(testUserId, testPassword1);
      await manager.addPassword(testUserId, testPassword1);
      
      const count = (manager as any).history.get(testUserId)?.length || 0;
      expect(count).toBe(2); // Both entries should be added
    });

    test('should maintain separate histories for different users', async () => {
      const userId2 = 'test-user-456';
      
      await manager.addPassword(testUserId, testPassword1);
      await manager.addPassword(userId2, testPassword2);

      expect(await manager.isPasswordInHistory(testUserId, testPassword1)).toBe(true);
      expect(await manager.isPasswordInHistory(testUserId, testPassword2)).toBe(false);
      expect(await manager.isPasswordInHistory(userId2, testPassword1)).toBe(false);
      expect(await manager.isPasswordInHistory(userId2, testPassword2)).toBe(true);
    });
  });

  describe('isPasswordInHistory()', () => {
    test('should return false for new user', async () => {
      const isInHistory = await manager.isPasswordInHistory('new-user', testPassword1);
      expect(isInHistory).toBe(false);
    });

    test('should return false for password not in history', async () => {
      await manager.addPassword(testUserId, testPassword1);
      const isInHistory = await manager.isPasswordInHistory(testUserId, testPassword2);
      expect(isInHistory).toBe(false);
    });

    test('should return true for password in history', async () => {
      await manager.addPassword(testUserId, testPassword1);
      const isInHistory = await manager.isPasswordInHistory(testUserId, testPassword1);
      expect(isInHistory).toBe(true);
    });

    test('should correctly compare bcrypt hashes', async () => {
      await manager.addPassword(testUserId, testPassword1);
      
      // Same password should match even if hashed again
      const isInHistory = await manager.isPasswordInHistory(testUserId, testPassword1);
      expect(isInHistory).toBe(true);
    });

    test('should handle slight password variations', async () => {
      await manager.addPassword(testUserId, testPassword1);
      
      // Slight variation should not match
      const isInHistory = await manager.isPasswordInHistory(testUserId, testPassword1 + ' ');
      expect(isInHistory).toBe(false);
    });
  });

  describe('getPasswordHistory()', () => {
    test('should return empty array for new user', () => {
      const history = manager.getPasswordHistory('new-user');
      expect(history).toEqual([]);
    });

    test('should return all passwords in history', async () => {
      await manager.addPassword(testUserId, testPassword1);
      await manager.addPassword(testUserId, testPassword2);
      
      const history = manager.getPasswordHistory(testUserId);
      expect(history).toHaveLength(2);
      expect(history[0]).toHaveProperty('passwordHash');
      expect(history[0]).toHaveProperty('createdAt');
    });

    test('should return passwords in chronological order (oldest first)', async () => {
      await manager.addPassword(testUserId, testPassword1);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await manager.addPassword(testUserId, testPassword2);
      
      const history = manager.getPasswordHistory(testUserId);
      expect(history[0].createdAt.getTime()).toBeLessThan(history[1].createdAt.getTime());
    });
  });

  describe('clearHistory()', () => {
    test('should clear all history for user', async () => {
      await manager.addPassword(testUserId, testPassword1);
      await manager.addPassword(testUserId, testPassword2);
      
      manager.clearHistory(testUserId);
      
      const history = manager.getPasswordHistory(testUserId);
      expect(history).toHaveLength(0);
    });

    test('should not affect other users', async () => {
      const userId2 = 'test-user-456';
      
      await manager.addPassword(testUserId, testPassword1);
      await manager.addPassword(userId2, testPassword2);
      
      manager.clearHistory(testUserId);
      
      expect(manager.getPasswordHistory(testUserId)).toHaveLength(0);
      expect(manager.getPasswordHistory(userId2)).toHaveLength(1);
    });

    test('should handle clearing non-existent user', () => {
      expect(() => manager.clearHistory('non-existent-user')).not.toThrow();
    });
  });

  describe('edge cases', () => {
    test('should handle very long passwords', async () => {
      const longPassword = 'A'.repeat(1000) + '1!';
      await manager.addPassword(testUserId, longPassword);
      const isInHistory = await manager.isPasswordInHistory(testUserId, longPassword);
      expect(isInHistory).toBe(true);
    });

    test('should handle empty userId', async () => {
      await expect(manager.addPassword('', testPassword1)).rejects.toThrow();
    });

    test('should handle empty password', async () => {
      await expect(manager.addPassword(testUserId, '')).rejects.toThrow();
    });

    test('should handle special characters in password', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:",.<>?/`~';
      await manager.addPassword(testUserId, specialPassword);
      const isInHistory = await manager.isPasswordInHistory(testUserId, specialPassword);
      expect(isInHistory).toBe(true);
    });

    test('should handle unicode in password', async () => {
      const unicodePassword = 'Test™∞§¶•ªº1!';
      await manager.addPassword(testUserId, unicodePassword);
      const isInHistory = await manager.isPasswordInHistory(testUserId, unicodePassword);
      expect(isInHistory).toBe(true);
    });
  });

  describe('custom history size', () => {
    test('should respect custom history size of 1', async () => {
      const customManager = new PasswordHistoryManager(1);
      
      await customManager.addPassword(testUserId, testPassword1);
      await customManager.addPassword(testUserId, testPassword2);
      
      expect(await customManager.isPasswordInHistory(testUserId, testPassword1)).toBe(false);
      expect(await customManager.isPasswordInHistory(testUserId, testPassword2)).toBe(true);
    });

    test('should respect custom history size of 10', async () => {
      const customManager = new PasswordHistoryManager(10);
      
      for (let i = 0; i < 10; i++) {
        await customManager.addPassword(testUserId, `Password${i}!`);
      }
      
      const history = customManager.getPasswordHistory(testUserId);
      expect(history).toHaveLength(10);
    });

    test('should handle history size of 0', () => {
      expect(() => new PasswordHistoryManager(0)).toThrow();
    });

    test('should handle negative history size', () => {
      expect(() => new PasswordHistoryManager(-1)).toThrow();
    });
  });

  describe('performance', () => {
    test('should handle many users efficiently', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await manager.addPassword(`user-${i}`, `Password${i}!`);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in < 5 seconds
    });

    test('should handle many password checks efficiently', async () => {
      await manager.addPassword(testUserId, testPassword1);
      await manager.addPassword(testUserId, testPassword2);
      await manager.addPassword(testUserId, testPassword3);
      
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await manager.isPasswordInHistory(testUserId, testPassword1);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(3000); // Should complete in < 3 seconds
    });
  });
});

