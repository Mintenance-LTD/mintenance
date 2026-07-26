/**
 * Pure helpers for the homeowner phone-verification gate.
 *
 * POST /api/jobs 403s with "Phone verification required. Please verify
 * your phone number before posting jobs" for homeowners whose
 * profiles.phone_verified is false (the gate is unconditionally
 * enforced in production — see apps/web/app/api/jobs/route.ts). The
 * web client catches that message and redirects to /settings; mobile
 * intercepts it with these helpers and opens PhoneVerificationModal
 * instead of a dead-end alert.
 */

/**
 * True when an error thrown by a job-posting call is the homeowner
 * phone-verification 403. Matches on message text because every layer
 * between the API and the screens (ApiClient envelope parsing,
 * ServiceErrorHandler.executeOperation, submitQuickJob's result
 * object) preserves the message but not the status code.
 */
export function isPhoneVerificationError(error: unknown): boolean {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : error && typeof error === 'object'
          ? String((error as { message?: unknown }).message ?? '')
          : '';
  return /phone verification required|verify your phone/i.test(message);
}

/**
 * Normalize a user-typed phone number toward the international format
 * the verify-phone route requires (`+[1-9]\d{4,14}` after stripping
 * separators). UK-first because that's the platform's market:
 *   "07984 596545"  -> "+447984596545"
 *   "447984596545"  -> "+447984596545"
 *   "+44 7984..."   -> "+447984..."
 * Anything already starting with "+" is passed through (minus
 * separators) so non-UK numbers still work. Returns the cleaned
 * string; server-side Zod remains the source of truth for validity.
 */
export function normalizePhoneNumber(input: string): string {
  const cleaned = input.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (/^0\d{10}$/.test(cleaned)) return `+44${cleaned.slice(1)}`;
  if (/^44\d{10}$/.test(cleaned)) return `+${cleaned}`;
  return cleaned;
}

/** Client-side plausibility check mirroring the route's Zod refine. */
export function isPlausiblePhoneNumber(input: string): boolean {
  return /^\+[1-9]\d{4,14}$/.test(normalizePhoneNumber(input));
}
