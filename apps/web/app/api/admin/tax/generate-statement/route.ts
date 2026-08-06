import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { UKEarningsStatementService } from '@/lib/services/tax/UKEarningsStatementService';
import { logger } from '@mintenance/shared';

// ── Validation ──────────────────────────────────────────────────────

const generateStatementSchema = z
  .object({
    // UK tax-year START year (2025 → 2025-26).
    taxYear: z
      .number()
      .int()
      .min(2020, 'Tax year must be 2020 or later')
      .max(new Date().getFullYear(), 'Tax year cannot be in the future'),
    contractorIds: z
      .array(z.string().uuid('Each contractor ID must be a valid UUID'))
      .optional(),
  })
  .strict();

// ── POST Handler ────────────────────────────────────────────────────

/**
 * POST /api/admin/tax/generate-statement
 *
 * Generate UK annual earnings statements (6 April – 5 April) for contractors.
 * - If `contractorIds` is provided, generates for those contractors.
 * - If omitted, generates for ALL contractors with earnings in the tax year.
 *
 * Requires admin role + fresh MFA step-up. Statements carry contractor
 * earnings + identity — a stolen admin session should not fire this en masse.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'tax_statement_generate',
      category: 'revenue',
      targetType: 'tax_filing',
      description: 'Generated UK earnings statements for contractors',
    },
  },
  async (request, { user }) => {
    const validation = await validateRequest(request, generateStatementSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { taxYear, contractorIds } = validation.data;

    let idsToProcess: string[];
    if (contractorIds && contractorIds.length > 0) {
      idsToProcess = contractorIds;
    } else {
      const earners = await UKEarningsStatementService.listEarners(taxYear);
      if (earners.length === 0) {
        return NextResponse.json({
          success: true,
          message: `No contractors have earnings for tax year ${taxYear}`,
          data: { taxYear, generated: 0 },
        });
      }
      idsToProcess = earners.map((e) => e.contractorId);
    }

    logger.info('Starting earnings statement generation', {
      service: 'admin-tax',
      adminUserId: user.id,
      taxYear,
      contractorCount: idsToProcess.length,
    });

    let succeeded = 0;
    let failed = 0;
    for (const contractorId of idsToProcess) {
      try {
        const statement = await UKEarningsStatementService.getStatement(
          contractorId,
          taxYear
        );
        await UKEarningsStatementService.markGenerated(
          contractorId,
          taxYear,
          statement.totals
        );
        succeeded += 1;
      } catch (err) {
        failed += 1;
        logger.error('Failed to generate statement for contractor', err, {
          service: 'admin-tax',
          adminUserId: user.id,
          contractorId,
          taxYear,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated earnings statements for ${succeeded} contractor(s)${failed > 0 ? `, ${failed} failed` : ''}`,
      data: { taxYear, generated: succeeded, failed },
    });
  }
);
