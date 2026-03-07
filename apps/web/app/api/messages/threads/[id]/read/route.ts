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

    // Find unread messages (where user is NOT in read_by array)
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

    // Filter to messages where user is NOT already in read_by
    const toUpdate = (unreadMsgs ?? []).filter((m: { id: string; read_by: string[] | null }) => {
      const readBy = m.read_by ?? [];
      return !readBy.includes(user.id);
    });

    let updated = 0;
    for (const msg of toUpdate) {
      const currentReadBy = (msg as { read_by: string[] | null }).read_by ?? [];
      const { error: updateError } = await serverSupabase
        .from('messages')
        .update({ read_by: [...currentReadBy, user.id] })
        .eq('id', msg.id);

      if (updateError) {
        logger.error('mark-read update error', updateError, {
          service: 'messages',
          jobId,
          userId: user.id,
          messageId: msg.id,
        });
      } else {
        updated++;
      }
    }

    return NextResponse.json({ updated });
  }
);
