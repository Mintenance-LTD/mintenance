import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { UKEarningsStatementService } from '@/lib/services/tax/UKEarningsStatementService';
import { logger } from '@mintenance/shared';

// ── GET Handler ─────────────────────────────────────────────────────

/**
 * GET /api/admin/tax/download-statement?contractorId=...&year=...
 *
 * Download a contractor's UK annual earnings statement (6 April – 5 April)
 * for the given tax-year start year, as JSON.
 *
 * Requires admin role + fresh MFA step-up — statements carry contractor
 * earnings + identity (PII).
 */
export const GET = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
    requireMfaVerifiedWithinMinutes: 15,
  },
  async (request: NextRequest, { user }) => {
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractorId');
    const yearParam = searchParams.get('year');

    if (!contractorId || !yearParam) {
      return NextResponse.json(
        { error: 'Missing required query parameters: contractorId and year' },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam, 10);
    if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
      return NextResponse.json(
        { error: 'Invalid year parameter' },
        { status: 400 }
      );
    }

    logger.info('Downloading earnings statement', {
      service: 'admin-tax',
      adminUserId: user.id,
      contractorId,
      year,
    });

    try {
      const statement = await UKEarningsStatementService.getStatement(
        contractorId,
        year
      );

      return new NextResponse(JSON.stringify(statement, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="earnings-statement-${statement.taxYear}-${contractorId}.json"`,
        },
      });
    } catch (err) {
      logger.error('Failed to download earnings statement', err, {
        service: 'admin-tax',
        adminUserId: user.id,
        contractorId,
        year,
      });
      return NextResponse.json(
        { error: 'Failed to download earnings statement' },
        { status: 500 }
      );
    }
  }
);
