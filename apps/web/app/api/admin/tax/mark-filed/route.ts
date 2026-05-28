import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

// ── Validation ──────────────────────────────────────────────────────

const markFiledSchema = z.object({
  contractorId: z.string().uuid('Contractor ID must be a valid UUID'),
  year: z
    .number()
    .int()
    .min(2020, 'Year must be 2020 or later')
    .max(new Date().getFullYear(), 'Year cannot be in the future'),
});

// ── POST Handler ────────────────────────────────────────────────────

/**
 * POST /api/admin/tax/mark-filed
 *
 * Mark a contractor's 1099-NEC as filed with the IRS for the given year.
 * Updates the tax_year_summaries record to set filed status and timestamp.
 *
 * Requires admin role + fresh MFA step-up (15-minute window). Marking
 * a 1099 as filed is a compliance-log state change — a stolen admin
 * session should not be able to fraudulently mark forms as filed.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 20, windowMs: 60_000 },
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'tax_1099_mark_filed',
      category: 'revenue',
      targetType: 'tax_filing',
      description: 'Marked a contractor 1099-NEC as filed',
    },
  },
  async (request, { user }) => {
    const validation = await validateRequest(request, markFiledSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { contractorId, year } = validation.data;
    const now = new Date().toISOString();

    logger.info('Marking 1099 as filed', {
      service: 'admin-tax',
      adminUserId: user.id,
      contractorId,
      year,
    });

    // `tax_year_summaries` tracks 1099 filing via `form_1099_filed`
    // (bool) + `form_1099_filed_at` (timestamp) — the same columns the
    // /api/admin/tax/summaries GET reads back. The previous update wrote
    // `filed_at` / `status`, neither of which exists on the table, so
    // the UPDATE errored and "mark as filed" never persisted.
    const { error } = await serverSupabase
      .from('tax_year_summaries')
      .update({
        form_1099_filed: true,
        form_1099_filed_at: now,
        updated_at: now,
      })
      .eq('contractor_id', contractorId)
      .eq('tax_year', year);

    if (error) {
      logger.error('Failed to mark 1099 as filed', error, {
        service: 'admin-tax',
        adminUserId: user.id,
        contractorId,
        year,
      });
      return NextResponse.json(
        { error: `Failed to mark 1099 as filed: ${error.message}` },
        { status: 500 }
      );
    }

    logger.info('1099 marked as filed successfully', {
      service: 'admin-tax',
      adminUserId: user.id,
      contractorId,
      year,
    });

    return NextResponse.json({
      success: true,
      message: `1099-NEC for contractor ${contractorId} marked as filed for ${year}`,
    });
  }
);
