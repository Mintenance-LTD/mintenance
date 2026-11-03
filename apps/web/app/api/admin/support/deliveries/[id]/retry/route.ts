import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { requireSupportPermission } from '@/lib/services/support/SupportService';
import { ConflictError, InternalServerError } from '@/lib/errors/api-error';
export const POST = withApiHandler(
  {
    roles: ['admin'],
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'communication_retry',
      category: 'communication',
      targetType: 'delivery',
    },
  },
  async (_req, { user, params }) => {
    await requireSupportPermission(user.id, 'can_broadcast');
    // Only a definite pre-acceptance rejection may be retried. An unknown outcome,
    // accepted send, or provider bounce requires investigation, never blind resend.
    const { data, error } = await db
      .from('customer_communication_outbox')
      .update({
        status: 'pending',
        last_error: null,
        claimed_at: null,
        completed_at: null,
      })
      .eq('id', params.id)
      .eq('status', 'failed')
      .is('provider_id', null)
      .select('id')
      .maybeSingle();
    if (error) throw new InternalServerError('Could not retry this delivery');
    if (!data)
      throw new ConflictError(
        'This delivery needs provider review or was already retried'
      );
    return NextResponse.json({
      message: 'Delivery queued for another attempt.',
    });
  }
);
