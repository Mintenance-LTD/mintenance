import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { RATE_LIMIT_TIERS } from '@/lib/api/rate-limit-tiers';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { UKEarningsStatementService } from '@/lib/services/tax/UKEarningsStatementService';

// -- Validation ---------------------------------------------------------------

const summariesQuerySchema = z.object({
  // UK tax-year START year (2025 → 2025-26).
  year: z.coerce
    .number()
    .int()
    .min(2020, 'Year must be 2020 or later')
    .max(
      new Date().getFullYear() + 1,
      'Year cannot be more than 1 year in the future'
    ),
  status: z
    .enum(['pending', 'generated', 'filed'], {
      errorMap: () => ({
        message: 'Status must be "pending", "generated", or "filed"',
      }),
    })
    .optional(),
  search: z.string().max(200, 'Search query too long').optional(),
});

// -- GET Handler --------------------------------------------------------------

/**
 * GET /api/admin/tax/summaries?year=2025&status=pending&search=name
 *
 * Admin dashboard: per-contractor UK earnings for a tax year (6 Apr–5 Apr),
 * with earnings-statement generated/filed state and whether the contractor's
 * tax details are complete for HMRC reporting.
 *
 *   - year (required): UK tax-year START year (e.g. 2025 for 2025-26)
 *   - status (optional): "pending" (statement not generated) | "generated"
 *     (generated, not filed) | "filed"
 *   - search (optional): partial match on contractor name/email
 *
 * Requires admin role.
 */
export const GET = withApiHandler(
  { roles: ['admin'], csrf: false, rateLimit: RATE_LIMIT_TIERS.STANDARD },
  async (request: NextRequest, { user }) => {
    const url = new URL(request.url);
    const parsed = summariesQuerySchema.safeParse({
      year: url.searchParams.get('year'),
      status: url.searchParams.get('status') || undefined,
      search: url.searchParams.get('search') || undefined,
    });

    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? 'Invalid query parameters'
      );
    }

    const { year, status, search } = parsed.data;

    try {
      let earners = await UKEarningsStatementService.listEarners(year);

      if (status === 'pending') {
        earners = earners.filter((e) => !e.statementGenerated);
      } else if (status === 'generated') {
        earners = earners.filter(
          (e) => e.statementGenerated && !e.statementFiled
        );
      } else if (status === 'filed') {
        earners = earners.filter((e) => e.statementFiled);
      }

      if (search) {
        const needle = search.toLowerCase();
        earners = earners.filter(
          (e) =>
            e.contractorName.toLowerCase().includes(needle) ||
            e.email.toLowerCase().includes(needle)
        );
      }

      earners.sort((a, b) => b.grossEarnings - a.grossEarnings);

      const stats = {
        totalContractors: earners.length,
        totalGenerated: earners.filter((e) => e.statementGenerated).length,
        totalFiled: earners.filter((e) => e.statementFiled).length,
        totalIncompleteDetails: earners.filter((e) => !e.taxDetailsComplete)
          .length,
        totalEarnings: earners.reduce((acc, e) => acc + e.grossEarnings, 0),
        totalNetPaid: earners.reduce((acc, e) => acc + e.netPaid, 0),
      };

      logger.info('Admin tax summaries fetched', {
        service: 'admin-tax',
        adminUserId: user.id,
        year,
        status: status ?? 'all',
        resultCount: earners.length,
      });

      return NextResponse.json({ summaries: earners, stats });
    } catch (err) {
      if (
        err instanceof BadRequestError ||
        err instanceof InternalServerError
      ) {
        throw err;
      }
      logger.error('Unexpected error fetching tax summaries', err, {
        service: 'admin-tax',
        adminUserId: user.id,
        year,
      });
      throw new InternalServerError('An unexpected error occurred');
    }
  }
);
