import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/errors/api-error';

/**
 * POST /api/messages/threads/:id/read
 * Mark messages as read for the current user
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const { id: jobId } = params as { id: string };
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
  }
);
