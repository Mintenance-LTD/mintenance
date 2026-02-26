import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';

/**
 * CSP Violation Report Endpoint
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * Used with Content-Security-Policy-Report-Only header to monitor
 * what would break before enforcing stricter nonce-based CSP.
 */
export const POST = withApiHandler({ auth: false, csrf: false }, async (request) => {
  try {
    const body = await request.json();
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

  return NextResponse.json({ received: true }, { status: 204 });
});
