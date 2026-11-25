import { NextResponse } from 'next/server';
import { z } from 'zod';
import { workWindowEndIsInvalid } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { isValidUUID } from '@/lib/validation/uuid';
import { validateRequest } from '@/lib/validation/validator';
import { ukDateTimeToISO } from '@/lib/scheduling/uk-date-time';

const duration = z.number().int().positive().max(2147483647).optional();
const scheduleSchema = z.union([
  z
    .object({
      scheduled_start_date: z.iso.datetime(),
      scheduled_end_date: z.iso.datetime().nullable().optional(),
      scheduled_duration_hours: duration,
    })
    .strict(),
  z
    .object({
      uk_start: z.string().length(16),
      uk_end: z.string().length(16).nullable(),
      scheduled_duration_hours: duration,
    })
    .strict(),
]);

const responseSchema = z
  .object({
    proposalId: z.uuid(),
    decision: z.enum(['accepted', 'declined', 'withdrawn']),
  })
  .strict();

type WorkWindowAction = {
  p_actor: string;
  p_job: string;
  p_start: string | null;
  p_end: string | null;
  p_duration: number | null;
  p_proposal: string | null;
  p_action: 'propose' | 'accepted' | 'declined' | 'withdrawn';
};

async function updateProposal(input: WorkWindowAction) {
  if (!isValidUUID(input.p_job)) throw new NotFoundError('Job not found');
  const { data, error } = await serverSupabase.rpc(
    'apply_job_work_window_action',
    input
  );
  if (error?.code === '42501')
    throw new ForbiddenError('Work-window proposal unavailable');
  if (error?.code === '22023') throw new BadRequestError(error.message);
  if (error?.code === '40001') {
    throw new ConflictError(
      'The work window or proposal changed. Refresh and review the latest dates.'
    );
  }
  if (error)
    throw new InternalServerError(
      'Unable to save the work-window proposal. Try again.'
    );
  return NextResponse.json({ proposal: data });
}

const writeOptions = {
  roles: ['homeowner', 'contractor'] as ('homeowner' | 'contractor')[],
  rateLimit: { maxRequests: 30 },
};
export const POST = withApiHandler(
  writeOptions,
  async (request, { user, params }) => {
    const parsed = await validateRequest(request, scheduleSchema);
    if ('headers' in parsed) return parsed;
    const values = parsed.data;
    let start: string;
    let end: string | null;
    try {
      start =
        'uk_start' in values
          ? ukDateTimeToISO(values.uk_start)
          : values.scheduled_start_date;
      end =
        'uk_end' in values
          ? values.uk_end
            ? ukDateTimeToISO(values.uk_end)
            : null
          : (values.scheduled_end_date ?? null);
    } catch (cause) {
      throw new BadRequestError(
        cause instanceof Error ? cause.message : 'Choose valid UK dates'
      );
    }
    if (workWindowEndIsInvalid(start, end))
      throw new BadRequestError('End time must be after start time.');
    return updateProposal({
      p_actor: user.id,
      p_job: params.id,
      p_start: start,
      p_end: end,
      p_duration: parsed.data.scheduled_duration_hours ?? null,
      p_proposal: null,
      p_action: 'propose',
    });
  }
);

export const PATCH = withApiHandler(
  writeOptions,
  async (request, { user, params }) => {
    const parsed = await validateRequest(request, responseSchema);
    if ('headers' in parsed) return parsed;
    return updateProposal({
      p_actor: user.id,
      p_job: params.id,
      p_start: null,
      p_end: null,
      p_duration: null,
      p_proposal: parsed.data.proposalId,
      p_action: parsed.data.decision,
    });
  }
);

export const GET = withApiHandler(
  { ...writeOptions, csrf: false },
  async (_request, { user, params }) => {
    const id = params.id;
    if (!isValidUUID(id)) throw new NotFoundError('Job not found');
    const { data: job, error } = await serverSupabase
      .from('jobs')
      .select(
        'id,homeowner_id,payer_user_id,contractor_id,status,scheduled_start_date,scheduled_end_date,scheduled_duration_hours'
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw new InternalServerError('Unable to load this work window');
    if (!job) throw new NotFoundError('Job not found');
    const allowed =
      user.role === 'contractor'
        ? job.contractor_id === user.id
        : [job.homeowner_id, job.payer_user_id].includes(user.id);
    if (!allowed) throw new ForbiddenError('Work window unavailable');

    let query = serverSupabase
      .from('job_work_window_proposals')
      .select(
        'id,proposal_by,response_by,state,starts_at,ends_at,duration_hours'
      )
      .eq('job_id', id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (user.role === 'contractor')
      query = query.or(
        'proposal_by.eq.' + user.id + ',response_by.eq.' + user.id
      );
    const { data: proposal, error: proposalError } = await query.maybeSingle();
    if (proposalError)
      throw new InternalServerError('Unable to load work-window proposals');

    return NextResponse.json(
      {
        scheduled_start_date: job.scheduled_start_date,
        scheduled_end_date: job.scheduled_end_date,
        scheduled_duration_hours: job.scheduled_duration_hours,
        active: ['assigned', 'in_progress'].includes(job.status),
        proposal: proposal
          ? {
              id: proposal.id,
              state:
                proposal.state === 'pending' &&
                Date.parse(proposal.starts_at) <= Date.now()
                  ? 'expired'
                  : proposal.state,
              startsAt: proposal.starts_at,
              endsAt: proposal.ends_at,
              durationHours: proposal.duration_hours,
              yourProposal: proposal.proposal_by === user.id,
              canRespond: proposal.response_by === user.id,
              awaitingRole:
                proposal.response_by === job.contractor_id
                  ? 'contractor'
                  : 'homeowner',
            }
          : null,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
);
