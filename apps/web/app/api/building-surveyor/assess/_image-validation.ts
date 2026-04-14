/**
 * Image URL validation for /api/building-surveyor/assess.
 *
 * Extracted from route.ts in Sprint 6.5 to keep the main file under the
 * 500-line limit.
 *
 * Two layers of defence:
 *   1. HTTPS-only (no http:// — prevents accidental plaintext exfil)
 *   2. SSRF protection — block localhost, RFC1918, AWS metadata, and
 *      *.internal / *.local DNS so a crafted URL cannot be used to probe
 *      the function's network environment.
 *
 * The host whitelist check is intentionally soft — it logs but does not
 * block — because we don't know the full set of legitimate hosts ahead of
 * time (users may paste from their own CDN).
 */

interface MinimalLogger {
  warn: (message: string, context?: Record<string, unknown>) => void;
}

/** Throws via the provided BadRequestError constructor if any URL is invalid. */
export function validateImageUrls(
  imageUrls: string[],
  {
    BadRequestError,
    logger,
    userId,
  }: {
    BadRequestError: new (msg: string) => Error;
    logger: MinimalLogger;
    userId: string;
  }
): void {
  const allowedImageHosts = [
    process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : '',
    'storage.googleapis.com',
    'images.unsplash.com',
  ].filter(Boolean);

  for (const url of imageUrls) {
    if (!url.startsWith('https://')) {
      throw new BadRequestError('Image URLs must use HTTPS');
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestError('Invalid image URL format');
    }

    const host = parsed.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === '169.254.169.254' || // AWS instance metadata
      host.endsWith('.internal') ||
      host.endsWith('.local')
    ) {
      throw new BadRequestError('Image URL points to a restricted address');
    }

    if (
      allowedImageHosts.length > 0 &&
      !allowedImageHosts.some((allowed) => host.endsWith(allowed))
    ) {
      logger.warn('Image URL from non-whitelisted host', {
        service: 'building-surveyor-api',
        host,
        userId,
      });
    }
  }
}
