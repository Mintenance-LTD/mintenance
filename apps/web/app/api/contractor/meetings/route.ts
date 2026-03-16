import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const createMeetingSchema = z.object({
  title: z.string().min(1).max(500),
  client_name: z.string().max(200).optional(),
  client_email: z.string().email().optional(),
  meeting_date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  job_id: z.string().uuid().optional(),
});

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, createMeetingSchema);
    if (validation instanceof NextResponse) return validation;
    const payload = validation.data;

    const { data: meeting, error } = await serverSupabase
      .from('contractor_meetings')
      .insert({
        contractor_id: user.id,
        title: payload.title,
        client_name: payload.client_name || null,
        client_email: payload.client_email || null,
        meeting_date: payload.meeting_date,
        start_time: payload.start_time,
        end_time: payload.end_time || null,
        location: payload.location || null,
        notes: payload.notes || null,
        job_id: payload.job_id || null,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating meeting', error, { service: 'meetings', userId: user.id });
      throw new InternalServerError('Failed to create meeting');
    }

    return NextResponse.json({ meeting }, { status: 201 });
  }
);
