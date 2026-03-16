import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const updateMeetingSchema = z.object({
  status: z.string().max(50).optional(),
  meeting_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  notes: z.string().max(5000).optional(),
  reschedule_reason: z.string().max(2000).optional(),
});

export const PATCH = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const { id } = params;

    const validation = await validateRequest(request, updateMeetingSchema);
    if (validation instanceof NextResponse) return validation;
    const payload = validation.data;

    // Verify ownership
    const { data: existing } = await serverSupabase
      .from('contractor_meetings')
      .select('id, status, meeting_date, start_time')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      throw new NotFoundError('Meeting not found');
    }

    // Build update object (only include provided fields)
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.meeting_date !== undefined) updates.meeting_date = payload.meeting_date;
    if (payload.start_time !== undefined) updates.start_time = payload.start_time;
    if (payload.end_time !== undefined) updates.end_time = payload.end_time;
    if (payload.notes !== undefined) updates.notes = payload.notes;

    const { data: meeting, error } = await serverSupabase
      .from('contractor_meetings')
      .update(updates)
      .eq('id', id)
      .eq('contractor_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating meeting', error, { service: 'meetings', userId: user.id });
      throw new InternalServerError('Failed to update meeting');
    }

    // Insert meeting_updates record for status changes or reschedules
    const isStatusChange = payload.status !== undefined && payload.status !== existing.status;
    const isReschedule = payload.meeting_date !== undefined || payload.start_time !== undefined;

    if (isStatusChange || isReschedule) {
      const updateType = isReschedule ? 'reschedule' : 'status_change';
      const oldValue = isReschedule
        ? JSON.stringify({ meeting_date: existing.meeting_date, start_time: existing.start_time })
        : existing.status;
      const newValue = isReschedule
        ? JSON.stringify({ meeting_date: payload.meeting_date || existing.meeting_date, start_time: payload.start_time || existing.start_time })
        : payload.status;

      const { error: updateError } = await serverSupabase
        .from('meeting_updates')
        .insert({
          meeting_id: id,
          update_type: updateType,
          old_value: typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue),
          new_value: typeof newValue === 'string' ? newValue : JSON.stringify(newValue),
          updated_by: user.id,
          reason: payload.reschedule_reason || null,
        });

      if (updateError) {
        logger.error('Error creating meeting update record', updateError, { service: 'meetings', meetingId: id });
        // Non-fatal: don't throw, the meeting was already updated
      }
    }

    return NextResponse.json({ meeting });
  }
);
