import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  readCase,
  parseInput,
  replyCase,
  supportReplySchema,
} from '@/lib/services/support/SupportService';
import { ConflictError, InternalServerError } from '@/lib/errors/api-error';
export const GET = withApiHandler(
  { roles: ['admin'], requireDbAdmin: true, csrf: false },
  async (_req, { user, params }) =>
    NextResponse.json(await readCase(params.id, user.id, true))
);
export const POST = withApiHandler(
  {
    roles: ['admin'],
    logActivity: {
      actionType: 'support_reply',
      category: 'communication',
      targetType: 'support_ticket',
    },
  },
  async (req, { user, params }) =>
    NextResponse.json({
      id: await replyCase(
        params.id,
        user.id,
        parseInput(supportReplySchema, await req.json())
      ),
    })
);
const updateSchema = z
  .object({
    revision: z.number().int().positive(),
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
    assignedTo: z.string().uuid().nullable(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export const PATCH = withApiHandler(
  {
    roles: ['admin'],
    logActivity: {
      actionType: 'support_update',
      category: 'communication',
      targetType: 'support_ticket',
    },
  },
  async (req, { user, params }) => {
    const p = parseInput(updateSchema, await req.json());
    const { data, error } = await db.rpc('update_support_case', {
      p_ticket: params.id,
      p_actor: user.id,
      p_revision: p.revision,
      p_status: p.status,
      p_assigned: p.assignedTo,
      p_priority: p.priority,
      p_reason: p.reason,
    });
    if (['PT409', '40001', '23514'].includes(error?.code ?? ''))
      throw new ConflictError(
        'Case changed or the assignee is unavailable. Refresh before updating.'
      );
    if (error) throw new InternalServerError('Could not update case');
    return NextResponse.json({ ticket: data });
  }
);
