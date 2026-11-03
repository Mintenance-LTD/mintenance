import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  parseInput,
  requireSupportPermission,
} from '@/lib/services/support/SupportService';
import { NotFoundError, InternalServerError } from '@/lib/errors/api-error';
const schema = z
  .object({
    email: z.string().email().max(254),
    approved: z.boolean(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export const POST = withApiHandler(
  {
    roles: ['admin'],
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'mobile_beta_access_update',
      category: 'user_management',
      targetType: 'beta_access',
    },
  },
  async (req, { user }) => {
    await requireSupportPermission(user.id, 'can_manage_team');
    const p = parseInput(schema, await req.json());
    const { data: profile, error: lookupError } = await db
      .from('profiles')
      .select('id')
      .eq('email', p.email.trim().toLowerCase())
      .is('deleted_at', null)
      .maybeSingle();
    if (lookupError) throw new InternalServerError('Could not look up account');
    if (!profile) throw new NotFoundError('Account not found');
    const { error } = await db
      .from('mobile_beta_access_grants')
      .upsert(
        {
          user_id: profile.id,
          approved: p.approved,
          updated_by: user.id,
          reason: p.reason,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) throw new InternalServerError('Could not update beta access');
    return NextResponse.json({
      approved: p.approved,
      message:
        'Mobile beta access updated. Email verification and account permissions still apply.',
    });
  }
);
