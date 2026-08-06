import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { UKEarningsStatementService } from '@/lib/services/tax/UKEarningsStatementService';
import { logger } from '@mintenance/shared';

// ── Validation ──────────────────────────────────────────────────────

const markFiledSchema = z
  .object({
    contractorId: z.string().uuid('Contractor ID must be a valid UUID'),
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
 * POST /api/admin/tax/mark-filed
 *
 * Mark a contractor's UK earnings statement as filed/submitted for the given
 * tax year. Updates tax_year_summaries.statement_filed + _at.
 *
 * Requires admin role + fresh MFA step-up (15-minute window) — a compliance
 * state change a stolen admin session must not be able to fake.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'tax_statement_mark_filed',
      category: 'revenue',
      targetType: 'tax_filing',
      description: 'Marked a contractor UK earnings statement as filed',
    },
  },
  async (request, { user }) => {
    const validation = await validateRequest(request, markFiledSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { contractorId, year } = validation.data;

    logger.info('Marking earnings statement as filed', {
      service: 'admin-tax',
      adminUserId: user.id,
      contractorId,
      year,
    });

    try {
      await UKEarningsStatementService.markFiled(contractorId, year);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Failed to mark statement as filed: ${message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Earnings statement for contractor ${contractorId} marked as filed for ${year}`,
    });
  }
);
