import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { MessageThread } from '@mintenance/types';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { isValidUUID } from '@/lib/validation/uuid';
import {
  buildThreadParticipants,
  mapMessageRow,
  SupabaseMessageRow,
  SupabaseJobRow,
} from '@/app/api/messages/utils';
import { withApiHandler } from '@/lib/api/with-api-handler';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export const GET = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  const jobId = params.id as string;

  if (!jobId) {
    throw new BadRequestError('Thread id is required');
  }

  if (!isValidUUID(jobId)) {
    throw new BadRequestError('Invalid thread ID format');
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: url.searchParams.get('limit') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
  });

  if (!parsed.success) {
    throw new BadRequestError('Invalid query parameters');
  }

  const { limit, cursor } = parsed.data;

  let cursorIso: string | undefined;
  if (cursor) {
    const ts = Date.parse(cursor);
    if (Number.isNaN(ts)) {
      throw new BadRequestError('Invalid cursor value');
    }
    cursorIso = new Date(ts).toISOString();
  }

  // Verify user is participant via jobs table
  const { data: jobData, error: jobError } = await serverSupabase
    .from('jobs')
    .select(`
      id,
      title,
      homeowner_id,
      contractor_id,
      created_at,
      updated_at,
      homeowner:profiles!homeowner_id(id, first_name, last_name, role, email, company_name),
      contractor:profiles!contractor_id(id, first_name, last_name, role, email, company_name)
    `)
    .eq('id', jobId)
    .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`)
    .single();

  if (jobError || !jobData) {
    throw new NotFoundError('Thread not found or access denied');
  }

  const job = jobData as SupabaseJobRow;

  // Find message_thread for this job
  const { data: threadData } = await serverSupabase
    .from('message_threads')
    .select('id')
    .eq('job_id', jobId)
    .single();

  let messages: ReturnType<typeof mapMessageRow>[] = [];
  let hasMore = false;
  let nextCursorValue: string | undefined;

  // Fetch messages by job_id (actual DB schema)
  {
    let messageQuery = serverSupabase
      .from('messages')
      .select('id, job_id, sender_id, receiver_id, content, message_type, attachment_url, read, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursorIso) {
      messageQuery = messageQuery.lt('created_at', cursorIso);
    }

    const { data: messageData, error: messagesError } = await messageQuery;

    if (messagesError) {
      logger.error('Failed to load messages', messagesError, {
        service: 'messages',
        jobId,
        userId: user.id,
      });
      throw messagesError;
    }

    const rows = (messageData ?? []) as unknown as SupabaseMessageRow[];
    hasMore = rows.length > limit;
    const limitedRows = rows.slice(0, limit);
    const mappedLimited = limitedRows.map(row => mapMessageRow(row));
    nextCursorValue = hasMore ? limitedRows[limitedRows.length - 1]?.created_at : undefined;
    messages = mappedLimited.slice().reverse();
  }

  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;

  // Calculate unread count (messages not read, sent by other user)
  let unreadCount = 0;
  {
    const { data: unreadData, count } = await serverSupabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .neq('sender_id', user.id)
      .eq('read', false);

    unreadCount = count ?? 0;
  }

  const thread: MessageThread = {
    jobId: job.id,
    jobTitle: job.title ?? 'Untitled Job',
    participants: buildThreadParticipants(job),
    unreadCount,
    lastMessage: latestMessage ?? undefined,
  };

  return NextResponse.json({
    thread,
    messages,
    nextCursor: nextCursorValue,
    limit,
  });
});
