/**
 * Account Lockout Manager Tests
 * 
 * Tests for brute force protection and account lockout
 */

import { AccountLockoutManager } from '../src/account-lockout';

describe('AccountLockoutManager', () => {
  let manager: AccountLockoutManager;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    manager = new AccountLockoutManager({
      maxAttempts: 3,
      lockoutDuration: 1000, // 1 second for testing
      attemptWindow: 5000, // 5 seconds
    });
  });

  describe('recordFailedAttempt()', () => {
    test('should record first failed attempt', () => {
      manager.recordFailedAttempt(testUserId);
      const status = manager.getLockoutStatus(testUserId);
      
      expect(status.isLocked).toBe(false);
      expect(status.failedAttempts).toBe(1);
      expect(status.remainingAttempts).toBe(2);
    });

    test('should increment failed attempts', () => {
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      
      const status = manager.getLockoutStatus(testUserId);
      expect(status.failedAttempts).toBe(2);
      expect(status.remainingAttempts).toBe(1);
    });

    test('should lock account after max attempts', () => {
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      
      const status = manager.getLockoutStatus(testUserId);
      expect(status.isLocked).toBe(true);
      expect(status.failedAttempts).toBe(3);
      expect(status.remainingAttempts).toBe(0);
      expect(status.lockedUntil).toBeDefined();
    });

    test('should not increment attempts when already locked', () => {
      // Lock the account
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      
      // Try to record more attempts
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      
      const status = manager.getLockoutStatus(testUserId);
      expect(status.failedAttempts).toBe(3); // Should stay at 3
    });

    test('should handle separate users independently', () => {
      const userId2 = 'test-user-456';
      
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(userId2);
      
      const status1 = manager.getLockoutStatus(testUserId);
      const status2 = manager.getLockoutStatus(userId2);
      
      expect(status1.failedAttempts).toBe(2);
      expect(status2.failedAttempts).toBe(1);
    });

    test('should ignore old attempts outside window', async () => {
      const quickManager = new AccountLockoutManager({
        maxAttempts: 3,
        lockoutDuration: 1000,
        attemptWindow: 100, // 100ms window
      });
      
      quickManager.recordFailedAttempt(testUserId);
      await new Promise(resolve => setTimeout(resolve, 150)); // Wait past window
      quickManager.recordFailedAttempt(testUserId);
      
      const status = quickManager.getLockoutStatus(testUserId);
      expect(status.failedAttempts).toBe(1); // Old attempt should be ignored
    });
  });

  describe('resetAttempts()', () => {
    test('should reset failed attempts to zero', () => {
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      manager.resetAttempts(testUserId);
      
      const status = manager.getLockoutStatus(testUserId);
      expect(status.failedAttempts).toBe(0);
      expect(status.remainingAttempts).toBe(3);
      expect(status.isLocked).toBe(false);
    });

    test('should unlock locked account', () => {
      // Lock account
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      
      expect(manager.getLockoutStatus(testUserId).isLocked).toBe(true);
      
      // Reset
      manager.resetAttempts(testUserId);
      
      const status = manager.getLockoutStatus(testUserId);
      expect(status.isLocked).toBe(false);
      expect(status.failedAttempts).toBe(0);
      expect(status.lockedUntil).toBeUndefined();
    });

    test('should handle resetting non-existent user', () => {
      expect(() => manager.resetAttempts('non-existent-user')).not.toThrow();
    });
  });

  describe('getLockoutStatus()', () => {
    test('should return clean status for new user', () => {
      const status = manager.getLockoutStatus('new-user');
      
      expect(status.isLocked).toBe(false);
      expect(status.failedAttempts).toBe(0);
      expect(status.remainingAttempts).toBe(3);
      expect(status.lockedUntil).toBeUndefined();
      expect(status.nextAttemptAllowedAt).toBeUndefined();
    });

    test('should return correct status after failed attempts', () => {
      manager.recordFailedAttempt(testUserId);
      const status = manager.getLockoutStatus(testUserId);
      
      expect(status.isLocked).toBe(false);
      expect(status.failedAttempts).toBe(1);
      expect(status.remainingAttempts).toBe(2);
    });

    test('should return locked status when account is locked', () => {
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      
      const status = manager.getLockoutStatus(testUserId);
      
      expect(status.isLocked).toBe(true);
      expect(status.lockedUntil).toBeInstanceOf(Date);
      expect(status.nextAttemptAllowedAt).toBeInstanceOf(Date);
    });

    test('should auto-unlock after lockout duration', async () => {
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      
      expect(manager.getLockoutStatus(testUserId).isLocked).toBe(true);
      
      // Wait for lockout to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const status = manager.getLockoutStatus(testUserId);
      expect(status.isLocked).toBe(false);
      expect(status.failedAttempts).toBe(0); // Should be reset
    });
  });

  describe('isLocked()', () => {
    test('should return false for new user', () => {
      expect(manager.isLocked('new-user')).toBe(false);
    });

    test('should return false before reaching max attempts', () => {
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      expect(manager.isLocked(testUserId)).toBe(false);
    });

    test('should return true when account is locked', () => {
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      expect(manager.isLocked(testUserId)).toBe(true);
    });

    test('should return false after lockout expires', async () => {
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      
      expect(manager.isLocked(testUserId)).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(manager.isLocked(testUserId)).toBe(false);
    });
  });

  describe('getTimeUntilUnlock()', () => {
    test('should return undefined for unlocked account', () => {
      const timeUntilUnlock = manager.getTimeUntilUnlock(testUserId);
      expect(timeUntilUnlock).toBeUndefined();
    });

    test('should return time in milliseconds for locked account', () => {
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      
      const timeUntilUnlock = manager.getTimeUntilUnlock(testUserId);
      expect(timeUntilUnlock).toBeDefined();
      expect(timeUntilUnlock).toBeGreaterThan(0);
      expect(timeUntilUnlock).toBeLessThanOrEqual(1000);
    });

    test('should decrease over time', async () => {
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      
      const time1 = manager.getTimeUntilUnlock(testUserId);
      await new Promise(resolve => setTimeout(resolve, 200));
      const time2 = manager.getTimeUntilUnlock(testUserId);
      
      expect(time2).toBeLessThan(time1!);
    });
  });

  describe('custom configuration', () => {
    test('should respect custom max attempts', () => {
      const customManager = new AccountLockoutManager({
        maxAttempts: 5,
        lockoutDuration: 1000,
      });
      
      for (let i = 0; i < 4; i++) {
        customManager.recordFailedAttempt(testUserId);
      }
      
      expect(customManager.isLocked(testUserId)).toBe(false);
      
      customManager.recordFailedAttempt(testUserId);
      expect(customManager.isLocked(testUserId)).toBe(true);
    });

    test('should respect custom lockout duration', async () => {
      const customManager = new AccountLockoutManager({
        maxAttempts: 2,
        lockoutDuration: 500, // 500ms
      });
      
      customManager.recordFailedAttempt(testUserId);
      customManager.recordFailedAttempt(testUserId);
      
      expect(customManager.isLocked(testUserId)).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      expect(customManager.isLocked(testUserId)).toBe(false);
    });

    test('should handle very short lockout duration', async () => {
      const customManager = new AccountLockoutManager({
        maxAttempts: 2,
        lockoutDuration: 100, // 100ms
      });
      
      customManager.recordFailedAttempt(testUserId);
      customManager.recordFailedAttempt(testUserId);
      
      expect(customManager.isLocked(testUserId)).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(customManager.isLocked(testUserId)).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle empty userId', () => {
      expect(() => manager.recordFailedAttempt('')).toThrow();
    });

    test('should handle concurrent failed attempts', () => {
      for (let i = 0; i < 5; i++) {
        manager.recordFailedAttempt(testUserId);
      }
      
      // Should only count attempts up to max
      const status = manager.getLockoutStatus(testUserId);
      expect(status.failedAttempts).toBeLessThanOrEqual(3);
    });

    test('should handle many users', () => {
      for (let i = 0; i < 1000; i++) {
        manager.recordFailedAttempt(`user-${i}`);
      }
      
      expect(manager.isLocked('user-500')).toBe(false);
    });
  });

  describe('realistic scenarios', () => {
    test('should handle gradual brute force attempt', () => {
      manager.recordFailedAttempt(testUserId); // Attempt 1
      expect(manager.isLocked(testUserId)).toBe(false);
      
      manager.recordFailedAttempt(testUserId); // Attempt 2
      expect(manager.isLocked(testUserId)).toBe(false);
      
      manager.recordFailedAttempt(testUserId); // Attempt 3 - locks
      expect(manager.isLocked(testUserId)).toBe(true);
      
      const status = manager.getLockoutStatus(testUserId);
      expect(status.failedAttempts).toBe(3);
      expect(status.lockedUntil).toBeDefined();
    });

    test('should handle successful login resetting attempts', () => {
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      
      // User successfully logs in
      manager.resetAttempts(testUserId);
      
      // Fresh start
      const status = manager.getLockoutStatus(testUserId);
      expect(status.failedAttempts).toBe(0);
      expect(status.remainingAttempts).toBe(3);
    });

    test('should handle mixed success/failure attempts', () => {
      manager.recordFailedAttempt(testUserId);
      manager.resetAttempts(testUserId); // Successful login
      manager.recordFailedAttempt(testUserId);
      manager.recordFailedAttempt(testUserId);
      
      const status = manager.getLockoutStatus(testUserId);
      expect(status.failedAttempts).toBe(2);
      expect(status.isLocked).toBe(false);
    });
  });
});

