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
} from '../../utils';

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
        homeowner:users!jobs_homeowner_id_fkey(id, first_name, last_name, role),
        contractor:users!jobs_contractor_id_fkey(id, first_name, last_name, role)
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
        call_id,
        call_duration,
        read,
        created_at,
        sender:users!messages_sender_id_fkey(first_name, last_name, role)
      `)
      .eq('job_id', threadId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursorIso) {
      messageQuery = messageQuery.lt('created_at', cursorIso);
    }

    const { data: messageData, error: messagesError } = await messageQuery;
    if (messagesError) {
      console.error('[API] thread GET messages error', messagesError);
      return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }

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
