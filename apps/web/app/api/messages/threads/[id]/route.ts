import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { MessageThread } from '@mintenance/types';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';
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
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: threadId } = await context.params;
    if (!threadId) {
      return NextResponse.json({ error: 'Thread id is required' }, { status: 400 });
    }

    // SECURITY: Validate UUID format before database query
    if (!isValidUUID(threadId)) {
      return NextResponse.json({ error: 'Invalid thread ID format' }, { status: 400 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { limit, cursor } = parsed.data;

    let cursorIso: string | undefined;
    if (cursor) {
      const ts = Date.parse(cursor);
      if (Number.isNaN(ts)) {
        return NextResponse.json({ error: 'Invalid cursor value' }, { status: 400 });
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
        homeowner:users!jobs_homeowner_id_fkey(id, first_name, last_name, role, email, company_name),
        contractor:users!jobs_contractor_id_fkey(id, first_name, last_name, role, email, company_name)
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
      return NextResponse.json({ error: 'Thread not found or access denied' }, { status: 404 });
    }

    const job = jobData as SupabaseJobRow;

    // Fetch messages - try message_text first, then fallback to content if needed
    // Note: We select only what we need to avoid query errors if columns don't exist
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
        sender:users!messages_sender_id_fkey(first_name, last_name, role, email, company_name)
      `)
      .eq('job_id', threadId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursorIso) {
      messageQuery = messageQuery.lt('created_at', cursorIso);
    }

    let { data: messageData, error: messagesError } = await messageQuery;
    
    // If message_text column doesn't exist, try with content
    if (messagesError && (messagesError.message?.includes('message_text') || (messagesError.message?.includes('column') && messagesError.message?.includes('message_text')))) {
      logger.warn('Message text column not found, trying with content', {
        service: 'messages',
        threadId,
        error: messagesError.message,
      });
      let fallbackQuery = serverSupabase
        .from('messages')
        .select(`
          id,
          job_id,
          sender_id,
          receiver_id,
          content,
          message_type,
          attachment_url,
          read,
          created_at,
          sender:users!messages_sender_id_fkey(first_name, last_name, role, email, company_name)
        `)
        .eq('job_id', threadId)
        .order('created_at', { ascending: false })
        .limit(limit + 1);
      
      if (cursorIso) {
        fallbackQuery = fallbackQuery.lt('created_at', cursorIso);
      }
      
      const result = await fallbackQuery;
      // Map content to message_text for consistency
      messageData = result.data?.map((m: any) => ({
        ...m,
        message_text: m.content || null,
      })) || null;
      messagesError = result.error;
    }
    
    if (messagesError) {
      logger.error('Failed to load messages', messagesError, {
        service: 'messages',
        threadId,
        userId: user.id,
      });
      // SECURITY: Don't expose database error details to client
      return NextResponse.json({ 
        error: 'Failed to load messages'
      }, { status: 500 });
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
    logger.error('Failed to load thread', err, { service: 'messages' });
    // SECURITY: Don't expose error details to client
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }
}
