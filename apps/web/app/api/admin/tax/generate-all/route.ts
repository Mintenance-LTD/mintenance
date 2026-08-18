import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { UKEarningsStatementService } from '@/lib/services/tax/UKEarningsStatementService';
import { logger } from '@mintenance/shared';

// ── Validation ──────────────────────────────────────────────────────

const generateAllSchema = z
  .object({
    // UK tax-year START year (2025 → 2025-26).
    year: z
      .number()
      .int()
      .min(2020, 'Year must be 2020 or later')
      .max(new Date().getFullYear(), 'Year cannot be in the future'),
  })
  .strict();

// ── POST Handler ────────────────────────────────────────────────────

/**
 * POST /api/admin/tax/generate-all
 *
 * Generate UK annual earnings statements for ALL contractors with earnings
 * in the given tax year.
 *
 * Requires admin role + fresh MFA step-up (15-minute window) — produces
 * contractor earnings + identity at scale.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 3, windowMs: 60_000 },
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'tax_statement_generate_all',
      category: 'revenue',
      targetType: 'tax_filing',
      description:
        'Triggered bulk UK earnings statement generation for all earners',
    },
  },
  async (request, { user }) => {
    const validation = await validateRequest(request, generateAllSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { year } = validation.data;

    logger.info('Starting bulk earnings statement generation', {
      service: 'admin-tax',
      adminUserId: user.id,
      year,
    });

    const earners = await UKEarningsStatementService.listEarners(year);

    if (earners.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No contractors have earnings for tax year ${year}`,
        count: 0,
      });
    }

    let succeeded = 0;
    let failed = 0;
    for (const earner of earners) {
      try {
        const statement = await UKEarningsStatementService.getStatement(
          earner.contractorId,
          year
        );
        await UKEarningsStatementService.markGenerated(
          earner.contractorId,
          year,
          statement.totals
        );
        succeeded += 1;
      } catch (err) {
        failed += 1;
        logger.error('Failed to generate statement in bulk run', err, {
          service: 'admin-tax',
          adminUserId: user.id,
          contractorId: earner.contractorId,
          year,
        });
      }
    }

    logger.info('Bulk earnings statement generation complete', {
      service: 'admin-tax',
      adminUserId: user.id,
      year,
      succeeded,
      failed,
    });

    return NextResponse.json({
      success: true,
      message: `Generated earnings statements for ${succeeded} contractor(s)${failed > 0 ? `, ${failed} failed` : ''}`,
      count: succeeded,
      failed,
    });
  }
);
