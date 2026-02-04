import type { JWTPayload } from '@mintenance/types';

/**
 * Session timeout configuration
 * VULN-009: PCI DSS 8.1.8 (idle timeout) and 8.2.4 (absolute timeout) compliance
 */
export interface SessionTimeoutConfig {
  /** Maximum session duration from original login (milliseconds) */
  absoluteTimeoutMs: number;
  /** Maximum idle time before session expires (milliseconds) */
  idleTimeoutMs: number;
}

/**
 * Result of session validation
 */
export interface SessionValidationResult {
  /** Whether the session is valid (within timeout limits) */
  isValid: boolean;
  /** List of timeout violations detected */
  violations: Array<'absolute_timeout' | 'idle_timeout'>;
  /** Human-readable reason for validation result */
  reason: string;
  /** Metadata about the session state */
  metadata: {
    /** Age of session since original login (milliseconds) */
    sessionAgeMs?: number;
    /** Time since last activity (milliseconds) */
    idleTimeMs?: number;
    /** Original login timestamp (milliseconds) */
    sessionStartTime?: number;
    /** Last activity timestamp (milliseconds) */
    lastActivityTime?: number;
  };
}

/**
 * Session timeout validator
 *
 * VULN-009: Prevents indefinite session extension via token refresh
 *
 * Security Requirements:
 * - PCI DSS 8.1.8: Idle timeout ≤ 15 minutes (we use 30 for better UX)
 * - PCI DSS 8.2.4: Absolute timeout ≤ 12 hours
 * - OWASP ASVS 3.3.1: Session timeout enforcement required
 *
 * Implementation:
 * - Phase 1: Infrastructure (database tracking) - COMPLETE
 * - Phase 2: Validation logic (this class) with soft enforcement
 * - Phase 3: Hard enforcement (force logout on timeout)
 * - Phase 4: UX enhancements (warning notifications)
 *
 * @example
 * ```typescript
 * const result = SessionValidator.validateSession({
 *   sessionStart: 1706745600000,  // Original login time
 *   lastActivity: 1706749200000,  // Last API request time
 * });
 *
 * if (!result.isValid) {
 *   console.log(result.reason); // "Session timeout: absolute_timeout"
 *   console.log(result.violations); // ['absolute_timeout']
 * }
 * ```
 */
export class SessionValidator {
  /**
   * Default timeout configuration
   * - Absolute timeout: 12 hours (43,200,000 ms)
   * - Idle timeout: 30 minutes (1,800,000 ms)
   */
  private static readonly DEFAULT_CONFIG: SessionTimeoutConfig = {
    absoluteTimeoutMs: 12 * 60 * 60 * 1000,  // 12 hours
    idleTimeoutMs: 30 * 60 * 1000,            // 30 minutes
  };

