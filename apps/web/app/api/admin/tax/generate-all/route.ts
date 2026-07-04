import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { Form1099Service } from '@/lib/services/tax/Form1099Service';
import { logger } from '@mintenance/shared';

// ── Validation ──────────────────────────────────────────────────────

const generateAllSchema = z
  .object({
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
 * Trigger 1099-NEC generation for ALL eligible contractors for the given
 * tax year. Eligible means the contractor requires a 1099 but one has not
 * yet been generated.
 *
 * Requires admin role + fresh MFA step-up (15-minute window). Same
 * rationale as /api/admin/tax/generate-1099 — produces tax-authority
 * records + contractor PII at scale. A stolen admin session must not
 * be sufficient to trigger a bulk generation.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 3, windowMs: 60_000 },
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'tax_1099_generate_all',
      category: 'revenue',
      targetType: 'tax_filing',
      description:
        'Triggered bulk 1099-NEC generation for all eligible contractors',
    },
  },
  async (request, { user }) => {
    const validation = await validateRequest(request, generateAllSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { year } = validation.data;

    logger.info('Starting bulk 1099 generation', {
      service: 'admin-tax',
      adminUserId: user.id,
      year,
    });

    // Fetch all contractors who still need a 1099 for this year
    const pending = await Form1099Service.getContractorsRequiring1099(year);

    if (pending.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No contractors require 1099 generation for tax year ${year}`,
        count: 0,
      });
    }

    const contractorIds = pending.map((s) => s.contractor_id);

    // Generate 1099 data for each contractor (partial failures allowed)
    const results = await Form1099Service.generateBatch(contractorIds, year);

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info('Bulk 1099 generation complete', {
      service: 'admin-tax',
      adminUserId: user.id,
      year,
      succeeded,
      failed,
    });

    return NextResponse.json({
      success: true,
      message: `Generated 1099-NEC data for ${succeeded} contractor(s)${failed > 0 ? `, ${failed} failed` : ''}`,
      count: succeeded,
      failed,
      results,
    });
  }
);
