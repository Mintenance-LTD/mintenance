import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError, BadRequestError } from '@/lib/errors/api-error';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

// GET: Fetch all time entries for the contractor
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_request, { user }) => {
    const { data: entries, error } = await serverSupabase
      .from('contractor_time_entries')
      .select(`
        id, job_id, task_description, date, start_time, end_time,
        duration_minutes, hourly_rate, is_billable, status, notes, created_at,
        job:jobs!contractor_time_entries_job_id_fkey(id, title)
      `)
      .eq('contractor_id', user.id)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) {
      logger.error('Error fetching time entries', error, { service: 'time-tracking', userId: user.id });
      throw new InternalServerError('Failed to fetch time entries');
    }

    const mapped = (entries || []).map((e: Record<string, unknown>) => {
      const job = e.job as Record<string, unknown> | null;
      return {
        id: e.id,
        jobId: e.job_id,
        jobTitle: job?.title || 'No Job',
        taskDescription: e.task_description || '',
        date: e.date,
        startTime: e.start_time,
        endTime: e.end_time || null,
        duration: Number(e.duration_minutes || 0),
        hourlyRate: Number(e.hourly_rate || 0),
        isBillable: e.is_billable ?? true,
        status: e.status,
        notes: e.notes || null,
        createdAt: e.created_at,
      };
    });

    return NextResponse.json({ entries: mapped });
  }
);

const createEntrySchema = z.object({
  jobId: z.string().uuid().optional(),
  taskDescription: z.string().min(1).max(500),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().optional(),
  durationMinutes: z.number().int().min(0),
  hourlyRate: z.number().min(0).optional(),
  isBillable: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

// POST: Create a new time entry
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const validation = await validateRequest(request, createEntrySchema);
    if (validation instanceof NextResponse) return validation;

    const d = validation.data;

    const { data: entry, error } = await serverSupabase
      .from('contractor_time_entries')
      .insert({
        contractor_id: user.id,
        job_id: d.jobId || null,
        task_description: d.taskDescription,
        date: d.date,
        start_time: d.startTime,
        end_time: d.endTime || null,
        duration_minutes: d.durationMinutes,
        hourly_rate: d.hourlyRate || 0,
        is_billable: d.isBillable ?? true,
        notes: d.notes || null,
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Error creating time entry', error, { service: 'time-tracking', userId: user.id });
      throw new InternalServerError('Failed to create time entry');
    }

    return NextResponse.json({ entry }, { status: 201 });
  }
);

// DELETE: Remove a time entry
export const DELETE = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) throw new BadRequestError('Missing time entry id');

    const { data: existing } = await serverSupabase
      .from('contractor_time_entries')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    const { error } = await serverSupabase
      .from('contractor_time_entries')
      .delete()
      .eq('id', id)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error('Error deleting time entry', error, { service: 'time-tracking', userId: user.id });
      throw new InternalServerError('Failed to delete time entry');
    }

    return NextResponse.json({ success: true });
  }
);

// PATCH: Update a time entry
export const PATCH = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) throw new BadRequestError('Missing time entry id');

    const { data: existing } = await serverSupabase
      .from('contractor_time_entries')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.jobId !== undefined) dbUpdates.job_id = updates.jobId;
    if (updates.taskDescription !== undefined) dbUpdates.task_description = updates.taskDescription;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.durationMinutes !== undefined) dbUpdates.duration_minutes = updates.durationMinutes;
    if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;
    if (updates.isBillable !== undefined) dbUpdates.is_billable = updates.isBillable;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await serverSupabase
      .from('contractor_time_entries')
      .update(dbUpdates)
      .eq('id', id)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error('Error updating time entry', error, { service: 'time-tracking', userId: user.id });
      throw new InternalServerError('Failed to update time entry');
    }

    return NextResponse.json({ success: true });
  }
);
