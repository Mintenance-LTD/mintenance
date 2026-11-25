import { NextResponse } from 'next/server';
import { isValidUUID } from '@/lib/validation/uuid';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { requireSupportPermission } from '@/lib/services/support/SupportService';
import { BadRequestError, InternalServerError, NotFoundError } from '@/lib/errors/api-error';
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
  async (req, { user, params }) => {
    await requireSupportPermission(user.id, 'can_broadcast');
    if (!isValidUUID(params.id)) throw new BadRequestError('Invalid draft reference');
    const { data: draft, error: readError } = await db.from('customer_campaigns')
      .select('audience').eq('id', params.id).maybeSingle();
    if (readError) throw new InternalServerError('Could not verify campaign audience');
    if (!draft) throw new NotFoundError('Campaign draft unavailable');
    if (draft.audience === 'all') {
      const confirmation = await req.json().catch(() => null);
      if (confirmation?.confirmAll !== true)
        throw new BadRequestError('Confirm the all-customer audience before queueing.');
    }
    const { data, error } = await db.rpc('publish_customer_campaign', {
      p_campaign: params.id,
      p_actor: user.id,
    });
    if (error) throw new InternalServerError('Could not queue communication');
    return NextResponse.json({
      queued: data,
      message:
        data === 0 ? 'No new deliveries queued. The draft may already be queued or recipients may no longer be eligible.'
          : String(data) + ' deliveries queued. Check delivery history for provider acceptance and delivery.',
    });
  }
);
