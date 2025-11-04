import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { MessageThread } from '@mintenance/types';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
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
      .single();

    if (jobError) {
      console.error('[API] thread GET job error', jobError);
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const job = jobData as SupabaseJobRow;
    const isParticipant = job.homeowner_id === user.id || job.contractor_id === user.id;
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
      console.warn('[API] thread GET message_text column not found, trying with content', messagesError);
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
      console.error('[API] thread GET messages error', {
        error: messagesError,
        threadId,
        userId: user.id,
        jobHomeownerId: job.homeowner_id,
        jobContractorId: job.contractor_id,
        errorMessage: messagesError.message,
        errorCode: messagesError.code,
        errorDetails: messagesError.details,
      });
      return NextResponse.json({ 
        error: 'Failed to load messages',
        details: messagesError.message || 'Database query failed'
      }, { status: 500 });
    }
    
    // Log message retrieval for debugging - includes sender/receiver info
    console.log('[API] thread GET messages retrieved', {
      threadId,
      userId: user.id,
      messageCount: messageData?.length || 0,
      jobHomeownerId: job.homeowner_id,
      jobContractorId: job.contractor_id,
      messageDetails: messageData?.map((m: any) => ({ 
        id: m.id, 
        senderId: m.sender_id, 
        receiverId: m.receiver_id,
        hasText: !!(m.message_text || m.content),
        textLength: (m.message_text || m.content || '').length,
      })) || [],
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
      console.error('[API] thread GET unread count error', unreadError);
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
    console.error('[API] thread GET error', err);
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }
}
