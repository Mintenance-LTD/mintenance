import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { UKEarningsStatementService } from '@/lib/services/tax/UKEarningsStatementService';
import { ukTaxYearForDate } from '@/lib/services/tax/uk-tax';
import { logger } from '@mintenance/shared';

// ── GET Handler ─────────────────────────────────────────────────────

/**
 * GET /api/contractor/tax-info/statement?year=2025
 *
 * The authenticated contractor's own UK annual earnings statement
 * (6 April – 5 April) for the given tax-year START year, as a downloadable
 * JSON document suitable for their Self Assessment.
 *
 * `year` defaults to the current UK tax year when omitted.
 *
 * Requires contractor role.
 */
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (request: NextRequest, { user }) => {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');

    const startYear = yearParam
      ? parseInt(yearParam, 10)
      : ukTaxYearForDate(new Date()).startYear;

    if (
      Number.isNaN(startYear) ||
      startYear < 2020 ||
      startYear > new Date().getFullYear()
    ) {
      return NextResponse.json(
        { error: 'Invalid year parameter' },
        { status: 400 }
      );
    }

    try {
      const statement = await UKEarningsStatementService.getStatement(
        user.id,
        startYear
      );

      return new NextResponse(JSON.stringify(statement, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="earnings-statement-${statement.taxYear}.json"`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to build contractor earnings statement', err, {
        service: 'contractor-tax',
        userId: user.id,
        startYear,
      });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
