import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  parseInput,
  requireSupportPermission,
} from '@/lib/services/support/SupportService';
import { ForbiddenError, InternalServerError } from '@/lib/errors/api-error';
const schema = z
  .object({
    adminId: z.string().uuid(),
    available: z.boolean(),
    capacity: z.number().int().min(1).max(100),
    canBroadcast: z.boolean().optional(),
  })
  .strict();
export const PATCH = withApiHandler(
  {
    roles: ['admin'],
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'support_operator_update',
      category: 'settings',
      targetType: 'support_operator',
    },
  },
  async (req, { user }) => {
    const p = parseInput(schema, await req.json());
    if (p.adminId !== user.id || p.canBroadcast !== undefined)
      await requireSupportPermission(user.id, 'can_manage_team');
    const { data: admin } = await db
      .from('profiles')
      .select('id')
      .eq('id', p.adminId)
      .eq('role', 'admin')
      .is('deleted_at', null)
      .maybeSingle();
    if (!admin)
      throw new ForbiddenError('Assignee must be an active administrator');
    const { error } = await db
      .from('support_operator_settings')
      .upsert(
        {
          admin_id: p.adminId,
          available: p.available,
          capacity: p.capacity,
          ...(p.canBroadcast !== undefined
            ? { can_broadcast: p.canBroadcast }
            : {}),
        },
        { onConflict: 'admin_id' }
      );
    if (error) throw new InternalServerError('Could not update availability');
    return NextResponse.json({ success: true });
  }
);
