/**
 * Auth-side validators extracted from `services/AuthService.ts` on
 * 2026-05-09.
 *
 * Mirrors the rules in `@mintenance/auth` but without the bcryptjs
 * dependency (RN doesn't have Node's crypto module). When auth rules
 * change, update both surfaces or factor into a platform-agnostic
 * package.
 *
 * AUDIT_PUNCH_LIST P1 #15 (B2-P1-1) — three different password
 * validators were drifting (5 rules in this file, 3 in
 * ResetPasswordScreen, 1 in ServiceErrorHandler). The breakdown
 * helper below exposes per-rule state so UIs can render strength
 * indicators without re-implementing the rules; all three callers
 * now share one source of truth.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export interface PasswordStrengthBreakdown {
  hasMinLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export interface PasswordStrengthResult {
  valid: boolean;
  message?: string;
  breakdown: PasswordStrengthBreakdown;
}

/**
 * Per-rule breakdown for strength-indicator UIs. Pure inspection —
 * doesn't decide pass/fail. Use `validatePasswordStrength` to gate
 * submit; use this to render the checklist next to the input.
 */
export function getPasswordStrengthBreakdown(
  password: string
): PasswordStrengthBreakdown {
  return {
    hasMinLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[@$!%*?&]/.test(password),
  };
}

export function validatePasswordStrength(
  password: string
): PasswordStrengthResult {
  const breakdown = getPasswordStrengthBreakdown(password);

  if (!breakdown.hasMinLength) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long',
      breakdown,
    };
  }
  if (!breakdown.hasLowercase) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter',
      breakdown,
    };
  }
  if (!breakdown.hasUppercase) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter',
      breakdown,
    };
  }
  if (!breakdown.hasNumber) {
    return {
      valid: false,
      message: 'Password must contain at least one number',
      breakdown,
    };
  }
  if (!breakdown.hasSpecial) {
    return {
      valid: false,
      message: 'Password must contain at least one special character (@$!%*?&)',
      breakdown,
    };
  }
  return { valid: true, breakdown };
}
