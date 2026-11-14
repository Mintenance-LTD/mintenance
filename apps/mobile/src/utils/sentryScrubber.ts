// Mirrored from packages/shared/src/logger.ts redaction list. Any
// object key matching one of these (case-insensitive) is replaced
// with '[REDACTED]' before the event / breadcrumb is shipped to
// Sentry. Keeps secrets out of third-party observability even if a
// caller accidentally extras them into a breadcrumb payload.
const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /bearer/i,
  /jwt/i,
  /api[_-]?key/i,
  /mfa/i,
  /totp/i,
  /^stripe_/i,
  /auth[_-]?tag/i,
  /^iv$/i,
  /credit[_-]?card/i,
  /^cc[_-]?num/i,
  /tax[_-]?id/i,
  /national[_-]?insurance/i,
  /dob|date[_-]?of[_-]?birth/i,
];

const JWT_SHAPE =
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;
const CC_NUMBER_SHAPE = /\b(?:\d[ -]?){13,19}\b/g;

export function scrubString(value: string): string {
  return value
    .replace(JWT_SHAPE, '[REDACTED_JWT]')
    .replace(CC_NUMBER_SHAPE, (match) => {
      // CC-number regex overlaps with phone numbers and IDs — only
      // redact when the digit count matches a real card (13–19 digits).
      const digits = match.replace(/[^0-9]/g, '');
      if (digits.length >= 13 && digits.length <= 19) {
        return '[REDACTED_CC]';
      }
      return match;
    });
}

export function scrubValue(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  // Never send unsanitized deep or cyclic values to the reporting provider.
  if (depth > 6) return '[TRUNCATED]';
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const entries: [string, unknown][] = [];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      entries.push([k, SENSITIVE_KEY_PATTERNS.some((re) => re.test(k))
        ? '[REDACTED]'
        : scrubValue(v, depth + 1)]);
    }
    // Define own data properties without invoking inherited property setters.
    return Object.fromEntries(entries);
  }
  return value;
}
