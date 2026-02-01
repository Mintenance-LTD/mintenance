import { SessionValidator } from '../session-validator';
import type { SessionValidationResult } from '../session-validator';

describe('SessionValidator', () => {
  const NOW = Date.now();
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  const THIRTY_MINUTES_MS = 30 * 60 * 1000;

  describe('validateSession', () => {
    it('should validate active session within timeouts', () => {
      const result = SessionValidator.validateSession({
        sessionStart: NOW - 1000,  // 1 second ago
        lastActivity: NOW - 500,   // 0.5 seconds ago
      });

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.reason).toBe('Session valid');
      expect(result.metadata.sessionAgeMs).toBe(1000);
      expect(result.metadata.idleTimeMs).toBe(500);
    });

    it('should detect absolute timeout violation (>12 hours)', () => {
      const result = SessionValidator.validateSession({
        sessionStart: NOW - (TWELVE_HOURS_MS + 1000),  // 12 hours + 1 second
        lastActivity: NOW - 500,
      });

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('absolute_timeout');
      expect(result.violations).toHaveLength(1);
      expect(result.reason).toContain('absolute_timeout');
      expect(result.metadata.sessionAgeMs).toBe(TWELVE_HOURS_MS + 1000);
    });

    it('should detect idle timeout violation (>30 minutes)', () => {
      const result = SessionValidator.validateSession({
        sessionStart: NOW - 1000,
        lastActivity: NOW - (THIRTY_MINUTES_MS + 1000),  // 30 min + 1 second
      });

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('idle_timeout');
      expect(result.violations).toHaveLength(1);
      expect(result.reason).toContain('idle_timeout');
      expect(result.metadata.idleTimeMs).toBe(THIRTY_MINUTES_MS + 1000);
    });

    it('should detect both timeout violations simultaneously', () => {
      const result = SessionValidator.validateSession({
        sessionStart: NOW - (TWELVE_HOURS_MS + 1000),
        lastActivity: NOW - (THIRTY_MINUTES_MS + 1000),
      });

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.violations).toContain('absolute_timeout');
      expect(result.violations).toContain('idle_timeout');
      expect(result.reason).toContain('absolute_timeout');
      expect(result.reason).toContain('idle_timeout');
    });

    it('should handle missing sessionStart (backward compatibility)', () => {
      const result = SessionValidator.validateSession({
        sessionStart: undefined,
        lastActivity: NOW - 500,
      });

      expect(result.isValid).toBe(true);  // Fail open for backward compatibility
      expect(result.violations).toHaveLength(0);
      expect(result.reason).toContain('legacy token');
      expect(result.metadata).toEqual({});
    });

    it('should handle missing lastActivity (backward compatibility)', () => {
      const result = SessionValidator.validateSession({
        sessionStart: NOW - 1000,
        lastActivity: undefined,
      });

      expect(result.isValid).toBe(true);  // Fail open
      expect(result.violations).toHaveLength(0);
      expect(result.reason).toContain('legacy token');
    });

    it('should handle both fields missing (backward compatibility)', () => {
      const result = SessionValidator.validateSession({
        sessionStart: undefined,
        lastActivity: undefined,
      });

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.reason).toContain('Session tracking not available');
    });

    it('should respect custom timeout configuration', () => {
      const result = SessionValidator.validateSession(
        {
          sessionStart: NOW - 1000,
          lastActivity: NOW - 500,
        },
        {
          absoluteTimeoutMs: 500,  // Very short absolute timeout
          idleTimeoutMs: 250,      // Very short idle timeout
        }
      );

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.violations).toContain('absolute_timeout');
      expect(result.violations).toContain('idle_timeout');
    });

    it('should validate session at exact timeout boundary (not expired)', () => {
      const result = SessionValidator.validateSession({
        sessionStart: NOW - TWELVE_HOURS_MS,  // Exactly 12 hours
        lastActivity: NOW - THIRTY_MINUTES_MS, // Exactly 30 minutes
      });

      expect(result.isValid).toBe(true);  // Equal to limit is valid
      expect(result.violations).toHaveLength(0);
    });

    it('should invalidate session just over timeout boundary', () => {
      const result = SessionValidator.validateSession({
        sessionStart: NOW - (TWELVE_HOURS_MS + 1),  // 1ms over 12 hours
        lastActivity: NOW - (THIRTY_MINUTES_MS + 1), // 1ms over 30 minutes
      });

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(2);
    });

    it('should include correct metadata in result', () => {
      const sessionStart = NOW - 5000;
      const lastActivity = NOW - 2000;

      const result = SessionValidator.validateSession({
        sessionStart,
        lastActivity,
      });

      expect(result.metadata.sessionStartTime).toBe(sessionStart);
      expect(result.metadata.lastActivityTime).toBe(lastActivity);
      expect(result.metadata.sessionAgeMs).toBe(5000);
      expect(result.metadata.idleTimeMs).toBe(2000);
    });
  });

  describe('getTimeoutMessage', () => {
    it('should return empty string for valid sessions', () => {
      const result = SessionValidator.validateSession({
        sessionStart: NOW - 1000,
        lastActivity: NOW - 500,
      });

      expect(SessionValidator.getTimeoutMessage(result)).toBe('');
    });

    it('should generate message for absolute timeout violation', () => {
      const result = SessionValidator.validateSession({
        sessionStart: NOW - (TWELVE_HOURS_MS + 1000),
        lastActivity: NOW - 500,
      });

      const message = SessionValidator.getTimeoutMessage(result);
      expect(message).toContain('exceeded maximum duration');
      expect(message).toContain('12 hours');
    });

    it('should generate message for idle timeout violation', () => {
      const result = SessionValidator.validateSession({
        sessionStart: NOW - 1000,
        lastActivity: NOW - (THIRTY_MINUTES_MS + 1000),
      });

      const message = SessionValidator.getTimeoutMessage(result);
      expect(message).toContain('idle');
      expect(message).toContain('30 minutes');
    });

    it('should generate message for both violations', () => {
      const result = SessionValidator.validateSession({
        sessionStart: NOW - (TWELVE_HOURS_MS + 1000),
        lastActivity: NOW - (THIRTY_MINUTES_MS + 1000),
      });

      const message = SessionValidator.getTimeoutMessage(result);
      expect(message).toContain('exceeded maximum duration');
      expect(message).toContain('idle');
      expect(message).toContain('12 hours');
      expect(message).toContain('30 minutes');
    });

    it('should calculate correct hours for absolute timeout', () => {
      const thirteenHoursMs = 13 * 60 * 60 * 1000;
      const result: SessionValidationResult = {
        isValid: false,
        violations: ['absolute_timeout'],
        reason: 'Session timeout: absolute_timeout',
        metadata: {
          sessionAgeMs: thirteenHoursMs,
          idleTimeMs: 0,
          sessionStartTime: NOW - thirteenHoursMs,
          lastActivityTime: NOW,
        },
      };

      const message = SessionValidator.getTimeoutMessage(result);
      expect(message).toContain('13 hours');
    });

    it('should calculate correct minutes for idle timeout', () => {
      const fortyMinutesMs = 40 * 60 * 1000;
      const result: SessionValidationResult = {
        isValid: false,
        violations: ['idle_timeout'],
        reason: 'Session timeout: idle_timeout',
        metadata: {
          sessionAgeMs: 0,
          idleTimeMs: fortyMinutesMs,
          sessionStartTime: NOW,
          lastActivityTime: NOW - fortyMinutesMs,
        },
      };

      const message = SessionValidator.getTimeoutMessage(result);
      expect(message).toContain('40 minutes');
    });
  });

  describe('getTimeUntilExpiry', () => {
    it('should calculate time remaining until timeouts', () => {
      const { absoluteMs, idleMs } = SessionValidator.getTimeUntilExpiry({
        sessionStart: NOW - 1000,
        lastActivity: NOW - 500,
      });

      expect(absoluteMs).toBeGreaterThan(0);
      expect(absoluteMs).toBeLessThanOrEqual(TWELVE_HOURS_MS);
      expect(idleMs).toBeGreaterThan(0);
      expect(idleMs).toBeLessThanOrEqual(THIRTY_MINUTES_MS);
    });

    it('should return Infinity for sessions without tracking', () => {
      const { absoluteMs, idleMs } = SessionValidator.getTimeUntilExpiry({
        sessionStart: undefined,
        lastActivity: undefined,
      });

      expect(absoluteMs).toBe(Infinity);
      expect(idleMs).toBe(Infinity);
    });

    it('should return 0 for expired sessions', () => {
      const { absoluteMs } = SessionValidator.getTimeUntilExpiry({
        sessionStart: NOW - (TWELVE_HOURS_MS + 1000),
        lastActivity: NOW - 500,
      });

      expect(absoluteMs).toBe(0);
    });

    it('should return 0 for idle timeout exceeded', () => {
      const { idleMs } = SessionValidator.getTimeUntilExpiry({
        sessionStart: NOW - 1000,
        lastActivity: NOW - (THIRTY_MINUTES_MS + 1000),
      });

      expect(idleMs).toBe(0);
    });

    it('should respect custom timeout configuration', () => {
      const oneHourMs = 60 * 60 * 1000;
      const tenMinutesMs = 10 * 60 * 1000;

      const { absoluteMs, idleMs } = SessionValidator.getTimeUntilExpiry(
        {
          sessionStart: NOW - 500,
          lastActivity: NOW - 250,
        },
        {
          absoluteTimeoutMs: oneHourMs,
          idleTimeoutMs: tenMinutesMs,
        }
      );

      // Should be close to custom limits
      expect(absoluteMs).toBeGreaterThan(oneHourMs - 1000);
      expect(absoluteMs).toBeLessThanOrEqual(oneHourMs);
      expect(idleMs).toBeGreaterThan(tenMinutesMs - 1000);
      expect(idleMs).toBeLessThanOrEqual(tenMinutesMs);
    });

    it('should return Infinity for missing sessionStart only', () => {
      const { absoluteMs, idleMs } = SessionValidator.getTimeUntilExpiry({
        sessionStart: undefined,
        lastActivity: NOW - 500,
      });

      expect(absoluteMs).toBe(Infinity);
      expect(idleMs).toBe(Infinity);
    });

    it('should calculate exact time remaining at boundary', () => {
      const halfwaySessionStart = NOW - (TWELVE_HOURS_MS / 2);
      const halfwayLastActivity = NOW - (THIRTY_MINUTES_MS / 2);

      const { absoluteMs, idleMs } = SessionValidator.getTimeUntilExpiry({
        sessionStart: halfwaySessionStart,
        lastActivity: halfwayLastActivity,
      });

      // Should be approximately halfway to timeout
      expect(absoluteMs).toBeGreaterThan(TWELVE_HOURS_MS / 2 - 100);
      expect(absoluteMs).toBeLessThanOrEqual(TWELVE_HOURS_MS / 2 + 100);
      expect(idleMs).toBeGreaterThan(THIRTY_MINUTES_MS / 2 - 100);
      expect(idleMs).toBeLessThanOrEqual(THIRTY_MINUTES_MS / 2 + 100);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default timeout configuration', () => {
      const config = SessionValidator.getDefaultConfig();

      expect(config.absoluteTimeoutMs).toBe(12 * 60 * 60 * 1000);
      expect(config.idleTimeoutMs).toBe(30 * 60 * 1000);
    });

    it('should return immutable configuration', () => {
      const config = SessionValidator.getDefaultConfig();
      const original = { ...config };

      // Attempt to modify (should not affect future calls)
      (config as any).absoluteTimeoutMs = 999;

      const newConfig = SessionValidator.getDefaultConfig();
      expect(newConfig.absoluteTimeoutMs).toBe(original.absoluteTimeoutMs);
    });
  });

  describe('edge cases', () => {
    it('should handle session start in the future (clock skew)', () => {
      // This shouldn't happen in normal operation, but test for robustness
      const result = SessionValidator.validateSession({
        sessionStart: NOW + 1000,  // 1 second in the future
        lastActivity: NOW - 500,
      });

      // Session age would be negative, which is never > timeout
      expect(result.isValid).toBe(true);
    });

    it('should handle lastActivity in the future (clock skew)', () => {
      const result = SessionValidator.validateSession({
        sessionStart: NOW - 1000,
        lastActivity: NOW + 500,  // 0.5 seconds in the future
      });

      // Idle time would be negative, which is never > timeout
      expect(result.isValid).toBe(true);
    });

    it('should handle zero timestamps', () => {
      const result = SessionValidator.validateSession({
        sessionStart: 0,
        lastActivity: 0,
      });

      // Age would be NOW - 0 = NOW, which exceeds both timeouts
      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(2);
    });

    it('should handle very large session age (years)', () => {
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      const result = SessionValidator.validateSession({
        sessionStart: NOW - oneYearMs,
        lastActivity: NOW - 500,
      });

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('absolute_timeout');
      expect(result.metadata.sessionAgeMs).toBe(oneYearMs);
    });

    it('should handle custom config with partial override', () => {
      const result = SessionValidator.validateSession(
        {
          sessionStart: NOW - 1000,
          lastActivity: NOW - 500,
        },
        {
          absoluteTimeoutMs: 500,  // Override only absolute timeout
          // idleTimeoutMs uses default (30 minutes)
        }
      );

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('absolute_timeout');
      expect(result.violations).not.toContain('idle_timeout');
    });

    it('should handle custom config with only idle timeout override', () => {
      const result = SessionValidator.validateSession(
        {
          sessionStart: NOW - 1000,
          lastActivity: NOW - 500,
        },
        {
          // absoluteTimeoutMs uses default (12 hours)
          idleTimeoutMs: 250,  // Override only idle timeout
        }
      );

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('idle_timeout');
      expect(result.violations).not.toContain('absolute_timeout');
    });
  });
});
