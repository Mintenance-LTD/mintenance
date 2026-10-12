import { createHash } from 'node:crypto';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { NotificationService } from './NotificationService';
import {
  BadRequestError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
} from '@/lib/errors/api-error';

export interface PhoneCallRequest {
  requestId: string;
  jobId: string;
  otherUserId: string;
  scheduledTime: string;
  purpose: 'consultation' | 'update' | 'review';
}
function notificationId(key: string) {
  const hex = createHash('sha256').update(key).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export async function schedulePhoneCall(
  userId: string,
  input: PhoneCallRequest
) {
  const scheduled = new Date(input.scheduledTime);
  if (
    !Number.isFinite(scheduled.getTime()) ||
    scheduled.getTime() <= Date.now() ||
    scheduled.getTime() > Date.now() + 180 * 86400000
  ) {
    throw new BadRequestError('Choose a future time within the next 180 days');
  }
  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select(
      'id, title, homeowner_id, payer_user_id, contractor_id, status, archived_at'
    )
    .eq('id', input.jobId)
    .maybeSingle();
  if (jobError) throw new InternalServerError('Could not check job access');
  const customers = [job?.homeowner_id, job?.payer_user_id].filter(Boolean);
  const pairAllowed =
    job?.contractor_id &&
    ((userId === job.contractor_id && customers.includes(input.otherUserId)) ||
      (input.otherUserId === job.contractor_id && customers.includes(userId)));
  if (!pairAllowed || userId === input.otherUserId)
    throw new ForbiddenError(
      'Calls are available between the assigned contractor and the job customer'
    );
  if (
    job.archived_at ||
    ['draft', 'cancelled', 'archived'].includes(job.status)
  )
    throw new BadRequestError('This job is no longer available for scheduling');
  const record = {
    id: input.requestId,
    job_id: input.jobId,
    initiator_id: userId,
    participant_id: input.otherUserId,
    title: 'Phone call',
    description: input.purpose,
    status: 'scheduled',
    type: input.purpose === 'consultation' ? 'consultation' : 'follow_up',
    scheduled_at: scheduled.toISOString(),
    metadata: { channel: 'phone', purpose: input.purpose },
  };
  const { error: insertError } = await serverSupabase
    .from('video_calls')
    .insert(record);
  if (insertError && insertError.code !== '23505')
    throw new InternalServerError('Could not save phone call');
  if (insertError) {
    const { data: existing, error } = await serverSupabase
      .from('video_calls')
      .select(
        'job_id, initiator_id, participant_id, scheduled_at, description, status, metadata'
      )
      .eq('id', input.requestId)
      .maybeSingle();
    if (error)
      throw new InternalServerError('Could not verify saved phone call');
    if (
      !existing ||
      existing.initiator_id !== userId ||
      existing.participant_id !== input.otherUserId ||
      existing.job_id !== input.jobId ||
      new Date(existing.scheduled_at).getTime() !== scheduled.getTime() ||
      existing.description !== input.purpose ||
      existing.status !== 'scheduled' ||
      existing.metadata?.channel !== 'phone'
    )
      throw new ConflictError('This request belongs to a different call');
  }
  const when = scheduled.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  // Stable IDs make retries complete partial enqueue failures without duplicating reminders.
  for (const recipient of [userId, input.otherUserId]) {
    for (const kind of ['arranged', 'reminder'] as const) {
      await NotificationService.enqueueScheduled({
        id: notificationId(
          `phone-call:${input.requestId}:${recipient}:${kind}`
        ),
        userId: recipient,
        type: 'system',
        title:
          kind === 'reminder' ? 'Phone call reminder' : 'Phone call arranged',
        message:
          kind === 'reminder'
            ? `Your phone call about "${job.title}" is due. Open the conversation and use the phone number you agreed.`
            : `Phone call about "${job.title}" arranged for ${when} (UK time). Confirm the time and phone number in your conversation.`,
        actionUrl: `/messages?jobId=${input.jobId}`,
        metadata: {
          phone_call_id: input.requestId,
          senderId: recipient === userId ? input.otherUserId : userId,
          jobTitle: job.title,
          jobId: input.jobId,
          scheduled_time: scheduled.toISOString(),
          kind,
        },
        scheduledFor: kind === 'reminder' ? scheduled : new Date(),
      });
    }
  }
  return { id: input.requestId, scheduledTime: scheduled.toISOString() };
}

/** Recheck cancellation, changed schedules and job visibility before any delivery/retry. */
export async function shouldDeliverPhoneCall(
  metadata: Record<string, unknown>,
  recipient: string
): Promise<boolean> {
  if (typeof metadata.phone_call_id !== 'string') return true;
  const { data: call, error } = await serverSupabase
    .from('video_calls')
    .select(
      'job_id, initiator_id, participant_id, status, scheduled_at, metadata'
    )
    .eq('id', metadata.phone_call_id)
    .maybeSingle();
  if (error) throw new Error('Could not verify phone call reminder');
  if (
    !call ||
    call.status !== 'scheduled' ||
    call.metadata?.channel !== 'phone' ||
    ![call.initiator_id, call.participant_id].includes(recipient)
  )
    return false;
  if (
    new Date(call.scheduled_at).getTime() !==
      new Date(String(metadata.scheduled_time)).getTime() ||
    Date.now() > new Date(call.scheduled_at).getTime() + 30 * 60000
  )
    return false;
  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('status, archived_at, contractor_id, homeowner_id, payer_user_id')
    .eq('id', call.job_id)
    .maybeSingle();
  if (jobError) throw new Error('Could not verify call job');
  return (
    !!job &&
    !job.archived_at &&
    !['draft', 'cancelled', 'archived'].includes(job.status) &&
    [call.initiator_id, call.participant_id].includes(job.contractor_id) &&
    [job.homeowner_id, job.payer_user_id].some(
      (id) => id && [call.initiator_id, call.participant_id].includes(id)
    )
  );
}
