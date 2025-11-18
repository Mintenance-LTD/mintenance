import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { MessageThread } from '@mintenance/types';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  buildThreadParticipants,
  mapMessageRow,
  SupabaseJobRow,
  SupabaseMessageRow,
  toTimestamp,
} from '@/app/api/messages/utils';

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

    // First, get jobs where user is homeowner or contractor
    const { data: jobsData, error: jobsError } = await serverSupabase
      .from('jobs')
      .select(`
        id,
        title,
        homeowner_id,
        contractor_id,
        created_at,
        updated_at,
        homeowner:users!jobs_homeowner_id_fkey(id, first_name, last_name, role, email, company_name, profile_image_url),
        contractor:users!jobs_contractor_id_fkey(id, first_name, last_name, role, email, company_name, profile_image_url)
      `)
      .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })
      .limit(fetchLimit);
    
    // Also get jobs where user has sent or received messages (in case job association isn't perfect)
    const { data: messageJobsData } = await serverSupabase
      .from('messages')
      .select('job_id, jobs!inner(id, title, homeowner_id, contractor_id, created_at, updated_at, homeowner:users!jobs_homeowner_id_fkey(id, first_name, last_name, role, email, company_name, profile_image_url), contractor:users!jobs_contractor_id_fkey(id, first_name, last_name, role, email, company_name, profile_image_url))')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .limit(50);
    
    // Combine and deduplicate jobs
    const allJobs = new Map<string, any>();
    
    // Add jobs from direct query
    if (jobsData) {
      for (const job of jobsData) {
        allJobs.set(job.id, job);
      }
    }
    
    // Add jobs from messages query
    if (messageJobsData) {
      for (const msgRow of messageJobsData) {
        const job = (msgRow as any).jobs;
        if (job && !allJobs.has(job.id)) {
          allJobs.set(job.id, job);
        }
      }
    }
    
    const combinedJobsData = Array.from(allJobs.values());

    if (jobsError) {
      logger.error('Failed to load message threads - jobs query failed', jobsError, { 
        service: 'messages',
        userId: user.id
      });
      // Don't fail completely - try to continue with message-based jobs
    }

    const jobRows = (combinedJobsData ?? []) as SupabaseJobRow[];
    if (jobRows.length === 0) {
      logger.info('No jobs found for user', {
        service: 'messages',
        userId: user.id,
        userRole: user.role,
        directJobsCount: jobsData?.length || 0,
        messageJobsCount: messageJobsData?.length || 0,
      });
      return NextResponse.json({ threads: [], nextCursor: undefined, limit });
    }

    const jobIds = jobRows.map((job) => job.id);

    const lastMessages = new Map<string, ReturnType<typeof mapMessageRow>>();
    if (jobIds.length > 0) {
      const messageLimit = Math.min(Math.max(jobIds.length * 5, limit), 500);
      
      // Fetch messages using 'content' column (schema uses 'content', not 'message_text')
      const { data: messageData, error: messageError } = await serverSupabase
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
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })
        .limit(messageLimit);

      if (messageError) {
        logger.error('Failed to load message threads - messages query failed', messageError, {
          service: 'messages',
          userId: user.id,
          jobCount: jobIds.length,
          errorMessage: messageError.message,
        });
        // Don't fail the entire request - just continue without messages
        // messageData will be null/undefined if there's an error
      }

      if (messageData) {
        const messageRows = (messageData ?? []) as SupabaseMessageRow[];
        for (const row of messageRows) {
          if (!lastMessages.has(row.job_id)) {
            lastMessages.set(row.job_id, mapMessageRow(row));
          }
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
        logger.warn('Failed to load unread counts', {
          service: 'messages',
          userId: user.id,
          error: unreadError.message
        });
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

      // Log homeowner data for debugging
      if (process.env.NODE_ENV === 'development') {
        logger.info('Building thread participants', {
          service: 'messages',
          jobId: job.id,
          homeownerId: job.homeowner_id,
          homeownerData: job.homeowner ? {
            hasData: true,
            firstName: job.homeowner.first_name,
            lastName: job.homeowner.last_name,
            email: job.homeowner.email,
          } : { hasData: false },
        });
      }

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

    logger.info('Message threads retrieved', {
      service: 'messages',
      userId: user.id,
      userRole: user.role,
      jobCount: jobRows.length,
      jobsWithMessages: lastMessages.size,
      threadCount: limitedThreads.length,
      hasMore,
      jobIds: jobRows.map(j => j.id).slice(0, 5), // Log first 5 job IDs for debugging
    });

    return NextResponse.json({
      threads: limitedThreads.map(({ lastActivity: _lastActivity, ...thread }) => thread),
      nextCursor: nextCursorValue,
      limit,
    });
  } catch (err) {
    logger.error('Failed to load message threads', err, {
      service: 'messages'
    });
    return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 });
  }
}
