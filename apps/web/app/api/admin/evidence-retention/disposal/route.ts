import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';

const record = { kind: z.enum(['contract', 'dispute']), id: z.string().uuid() };
const actionSchema = z.discriminatedUnion('action', [
  z
    .object({
      ...record,
      action: z.literal('schedule'),
      revision: z.number().int().positive(),
      scheduledFor: z.string().datetime(),
      reason: z.string().trim().min(10).max(1000),
      inventoryReference: z.string().trim().min(5).max(200),
      classificationConfirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      ...record,
      action: z.literal('cancel'),
      requestId: z.string().uuid(),
    })
    .strict(),
]);

export const GET = withApiHandler(
  { roles: ['admin'], csrf: false },
  async (request, { user }) => {
    await requireAdminFromDatabase(user.id);
    const after = new URL(request.url).searchParams.get('after');
    if (after && !z.string().uuid().safeParse(after).success)
      throw new BadRequestError('Invalid queue cursor.');
    let query = serverSupabase
      .from('evidence_disposal_requests')
      .select(
        'id,record_kind,record_id,scheduled_for,status,outcome_code,finished_at,inventory_reference'
      )
      .order('id')
      .limit(51);
    if (after) query = query.gt('id', after);
    const { data, error } = await query;
    if (error)
      throw new InternalServerError('Unable to load disposal decisions.');
    const records = (data ?? []).slice(0, 50);
    return NextResponse.json({
      records,
      next: (data?.length ?? 0) > 50 ? records.at(-1)?.id : null,
    });
  }
);

export const POST = withApiHandler(
  { roles: ['admin'], requireMfaVerifiedWithinMinutes: 15 },
  async (request, { user }) => {
    await requireAdminFromDatabase(user.id);
    const parsed = actionSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success)
      throw new BadRequestError(
        'Provide a reviewed record, disposal date and classification reference.'
      );
    const d = parsed.data;
    const result =
      d.action === 'schedule'
        ? await serverSupabase.rpc('schedule_retained_evidence_disposal', {
            p_admin_id: user.id,
            p_kind: d.kind,
            p_record_id: d.id,
            p_expected_revision: d.revision,
            p_scheduled_for: d.scheduledFor,
            p_reason: d.reason,
            p_inventory_reference: d.inventoryReference,
          })
        : await serverSupabase.rpc('cancel_retained_evidence_disposal', {
            p_admin_id: user.id,
            p_kind: d.kind,
            p_record_id: d.id,
            p_request_id: d.requestId,
          });
    if (result.error?.code === 'P0002')
      throw new NotFoundError('Archived record not found.');
    if (result.error?.code === '40001')
      throw new ConflictError(
        'The review or disposal decision changed. Reload before deciding.'
      );
    if (result.error?.code === '22023')
      throw new BadRequestError(
        'Choose a disposal date at least 24 hours ahead, after any retention deadline and within ten years.'
      );
    if (
      result.error ||
      (d.action === 'cancel'
        ? result.data !== true
        : !z.string().uuid().safeParse(result.data).success)
    ) {
      throw new InternalServerError(
        'Disposal decision was not confirmed. Reload before retrying.'
      );
    }
    return NextResponse.json({
      success: true,
      ...(d.action === 'schedule' ? { requestId: result.data } : {}),
    });
  }
);
