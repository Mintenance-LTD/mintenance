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
  toTimestamp,
} from '../utils';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

interface ThreadWithActivity extends MessageThread {
  lastActivity: number;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    let cursorTimestamp: number | undefined;
    if (cursor) {
      const ts = Date.parse(cursor);
      if (Number.isNaN(ts)) {
        return NextResponse.json({ error: 'Invalid cursor value' }, { status: 400 });
      }
      cursorTimestamp = ts;
    }

    const fetchLimit = Math.min(limit * 3, 150);

    const { data: jobsData, error: jobsError } = await serverSupabase
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
      .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })
      .limit(fetchLimit);

    if (jobsError) {
      console.error('[API] threads GET jobs error', jobsError);
      return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 });
    }

    const jobRows = (jobsData ?? []) as SupabaseJobRow[];
    if (jobRows.length === 0) {
      return NextResponse.json({ threads: [], nextCursor: undefined, limit });
    }

    const jobIds = jobRows.map((job) => job.id);

    const lastMessages = new Map<string, ReturnType<typeof mapMessageRow>>();
    if (jobIds.length > 0) {
      const messageLimit = Math.min(Math.max(jobIds.length * 5, limit), 500);
      const { data: messageData, error: messageError } = await serverSupabase
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
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })
        .limit(messageLimit);

      if (messageError) {
        console.error('[API] threads GET messages error', messageError);
        return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 });
      }

      const messageRows = (messageData ?? []) as SupabaseMessageRow[];
      for (const row of messageRows) {
        if (!lastMessages.has(row.job_id)) {
          lastMessages.set(row.job_id, mapMessageRow(row));
        }
      }
    }

    const unreadCounts = new Map<string, number>();
    if (jobIds.length > 0) {
      const { data: unreadData, error: unreadError } = await serverSupabase
        .from('messages')
        .select('id, job_id')
        .eq('receiver_id', user.id)
        .eq('read', false)
        .in('job_id', jobIds);

      if (unreadError) {
        console.error('[API] threads GET unread error', unreadError);
      } else {
        for (const row of (unreadData ?? []) as { id: string; job_id: string }[]) {
          unreadCounts.set(row.job_id, (unreadCounts.get(row.job_id) ?? 0) + 1);
        }
      }
    }

    const threads: ThreadWithActivity[] = jobRows.map((job) => {
      const lastMessage = lastMessages.get(job.id);
      const lastActivity = lastMessage
        ? toTimestamp(lastMessage.createdAt)
        : job.updated_at
          ? toTimestamp(job.updated_at)
          : toTimestamp(job.created_at);

      return {
        jobId: job.id,
        jobTitle: job.title ?? 'Untitled Job',
        participants: buildThreadParticipants(job),
        unreadCount: unreadCounts.get(job.id) ?? 0,
        lastMessage,
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

    return NextResponse.json({
      threads: limitedThreads.map(({ lastActivity: _lastActivity, ...thread }) => thread),
      nextCursor: nextCursorValue,
      limit,
    });
  } catch (err) {
    console.error('[API] threads GET error', err);
    return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 });
  }
}
