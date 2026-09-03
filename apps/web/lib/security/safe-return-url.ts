/**
 * Accept only return URLs on an origin trusted by the current request.
 * Relative URLs resolve against the request origin; external origins are
 * rejected so payment responses cannot become open redirects.
 */
export function getSafeReturnUrl(
  candidate: string | undefined,
  requestOrigin: string,
  configuredOrigin?: string
): string | undefined {
  if (!candidate) return undefined;

  try {
    const parsed = new URL(candidate, requestOrigin);
    const trustedOrigins = new Set([new URL(requestOrigin).origin]);
    if (configuredOrigin) {
      trustedOrigins.add(new URL(configuredOrigin).origin);
    }

    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      !trustedOrigins.has(parsed.origin)
    ) {
      return undefined;
    }

    return parsed.toString();
  } catch {
    return undefined;
  }
}
