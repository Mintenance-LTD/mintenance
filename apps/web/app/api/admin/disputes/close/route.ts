import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import { BadRequestError, ConflictError } from '@/lib/errors/api-error';

const schema = z
  .object({
    escrowId: z.string().uuid(),
    disputeId: z.string().uuid(),
    reason: z.string().trim().min(10).max(1000),
    keepAdminHold: z.literal(true),
  })
  .strict();

export const POST = withApiHandler(
  {
    roles: ['admin'],
    requireMfaVerifiedWithinMinutes: 15,
    rateLimit: { maxRequests: 10 },
  },
  async (request, { user }) => {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new BadRequestError(
        'Choose the exact case, give a reason and confirm that the administrator hold stays in place.'
      );
    await requireAdminFromDatabase(user.id);
    const { escrowId, disputeId, reason } = parsed.data;
    const { data, error } = await serverSupabase.rpc(
      'close_dispute_without_settlement',
      {
        p_admin_id: user.id,
        p_escrow_id: escrowId,
        p_dispute_id: disputeId,
        p_reason: reason,
      }
    );
    const row = Array.isArray(data) ? data[0] : null;
    if (
      error ||
      !row?.id ||
      row.escrow_id !== escrowId ||
      row.dispute_id !== disputeId ||
      row.reason !== reason
    ) {
      throw new ConflictError(
        'Closure was not confirmed. Reload the case; a settlement may already be in progress.'
      );
    }
    return NextResponse.json({
      success: true,
      escrowId,
      disputeId,
      closureId: row.id,
      closedAt: row.created_at,
    });
  }
);
