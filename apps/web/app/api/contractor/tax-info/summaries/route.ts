import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError } from '@/lib/errors/api-error';
import {
  UKEarningsStatementService,
  type UKEarningsStatement,
} from '@/lib/services/tax/UKEarningsStatementService';
import { ukTaxYearForDate } from '@/lib/services/tax/uk-tax';

// -- GET Handler --------------------------------------------------------------

/**
 * GET /api/contractor/tax-info/summaries
 *
 * The authenticated contractor's UK annual earnings, one entry per UK tax
 * year (6 April – 5 April) in which they have released earnings. Each entry
 * carries the per-payment breakdown for their Self Assessment.
 *
 * Requires contractor role.
 */
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_request, { user }) => {
    try {
      // Determine which UK tax years this contractor has released earnings in.
      const { data: releasedRows, error } = await serverSupabase
        .from('escrow_transactions')
        .select('released_at')
        .eq('payee_id', user.id)
        .in('status', ['completed', 'released'])
        .not('released_at', 'is', null);

      if (error) {
        logger.error('Failed to fetch contractor released escrows', error, {
          service: 'contractor-tax',
          userId: user.id,
        });
        throw new InternalServerError('Failed to fetch tax summaries');
      }

      const startYears = new Set<number>();
      for (const row of releasedRows ?? []) {
        if (!row.released_at) continue;
        startYears.add(ukTaxYearForDate(new Date(row.released_at)).startYear);
      }

      if (startYears.size === 0) {
        return NextResponse.json({ summaries: [] });
      }

      const statements: UKEarningsStatement[] = await Promise.all(
        [...startYears]
          .sort((a, b) => b - a)
          .map((y) => UKEarningsStatementService.getStatement(user.id, y))
      );

      const summaries = statements.map((s) => ({
        taxYear: s.taxYear,
        startYear: s.startYear,
        periodStart: s.periodStart,
        periodEnd: s.periodEnd,
        grossEarnings: s.totals.grossEarnings,
        platformFees: s.totals.platformFees,
        stripeFees: s.totals.stripeFees,
        netPaid: s.totals.netPaid,
        jobCount: s.totals.jobCount,
        payments: s.payments,
      }));

      return NextResponse.json({ summaries });
    } catch (err) {
      if (err instanceof InternalServerError) throw err;
      logger.error('Unexpected error fetching contractor tax summaries', err, {
        service: 'contractor-tax',
        userId: user.id,
      });
      throw new InternalServerError('An unexpected error occurred');
    }
  }
);
