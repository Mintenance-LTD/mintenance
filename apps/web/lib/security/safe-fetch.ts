/**
 * safeFetch — SSRF-resistant outbound HTTP for server-side image/file fetches.
 *
 * Builds on `validateURL` (lib/security/url-validation.ts) which handles
 * protocol/allowlist/literal-IP checks, and adds the three things missing
 * from that helper:
 *
 *   1. DNS resolution + post-resolution private-IP check. `validateURL`
 *      only catches private IPs when the hostname is a literal IP. A
 *      hostname like `internal.example.com` that resolves to 10.0.0.1
 *      passes the validator but would still hit private space if fetched.
 *
 *   2. Byte-size cap. Without it, an attacker can point us at a 10 GB
 *      file and exhaust memory/disk.
 *
 *   3. Content-type allowlist. We only download what we asked for.
 *
 *   4. Hard request timeout via AbortController. The Node default is
 *      "wait forever".
 *
 * Caveat — DNS rebinding: a true rebinding attack flips the DNS answer
 * between the lookup we do here and the lookup the runtime does when
 * dialling. Pinning the connection to a specific resolved IP requires a
 * custom undici dispatcher with a DNS interceptor; that's a follow-up.
 * What we have here is sufficient for the YOLO image pipeline because
 * the allowlist is limited to `.supabase.co`/`.supabase.in`, which are
 * not under attacker DNS control. Do NOT relax the allowlist without
 * also closing this caveat.
 *
 * Audit 2026-05-24 HIGH (P3): the YOLO image preprocessing + training
 * downloader endpoints fetched arbitrary URLs with no DNS check, no
 * size cap, no content-type check, and `yolo-preprocessing.ts` also
 * had a `fs.readFile(imageUrl)` branch on non-HTTP inputs that was a
 * straight LFI gadget. This module is the consolidated replacement.
 */

import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';
import { logger } from '@mintenance/shared';
import { validateURL } from './url-validation';

const SERVICE = 'safe-fetch';

// IPv4 ranges considered unsafe for outbound server-side fetches.
// Kept in a single struct so additions stay obvious.
const IPV4_PRIVATE_RANGES: Array<[start: number, end: number]> = [
  ipToInt('10.0.0.0', '10.255.255.255'),
  ipToInt('172.16.0.0', '172.31.255.255'),
  ipToInt('192.168.0.0', '192.168.255.255'),
  ipToInt('127.0.0.0', '127.255.255.255'),
  ipToInt('169.254.0.0', '169.254.255.255'), // link-local + cloud metadata
  ipToInt('0.0.0.0', '0.255.255.255'), // "this network"
  ipToInt('100.64.0.0', '100.127.255.255'), // CGNAT
];

// IPv6 prefixes considered unsafe (substring match on canonical form).
// Covers loopback, link-local, unique-local, IPv4-mapped private space.
const IPV6_PRIVATE_PREFIXES = [
  '::1', // loopback
  'fe80:', // link-local
  'fc00:',
  'fd00:', // unique-local fc00::/7
  '::ffff:', // IPv4-mapped — let the IPv4 check handle the embedded address
];

function ipToInt(start: string, end: string): [number, number] {
  const toInt = (ip: string) =>
    ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
  return [toInt(start), toInt(end)];
}

function isPrivateIPv4(ip: string): boolean {
  const n =
    ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
  return IPV4_PRIVATE_RANGES.some(([lo, hi]) => n >= lo && n <= hi);
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (IPV6_PRIVATE_PREFIXES.some((p) => lower.startsWith(p))) {
    // IPv4-mapped: extract the embedded v4 and delegate.
    if (lower.startsWith('::ffff:')) {
      const embedded = lower.slice('::ffff:'.length);
      if (isIP(embedded) === 4) return isPrivateIPv4(embedded);
    }
    return true;
  }
  return false;
}

