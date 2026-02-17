import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { isValidUUID } from '@/lib/validation/uuid';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler(
  { csrf: false },
  async (_request, { user, params }) => {
    const { id: disputeId } = params;

    // SECURITY: Validate UUID format before database query
    if (!isValidUUID(disputeId)) {
      throw new BadRequestError('Invalid dispute ID format');
    }

    // SECURITY: Fix IDOR - check ownership in query, not after fetch
    const { data: dispute, error } = await serverSupabase
      .from('escrow_payments')
      .select('id, job_id, contractor_id, client_id, amount, status, reason, description, resolution, created_at, updated_at')
      .eq('id', disputeId)
      .or(`contractor_id.eq.${user.id},client_id.eq.${user.id}${user.role === 'admin' ? ',id.neq.null' : ''}`)
      .single();

    if (error || !dispute) {
      // Don't reveal if dispute exists or not - return generic error
      throw new NotFoundError('Dispute not found or access denied');
    }

    // Additional admin check if needed
    if (user.role !== 'admin' && dispute.contractor_id !== user.id && dispute.client_id !== user.id) {
      throw new ForbiddenError('Not authorized to view this dispute');
    }

    return NextResponse.json(dispute);
  }
);
