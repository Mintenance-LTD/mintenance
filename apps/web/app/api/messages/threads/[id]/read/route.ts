import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: Params) {
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
      throw new UnauthorizedError('Authentication required to mark messages as read');
    }

    const { id: jobId } = await context.params;
    if (!jobId) {
      throw new BadRequestError('Job id is required');
    }

    // Verify user is participant
    const { data: jobData, error: jobError } = await serverSupabase
      .from('jobs')
      .select('homeowner_id, contractor_id')
      .eq('id', jobId)
      .single();

    if (jobError || !jobData) {
      throw new NotFoundError('Thread not found');
    }

    const isParticipant = jobData.homeowner_id === user.id || jobData.contractor_id === user.id;
    if (!isParticipant) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    // Find message_thread for this job
    const { data: threadData } = await serverSupabase
      .from('message_threads')
      .select('id')
      .eq('job_id', jobId)
      .single();

    if (!threadData) {
      return NextResponse.json({ updated: 0 });
    }

    // Get messages not sent by user that user hasn't read yet
    const { data: unreadMsgs, error: fetchError } = await serverSupabase
      .from('messages')
      .select('id, read_by')
      .eq('thread_id', threadData.id)
      .neq('sender_id', user.id);

    if (fetchError) {
      logger.error('mark-read fetch error', fetchError, {
        service: 'messages',
        jobId,
        userId: user.id,
      });
      throw fetchError;
    }

    // Filter to only messages where user is not in read_by
    const toUpdate = (unreadMsgs ?? []).filter((msg: { id: string; read_by: string[] | null }) => {
      const readBy = Array.isArray(msg.read_by) ? msg.read_by : [];
      return !readBy.includes(user.id);
    });

    // Update each message's read_by to include user
    let updated = 0;
    for (const msg of toUpdate) {
      const readBy = Array.isArray(msg.read_by) ? [...msg.read_by, user.id] : [user.id];
      const { error: updateError } = await serverSupabase
        .from('messages')
        .update({ read_by: readBy })
        .eq('id', msg.id);
      if (!updateError) updated++;
    }

    return NextResponse.json({ updated });
  } catch (err) {
    return handleAPIError(err);
  }
}