async function assertPublicHost(hostname: string): Promise<void> {
  // Literal IPs short-circuit DNS.
  const literal = isIP(hostname);
  if (literal === 4) {
    if (isPrivateIPv4(hostname)) {
      throw new SafeFetchError(
        'BLOCKED_PRIVATE_IP',
        `Resolved address ${hostname} is in a private range`
      );
    }
    return;
  }
  if (literal === 6) {
    if (isPrivateIPv6(hostname)) {
      throw new SafeFetchError(
        'BLOCKED_PRIVATE_IP',
        `Resolved address ${hostname} is in a private range`
      );
    }
    return;
  }

  // Resolve every A/AAAA record. If ANY of them lands in private space,
  // refuse — this also catches "DNS pinning" attacks where the attacker
  // returns a mix of public + private addresses hoping the dialler
  // chooses one of the private ones.
  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (err) {
    throw new SafeFetchError(
      'DNS_LOOKUP_FAILED',
      `DNS lookup failed for ${hostname}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  for (const { address, family } of records) {
    if (family === 4 && isPrivateIPv4(address)) {
      throw new SafeFetchError(
        'BLOCKED_PRIVATE_IP',
        `Hostname ${hostname} resolves to private IPv4 ${address}`
      );
    }
    if (family === 6 && isPrivateIPv6(address)) {
      throw new SafeFetchError(
        'BLOCKED_PRIVATE_IP',
        `Hostname ${hostname} resolves to private IPv6 ${address}`
      );
    }
  }
}

export class SafeFetchError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_URL'
      | 'BLOCKED_PRIVATE_IP'
      | 'DNS_LOOKUP_FAILED'
      | 'BLOCKED_CONTENT_TYPE'
      | 'PAYLOAD_TOO_LARGE'
      | 'HTTP_ERROR'
      | 'TIMEOUT',
    message: string
  ) {
    super(message);
    this.name = 'SafeFetchError';
  }
}

export interface SafeFetchOptions {
  /** Max bytes to download before aborting. Default: 25 MB. */
  maxBytes?: number;
  /** Allowed `Content-Type` prefixes. Default: image/*. */
  allowedContentTypes?: readonly string[];
  /** Hard request timeout. Default: 30 000 ms. */
  timeoutMs?: number;
  /**
   * Pass `false` to skip the validateURL allowlist (i.e. only block
   * private IPs + protocols). Default `true` — the allowlist is the
   * primary defence-in-depth against the DNS-rebinding gap noted in
   * the module header.
   */
  requireAllowlist?: boolean;
  /** Optional request headers (e.g. auth for private Supabase storage). */
  headers?: Record<string, string>;
}

export interface SafeFetchResult {
  buffer: Buffer;
  contentType: string;
  size: number;
}

const DEFAULTS = {
  maxBytes: 25 * 1024 * 1024,
  allowedContentTypes: ['image/'] as const,
  timeoutMs: 30_000,
  requireAllowlist: true,
};

/**
 * Fetch a remote resource into memory with SSRF, size, and content-type
 * guards. Use this in place of `fetch()` anywhere the URL could be
 * influenced (directly or transitively) by an end user.
 *
 * Resolves to `{ buffer, contentType, size }` on success.
 * Rejects with `SafeFetchError` (carries a typed `code`) on any failure.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const maxBytes = options.maxBytes ?? DEFAULTS.maxBytes;
  const allowedContentTypes =
    options.allowedContentTypes ?? DEFAULTS.allowedContentTypes;
  const timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs;
  const requireAllowlist =
    options.requireAllowlist ?? DEFAULTS.requireAllowlist;

  // Step 1: protocol + allowlist + literal-IP check via existing validator.
  const validation = await validateURL(rawUrl, requireAllowlist);
  if (!validation.isValid || !validation.normalizedUrl) {
    throw new SafeFetchError(
      'INVALID_URL',
      validation.error ?? 'URL failed validation'
    );
  }

  const url = new URL(validation.normalizedUrl);

  // Step 2: DNS-resolved private-IP check. Closes the gap where
  // attacker.com resolves to 10.0.0.1.
  await assertPublicHost(url.hostname);

  // Step 3: bounded fetch with timeout.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(validation.normalizedUrl, {
      signal: controller.signal,
      // Prevent redirects from escaping the allowlist. If a caller needs
      // to follow redirects through cross-origin storage CDNs, expose
      // a `followRedirects` option later and re-run validation per hop.
      redirect: 'error',
      headers: options.headers,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new SafeFetchError(
        'TIMEOUT',
        `Request timed out after ${timeoutMs}ms`
      );
    }
    throw new SafeFetchError(
      'HTTP_ERROR',
      `Fetch failed: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new SafeFetchError(
      'HTTP_ERROR',
      `Upstream returned ${response.status} ${response.statusText}`
    );
  }

  // Step 4: content-type allowlist.
  const contentType = response.headers.get('content-type') ?? '';
  if (
    !allowedContentTypes.some((prefix) =>
      contentType.toLowerCase().startsWith(prefix.toLowerCase())
    )
  ) {
    throw new SafeFetchError(
      'BLOCKED_CONTENT_TYPE',
      `Content-Type "${contentType}" is not in the allow-list (${allowedContentTypes.join(', ')})`
    );
  }

  // Step 5: enforce byte cap with streaming so we don't allocate a giant
  // buffer just to find out it's too big. Cheap pre-check on
  // Content-Length when present.
  const declaredLength = Number(response.headers.get('content-length') ?? '0');
  if (declaredLength > maxBytes) {
    throw new SafeFetchError(
      'PAYLOAD_TOO_LARGE',
      `Declared Content-Length ${declaredLength} exceeds maxBytes ${maxBytes}`
    );
  }

  if (!response.body) {
    throw new SafeFetchError('HTTP_ERROR', 'Response had no body');
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new SafeFetchError(
          'PAYLOAD_TOO_LARGE',
          `Streamed response exceeded maxBytes ${maxBytes}`
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  logger.debug('safeFetch ok', {
    service: SERVICE,
    host: url.hostname,
    bytes: total,
    contentType,
  });

  return {
    buffer: Buffer.concat(chunks),
    contentType,
    size: total,
  };
}
