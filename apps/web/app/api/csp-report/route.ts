import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';

/**
 * CSP Violation Report Endpoint
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * Used with Content-Security-Policy-Report-Only header to monitor
 * what would break before enforcing stricter nonce-based CSP.
 *
 * Rate-limited to 100 reports/minute per IP so an attacker can't flood
 * our logs with garbage CSP reports. Legitimate browsers rarely emit
 * more than a handful per page load.
 *
 * Also enforces a hard body-size cap (8KB) — real CSP reports are small,
 * and unbounded reads are a trivial memory-pressure surface.
 */
const MAX_REPORT_BYTES = 8 * 1024; // 8KB

export const POST = withApiHandler(
  {
    auth: false,
    csrf: false,
    rateLimit: { maxRequests: 100, windowMs: 60_000 },
  },
  async (request) => {
    try {
      const raw = await request.text();
      if (raw.length > MAX_REPORT_BYTES) {
        // Too large — reject without parsing; still return 204 to avoid
        // giving a probe-friendly error distinguishing "too big" from "valid".
        return new NextResponse(null, { status: 204 });
      }

      const body = JSON.parse(raw);
      const report = body['csp-report'] || body;

      logger.warn('CSP Violation Report', {
        service: 'csp-report',
        blockedUri: report['blocked-uri'],
        violatedDirective: report['violated-directive'],
        documentUri: report['document-uri'],
        sourceFile: report['source-file'],
        lineNumber: report['line-number'],
      });
    } catch {
      // Silently accept malformed reports
    }

    return new NextResponse(null, { status: 204 });
  }
);
