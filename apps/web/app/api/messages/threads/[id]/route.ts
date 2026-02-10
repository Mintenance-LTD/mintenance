import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { MessageThread } from '@mintenance/types';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { isValidUUID } from '@/lib/validation/uuid';
import { rateLimiter } from '@/lib/rate-limiter';
import {
  buildThreadParticipants,
  mapMessageRow,
  SupabaseJobRow,
  SupabaseMessageRow,
} from '@/app/api/messages/utils';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Params) {
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
      throw new UnauthorizedError('Authentication required to view message thread');
    }

    const { id: threadId } = await context.params;
    if (!threadId) {
      throw new BadRequestError('Thread id is required');
    }

    // SECURITY: Validate UUID format before database query
    if (!isValidUUID(threadId)) {
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

    // SECURITY: Fix IDOR - check ownership in query, not after fetch
    const { data: jobData, error: jobError } = await serverSupabase
      .from('jobs')
      .select(`
        id,
        title,
        homeowner_id,
        contractor_id,
        created_at,
        updated_at,
        homeowner:profiles!jobs_homeowner_id_fkey(id, first_name, last_name, role, email, company_name),
        contractor:profiles!jobs_contractor_id_fkey(id, first_name, last_name, role, email, company_name)
      `)
      .eq('id', threadId)
      .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`)
      .single();

    if (jobError || !jobData) {
      // Don't reveal if thread exists or not - return generic error
      logger.warn('Thread access denied or not found', {
        service: 'messages',
        threadId,
        userId: user.id,
        error: jobError?.message,
      });
      throw new NotFoundError('Thread not found or access denied');
    }

    const job = jobData as SupabaseJobRow;

    // Fetch messages using 'message_text' column (schema uses 'message_text')
    let messageQuery = serverSupabase
      .from('messages')
      .select(`
        id,
        job_id,
        sender_id,
        receiver_id,
        message_text,
        message_type,
        attachment_url,
        read,
        created_at,
        sender:profiles!messages_sender_id_fkey(first_name, last_name, role, email, company_name)
      `)
      .eq('job_id', threadId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursorIso) {
      messageQuery = messageQuery.lt('created_at', cursorIso);
    }

    const { data: messageData, error: messagesError } = await messageQuery;
    
    if (messagesError) {
      logger.error('Failed to load messages', messagesError, {
        service: 'messages',
        threadId,
        userId: user.id,
      });
      throw messagesError;
    }
    
    // Log message retrieval for debugging (without sensitive details)
    logger.info('Messages retrieved', {
      service: 'messages',
      threadId,
      userId: user.id,
      messageCount: messageData?.length || 0,
    });

    const rows = (messageData ?? []) as SupabaseMessageRow[];
    const hasMore = rows.length > limit;
    const limitedRows = rows.slice(0, limit);
    const mappedLimited = limitedRows.map(mapMessageRow);
    const nextCursorValue = hasMore
      ? limitedRows[limitedRows.length - 1]?.created_at
      : undefined;

    const messages = mappedLimited.slice().reverse();
    const latestMessage = mappedLimited[0];

    const { count: unreadCount, error: unreadError } = await serverSupabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', threadId)
      .eq('receiver_id', user.id)
      .eq('read', false);

    if (unreadError) {
      logger.error('Failed to get unread count', unreadError, {
        service: 'messages',
        threadId,
        userId: user.id,
      });
    }

    const thread: MessageThread = {
      jobId: job.id,
      jobTitle: job.title ?? 'Untitled Job',
      participants: buildThreadParticipants(job),
      unreadCount: unreadCount ?? 0,
      lastMessage: latestMessage ?? undefined,
    };

    return NextResponse.json({
      thread,
      messages,
      nextCursor: nextCursorValue,
      limit,
    });
  } catch (err) {
    return handleAPIError(err);
  }
}
