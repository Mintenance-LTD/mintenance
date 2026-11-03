import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { requireSupportPermission } from '@/lib/services/support/SupportService';
import { InternalServerError } from '@/lib/errors/api-error';
export const POST = withApiHandler(
  {
    roles: ['admin'],
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'communication_publish',
      category: 'communication',
      targetType: 'campaign',
    },
  },
  async (_req, { user, params }) => {
    await requireSupportPermission(user.id, 'can_broadcast');
    const { data, error } = await db.rpc('publish_customer_campaign', {
      p_campaign: params.id,
      p_actor: user.id,
    });
    if (error) throw new InternalServerError('Could not queue communication');
    return NextResponse.json({
      queued: data,
      message:
        'Queued for delivery. Provider acceptance and delivery are separate states.',
    });
  }
);
