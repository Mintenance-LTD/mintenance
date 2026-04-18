import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { Form1099Service } from '@/lib/services/tax/Form1099Service';
import { logger } from '@mintenance/shared';

// ── Validation ──────────────────────────────────────────────────────

const generate1099Schema = z.object({
  taxYear: z
    .number()
    .int()
    .min(2020, 'Tax year must be 2020 or later')
    .max(new Date().getFullYear(), 'Tax year cannot be in the future'),
  contractorIds: z
    .array(z.string().uuid('Each contractor ID must be a valid UUID'))
    .optional(),
});

// ── POST Handler ────────────────────────────────────────────────────

/**
 * POST /api/admin/tax/generate-1099
 *
 * Trigger 1099-NEC data generation for contractors.
 * - If `contractorIds` is provided, generates for those specific contractors.
 * - If omitted, generates for ALL contractors requiring a 1099 for the given year.
 *
 * Requires admin role + fresh MFA step-up (Sprint 7 / 3.1 adoption).
 * 1099 generation writes tax-authority-facing records — a stolen admin
 * session should not be able to fire this en masse.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
    requireMfaVerifiedWithinMinutes: 15,
  },
  async (request, { user }) => {
    const validation = await validateRequest(request, generate1099Schema);
    if ('headers' in validation) {
      return validation;
    }

    const { taxYear, contractorIds } = validation.data;

    // Determine the list of contractors to process
    let idsToProcess: string[];

    if (contractorIds && contractorIds.length > 0) {
      idsToProcess = contractorIds;
    } else {
      // Fetch all contractors who need a 1099 for this year
      const pending = await Form1099Service.getContractorsRequiring1099(taxYear);

      if (pending.length === 0) {
        return NextResponse.json({
          success: true,
          message: `No contractors require 1099 generation for tax year ${taxYear}`,
          data: { taxYear, generated: 0, results: [] },
        });
      }

      idsToProcess = pending.map(s => s.contractor_id);
    }

    logger.info('Starting 1099 batch generation', {
      service: 'admin-tax',
      adminUserId: user.id,
      taxYear,
      contractorCount: idsToProcess.length,
      specificIds: !!contractorIds,
    });

    // Generate 1099 data for each contractor (partial failures allowed)
    const results = await Form1099Service.generateBatch(idsToProcess, taxYear);

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info('1099 batch generation complete', {
      service: 'admin-tax',
      adminUserId: user.id,
      taxYear,
      succeeded,
      failed,
    });

    return NextResponse.json({
      success: true,
      message: `Generated 1099-NEC data for ${succeeded} contractor(s)${failed > 0 ? `, ${failed} failed` : ''}`,
      data: {
        taxYear,
        generated: succeeded,
        failed,
        results,
      },
    });
  },
);
