import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import {
  buildThreadParticipants,
  normalizeMessageType,
  SupabaseJobRow,
  toTimestamp,
} from '@/app/api/messages/utils';

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

export async function GET(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 30
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(30),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to view message threads');
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

    const threadToJob = new Map<string, string>();
    const jobToThread = new Map<string, string>();
    for (const t of messageThreadsData ?? []) {
      threadToJob.set(t.id, t.job_id);
      jobToThread.set(t.job_id, t.id);
    }

    const threadIds = Array.from(threadToJob.keys());

    // Fetch last messages per thread using actual schema columns
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
          const jobId = threadToJob.get(row.thread_id);
          if (jobId && !lastMessages.has(jobId)) {
            lastMessages.set(jobId, {
              content: row.content || '',
              messageText: row.content || '',
              messageType: normalizeMessageType(row.message_type),
              createdAt: row.created_at,
            });
          }
        }
      }
    }

    // Fallback: for jobs without lastMessage from thread_id lookup, try querying by job_id directly
    // (some messages may use job_id instead of thread_id)
    const jobsWithoutMessages = jobIds.filter(id => !lastMessages.has(id));
    if (jobsWithoutMessages.length > 0) {
      const { data: fallbackMessages } = await serverSupabase
        .from('messages')
        .select('id, job_id, sender_id, content, message_type, created_at')
        .in('job_id', jobsWithoutMessages)
        .order('created_at', { ascending: false })
        .limit(jobsWithoutMessages.length * 3);

      if (fallbackMessages) {
        for (const row of fallbackMessages as { id: string; job_id: string; sender_id: string; content: string; message_type: string | null; created_at: string }[]) {
          if (row.job_id && !lastMessages.has(row.job_id)) {
            lastMessages.set(row.job_id, {
              content: row.content || '',
              messageText: row.content || '',
              messageType: normalizeMessageType(row.message_type),
              createdAt: row.created_at,
            });
          }
        }
      }
    }

    // Calculate unread counts using read_by array (user not in read_by = unread)
    const unreadCounts = new Map<string, number>();
    if (threadIds.length > 0) {
      const { data: unreadData, error: unreadError } = await serverSupabase
        .from('messages')
        .select('id, thread_id, sender_id, read_by')
        .in('thread_id', threadIds);

      if (unreadError) {
        logger.warn('Failed to load unread counts', {
          service: 'messages',
          userId: user.id,
          error: unreadError.message
        });
      } else {
        for (const row of (unreadData ?? []) as { id: string; thread_id: string; sender_id: string; read_by: string[] | null }[]) {
          // Only count messages not sent by current user and not read by them
          if (row.sender_id !== user.id) {
            const readBy = Array.isArray(row.read_by) ? row.read_by : [];
            if (!readBy.includes(user.id)) {
              const jobId = threadToJob.get(row.thread_id);
              if (jobId) {
                unreadCounts.set(jobId, (unreadCounts.get(jobId) ?? 0) + 1);
              }
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
  } catch (err) {
    return handleAPIError(err);
  }
}
