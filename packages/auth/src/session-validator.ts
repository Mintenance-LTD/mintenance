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
  /**
   * Unix timestamp (ms) after which tokens WITHOUT sessionStart/lastActivity
   * claims are rejected (fail closed) instead of accepted (fail open).
   * Defaults to LEGACY_CLAIMS_CUTOVER_MS; primarily overridable for tests.
   * Enforcement can be pulled EARLIER via SESSION_CLAIMS_ENFORCE=true — the
   * env flag can only advance the cutover, never delay it.
   */
  legacyClaimsCutoverMs?: number;
}

/**
 * Result of session validation
 */
export interface SessionValidationResult {
  /** Whether the session is valid (within timeout limits) */
  isValid: boolean;
  /** List of timeout violations detected */
  violations: Array<
    'absolute_timeout' | 'idle_timeout' | 'missing_session_claims'
  >;
  /** Human-readable reason for validation result */
  reason: string;
  /**
   * True when the token carried no sessionStart/lastActivity claims.
   * Pre-cutover these are accepted (isValid=true) but callers should emit a
   * warning metric so we can confirm legacy tokens have aged out before the
   * cutover flips them to invalid.
   */
  legacyToken?: boolean;
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
    absoluteTimeoutMs: 12 * 60 * 60 * 1000, // 12 hours
    idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
  };

  /**
   * Hard cutover for legacy tokens without session-timeout claims.
   *
   * generateJWT stamps sessionStart/lastActivity unconditionally as of
   * 2026-07-27; access tokens live ≤1h and refresh rotation re-stamps both
   * claims, so every live token issued by the new code carries them within
   * an hour of deploy. Two weeks is a generous runway for stragglers.
   *
   * Before this instant: claim-less tokens are accepted (fail open) and
   * counted via legacyTokenCount so the fleet can confirm they aged out.
   * After it: claim-less tokens are REJECTED (fail closed) with the
   * 'missing_session_claims' violation.
   */
  static readonly LEGACY_CLAIMS_CUTOVER_MS = Date.parse('2026-08-10T00:00:00Z');

  /** Count of legacy (claim-less) tokens seen since process start. */
  private static legacyTokenCount = 0;

  /** Warning metric: how many claim-less tokens this process has validated. */
  static getLegacyTokenCount(): number {
    return this.legacyTokenCount;
  }

  /** Test hook — reset the legacy-token counter. */
  static resetLegacyTokenCount(): void {
    this.legacyTokenCount = 0;
  }

  /**
   * Resolve the effective cutover. SESSION_CLAIMS_ENFORCE=true forces
   * immediate enforcement (advances the cutover to "now"); there is
   * deliberately NO env knob to delay it past the hardcoded date.
   */
  private static resolveCutoverMs(override?: number): number {
    if (typeof override === 'number') {
      return override;
    }
    if (
      typeof process !== 'undefined' &&
      process.env?.SESSION_CLAIMS_ENFORCE === 'true'
    ) {
      return 0;
    }
    return this.LEGACY_CLAIMS_CUTOVER_MS;
  }

  /**
   * Validate session against absolute and idle timeout policies
   *
   * VULN-009: Soft enforcement - detects violations without forcing logout
   *
   * Legacy tokens (missing sessionStart/lastActivity):
   * - BEFORE LEGACY_CLAIMS_CUTOVER_MS: fail open (isValid=true) with
   *   legacyToken=true and an incremented warning counter
   * - AFTER the cutover (or with SESSION_CLAIMS_ENFORCE=true): fail closed
   *   with the 'missing_session_claims' violation
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
    const violations: Array<
      'absolute_timeout' | 'idle_timeout' | 'missing_session_claims'
    > = [];
    const now = Date.now();

    // Missing session tracking fields — legacy token issued before generateJWT
    // stamped the claims unconditionally.
    //
    // Before the cutover: accept (fail open) and count, so callers can emit a
    // warning metric and confirm legacy tokens age out.
    // After the cutover: REJECT (fail closed). A token without timeout claims
    // can never be timed out, which defeats the entire control.
    if (!payload.sessionStart || !payload.lastActivity) {
      this.legacyTokenCount += 1;
      const cutoverMs = this.resolveCutoverMs(config?.legacyClaimsCutoverMs);

      if (now >= cutoverMs) {
        return {
          isValid: false,
          violations: ['missing_session_claims'],
          reason:
            'Session timeout: missing_session_claims (token lacks session tracking; legacy cutover passed — fail closed)',
          legacyToken: true,
          metadata: {},
        };
      }

      return {
        isValid: true, // Fail open ONLY until the legacy cutover
        violations: [],
        reason: 'Session tracking not available (legacy token, pre-cutover)',
        legacyToken: true,
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
      const sessionHours = Math.floor(
        (result.metadata.sessionAgeMs || 0) / (60 * 60 * 1000)
      );
      messages.push(
        `Session exceeded maximum duration (${sessionHours} hours)`
      );
    }

    if (result.violations.includes('idle_timeout')) {
      const idleMinutes = Math.floor(
        (result.metadata.idleTimeMs || 0) / (60 * 1000)
      );
      messages.push(`Session idle for ${idleMinutes} minutes`);
    }

    if (result.violations.includes('missing_session_claims')) {
      messages.push(
        'Session was issued before timeout tracking; please sign in again'
      );
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
   * Returns Infinity if session tracking is not available AND the legacy
   * cutover has not passed; returns 0 for claim-less tokens after the cutover
   * (they are already invalid — see validateSession)
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

    // Missing session tracking: pre-cutover legacy tokens have no computable
    // expiry (Infinity); post-cutover they are already invalid (0).
    if (!payload.sessionStart || !payload.lastActivity) {
      const cutoverMs = this.resolveCutoverMs(config?.legacyClaimsCutoverMs);
      if (now >= cutoverMs) {
        return { absoluteMs: 0, idleMs: 0 };
      }
      return { absoluteMs: Infinity, idleMs: Infinity };
    }

    // Calculate time remaining before each timeout
    const absoluteMs = Math.max(
      0,
      conf.absoluteTimeoutMs - (now - payload.sessionStart)
    );
    const idleMs = Math.max(
      0,
      conf.idleTimeoutMs - (now - payload.lastActivity)
    );

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
