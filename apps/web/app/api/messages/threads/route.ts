import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import {
  buildThreadParticipants,
  normalizeMessageType,
  SupabaseJobRow,
  toTimestamp,
} from '@/app/api/messages/utils';
import { withApiHandler } from '@/lib/api/with-api-handler';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

interface LastMessageInfo {
  content: string;
  messageText: string;
  messageType: string;
  createdAt: string;
}

interface ThreadWithActivity {
  jobId: string;
  jobTitle: string;
  participants: Array<{ id: string; name: string; role: string }>;
  unreadCount: number;
  lastMessage?: LastMessageInfo;
  lastActivity: number;
}

export const GET = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user }) => {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: url.searchParams.get('limit') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
  });

  if (!parsed.success) {
    throw new BadRequestError('Invalid query parameters');
  }

  const { limit, cursor } = parsed.data;

  let cursorTimestamp: number | undefined;
  if (cursor) {
    const ts = Date.parse(cursor);
    if (Number.isNaN(ts)) {
      throw new BadRequestError('Invalid cursor value');
    }
    cursorTimestamp = ts;
  }

  const fetchLimit = Math.min(limit * 3, 150);

  // Get jobs where user is homeowner or contractor
  const { data: jobsData, error: jobsError } = await serverSupabase
    .from('jobs')
    .select(`
      id,
      title,
      homeowner_id,
      contractor_id,
      created_at,
      updated_at,
      homeowner:profiles!homeowner_id(id, first_name, last_name, role, email, company_name, profile_image_url),
      contractor:profiles!contractor_id(id, first_name, last_name, role, email, company_name, profile_image_url)
    `)
    .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })
    .limit(fetchLimit);

  if (jobsError) {
    logger.error('Failed to load message threads - jobs query failed', jobsError, {
      service: 'messages',
      userId: user.id,
    });
  }

  const jobRows = (jobsData ?? []) as SupabaseJobRow[];
  if (jobRows.length === 0) {
    return NextResponse.json({ threads: [], nextCursor: undefined, limit });
  }

  const jobIds = jobRows.map((job) => job.id);

  // Get message_threads for these jobs to find thread IDs
  const { data: messageThreadsData } = await serverSupabase
    .from('message_threads')
    .select('id, job_id, last_message_at')
    .in('job_id', jobIds);

  // Build thread_id → job_id mapping
  const threadToJob = new Map<string, string>();
  const jobToThread = new Map<string, string>();
  if (messageThreadsData) {
    for (const t of messageThreadsData) {
      if (t.job_id && t.id) {
        threadToJob.set(t.id, t.job_id);
        jobToThread.set(t.job_id, t.id);
      }
    }
  }

  const threadIds = Array.from(threadToJob.keys());

  // Fetch last messages per thread using thread_id (production schema)
  const lastMessages = new Map<string, LastMessageInfo>();

  if (threadIds.length > 0) {
    const messageLimit = Math.min(Math.max(threadIds.length * 5, limit), 500);

    const { data: messageData, error: messageError } = await serverSupabase
      .from('messages')
      .select('id, thread_id, sender_id, content, message_type, created_at')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false })
      .limit(messageLimit);

    if (messageError) {
      logger.error('Failed to load last messages', messageError, {
        service: 'messages',
        userId: user.id,
        threadCount: threadIds.length,
      });
    }

    if (messageData) {
      for (const row of messageData as { id: string; thread_id: string; sender_id: string; content: string; message_type: string | null; created_at: string }[]) {
        const msgJobId = threadToJob.get(row.thread_id);
        if (msgJobId && !lastMessages.has(msgJobId)) {
          lastMessages.set(msgJobId, {
            content: row.content || '',
            messageText: row.content || '',
            messageType: normalizeMessageType(row.message_type),
            createdAt: row.created_at,
          });
        }
      }
    }
  }

  // Calculate unread counts using read_by array (production schema)
  const unreadCounts = new Map<string, number>();
  if (threadIds.length > 0) {
    const { data: unreadData, error: unreadError } = await serverSupabase
      .from('messages')
      .select('id, thread_id, sender_id, read_by')
      .in('thread_id', threadIds)
      .neq('sender_id', user.id);

    if (unreadError) {
      logger.warn('Failed to load unread counts', {
        service: 'messages',
        userId: user.id,
        error: unreadError.message,
      });
    } else {
      for (const row of (unreadData ?? []) as { id: string; thread_id: string; sender_id: string; read_by: string[] | null }[]) {
        const readBy = row.read_by ?? [];
        if (!readBy.includes(user.id)) {
          const msgJobId = threadToJob.get(row.thread_id);
          if (msgJobId) {
            unreadCounts.set(msgJobId, (unreadCounts.get(msgJobId) ?? 0) + 1);
          }
        }
      }
    }
  }

  const threads: ThreadWithActivity[] = jobRows
    // Only include jobs that have both participants OR have existing messages
    .filter((job) => {
      const hasBothParticipants = !!job.homeowner_id && !!job.contractor_id;
      const hasMessages = lastMessages.has(job.id);
      return hasBothParticipants || hasMessages;
    })
    .map((job) => {
      const lastMessage = lastMessages.get(job.id);
      const threadData = messageThreadsData?.find(t => t.job_id === job.id);
      const lastActivity = lastMessage
        ? toTimestamp(lastMessage.createdAt)
        : threadData?.last_message_at
          ? toTimestamp(threadData.last_message_at)
          : job.updated_at
            ? toTimestamp(job.updated_at)
            : toTimestamp(job.created_at);

      return {
        jobId: job.id,
        jobTitle: job.title ?? 'Untitled Job',
        participants: buildThreadParticipants(job) || [],
        unreadCount: unreadCounts.get(job.id) ?? 0,
        lastMessage: lastMessage ?? undefined,
        lastActivity,
      };
    });

  const filtered = threads.filter((thread) => {
    if (!cursorTimestamp) return true;
    return thread.lastActivity < cursorTimestamp;
  });

  const sorted = filtered.sort((a, b) => b.lastActivity - a.lastActivity);
  const limitedThreads = sorted.slice(0, limit);
  const hasMore = sorted.length > limit;
  const nextCursorValue = hasMore
    ? new Date(limitedThreads[limitedThreads.length - 1].lastActivity).toISOString()
    : undefined;

  logger.info('Message threads retrieved', {
    service: 'messages',
    userId: user.id,
    userRole: user.role,
    jobCount: jobRows.length,
    jobsWithMessages: lastMessages.size,
    threadCount: limitedThreads.length,
    hasMore,
  });

  return NextResponse.json({
    threads: limitedThreads.map(({ lastActivity: _lastActivity, ...thread }) => thread),
    nextCursor: nextCursorValue,
    limit,
  });
});
