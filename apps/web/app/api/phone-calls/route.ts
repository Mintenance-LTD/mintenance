import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  InternalServerError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';
import { schedulePhoneCall } from '@/lib/services/notifications/PhoneCallService';
const schema = z
  .object({
    requestId: z.string().uuid(),
    jobId: z.string().uuid(),
    otherUserId: z.string().uuid(),
    scheduledTime: z.string().datetime(),
    purpose: z.enum(['consultation', 'update', 'review']),
  })
  .strict();
export const POST = withApiHandler({}, async (request, { user }) => {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    throw new BadRequestError('Check the call participants and scheduled time');
  return NextResponse.json(await schedulePhoneCall(user.id, parsed.data));
});

export const GET = withApiHandler(
  { csrf: false },
  async (request, { user }) => {
    const jobId = new URL(request.url).searchParams.get('jobId');
    if (!z.string().uuid().safeParse(jobId).success)
      throw new BadRequestError('A valid job is required');
    const { data, error } = await serverSupabase
      .from('video_calls')
      .select('id, scheduled_at, description')
      .eq('job_id', jobId!)
      .eq('status', 'scheduled')
      .eq('metadata->>channel', 'phone')
      .or(`initiator_id.eq.${user.id},participant_id.eq.${user.id}`)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(30);
    if (error) throw new InternalServerError('Could not load arranged calls');
    return NextResponse.json({ calls: data ?? [] });
  }
);
export const DELETE = withApiHandler({}, async (request, { user }) => {
  const id = new URL(request.url).searchParams.get('id');
  if (!z.string().uuid().safeParse(id).success)
    throw new BadRequestError('A valid call is required');
  const { data, error } = await serverSupabase
    .from('video_calls')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id!)
    .in('status', ['scheduled', 'cancelled'])
    .eq('metadata->>channel', 'phone')
    .or(`initiator_id.eq.${user.id},participant_id.eq.${user.id}`)
    .select('id')
    .maybeSingle();
  if (error) throw new InternalServerError('Could not cancel phone call');
  if (!data) throw new NotFoundError('Phone call not found');
  return NextResponse.json({ cancelled: true });
});