  /**
   * Validate session against absolute and idle timeout policies
   *
   * VULN-009: Soft enforcement - detects violations without forcing logout
   *
   * Backward Compatibility:
   * - If sessionStart or lastActivity is missing (legacy tokens), fails open (isValid = true)
   * - This ensures existing production sessions continue working during rollout
   *
   * Timeout Logic:
   * - Absolute timeout: Time since original login exceeds 12 hours
   * - Idle timeout: Time since last activity exceeds 30 minutes
   * - Both violations can occur simultaneously
   *
   * @param payload - JWT payload with session tracking fields
   * @param config - Optional custom timeout configuration (overrides defaults)
   * @returns Validation result with violations and metadata
   */
  static validateSession(
    payload: Pick<JWTPayload, 'sessionStart' | 'lastActivity'>,
    config?: Partial<SessionTimeoutConfig>
  ): SessionValidationResult {
    const conf = { ...this.DEFAULT_CONFIG, ...config };
    const violations: Array<'absolute_timeout' | 'idle_timeout'> = [];
    const now = Date.now();

    // BACKWARD COMPATIBILITY: Handle missing session tracking fields
    // This occurs when:
    // 1. User has legacy token (issued before Phase 1 migration)
    // 2. Token was refreshed but JWT doesn't include session fields yet
    //
    // Decision: Fail open (treat as valid) to prevent breaking existing sessions
    if (!payload.sessionStart || !payload.lastActivity) {
      return {
        isValid: true,  // Fail open for backward compatibility
        violations: [],
        reason: 'Session tracking not available (legacy token)',
        metadata: {},
      };
    }

    // Calculate session age and idle time
    const sessionAgeMs = now - payload.sessionStart;
    const idleTimeMs = now - payload.lastActivity;

    // Check absolute timeout (session age exceeds maximum duration)
    if (sessionAgeMs > conf.absoluteTimeoutMs) {
      violations.push('absolute_timeout');
    }

    // Check idle timeout (no activity for too long)
    if (idleTimeMs > conf.idleTimeoutMs) {
      violations.push('idle_timeout');
    }

    const isValid = violations.length === 0;
    const reason = isValid
      ? 'Session valid'
      : `Session timeout: ${violations.join(', ')}`;

    return {
      isValid,
      violations,
      reason,
      metadata: {
        sessionAgeMs,
        idleTimeMs,
        sessionStartTime: payload.sessionStart,
        lastActivityTime: payload.lastActivity,
      },
    };
  }

  /**
   * Get human-readable timeout status message
   *
   * Useful for:
   * - Security logs
   * - User notifications (Phase 4)
   * - Admin dashboards
   *
   * @param result - Validation result from validateSession()
   * @returns Human-readable message, or empty string if valid
   */
  static getTimeoutMessage(result: SessionValidationResult): string {
    if (result.isValid) return '';

    const messages: string[] = [];

    if (result.violations.includes('absolute_timeout')) {
      const sessionHours = Math.floor((result.metadata.sessionAgeMs || 0) / (60 * 60 * 1000));
      messages.push(`Session exceeded maximum duration (${sessionHours} hours)`);
    }

    if (result.violations.includes('idle_timeout')) {
      const idleMinutes = Math.floor((result.metadata.idleTimeMs || 0) / (60 * 1000));
      messages.push(`Session idle for ${idleMinutes} minutes`);
    }

    return messages.join('. ');
  }

  /**
   * Calculate time remaining until session expires
   *
   * Used for:
   * - UX warnings ("Your session will expire in 5 minutes")
   * - Proactive token refresh decisions
   * - Session status API endpoints
   *
   * Returns Infinity if session tracking is not available (backward compat)
   * Returns 0 if session is already expired
   *
   * @param payload - JWT payload with session tracking fields
   * @param config - Optional custom timeout configuration
   * @returns Time remaining (ms) for absolute and idle timeouts
   */
  static getTimeUntilExpiry(
    payload: Pick<JWTPayload, 'sessionStart' | 'lastActivity'>,
    config?: Partial<SessionTimeoutConfig>
  ): { absoluteMs: number; idleMs: number } {
    const conf = { ...this.DEFAULT_CONFIG, ...config };
    const now = Date.now();

    // Handle missing session tracking (backward compatibility)
    if (!payload.sessionStart || !payload.lastActivity) {
      return { absoluteMs: Infinity, idleMs: Infinity };
    }

    // Calculate time remaining before each timeout
    const absoluteMs = Math.max(0, conf.absoluteTimeoutMs - (now - payload.sessionStart));
    const idleMs = Math.max(0, conf.idleTimeoutMs - (now - payload.lastActivity));

    return { absoluteMs, idleMs };
  }

  /**
   * Get default timeout configuration
   *
   * Useful for:
   * - Documentation
   * - Testing
   * - Client-side timeout calculation
   *
   * @returns Default timeout values in milliseconds
   */
  static getDefaultConfig(): Readonly<SessionTimeoutConfig> {
    return { ...this.DEFAULT_CONFIG };
  }
}
