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

    // Mark all unread messages in this job as read (actual DB uses `read` boolean)
    const { data: updateResult, error: updateError } = await serverSupabase
      .from('messages')
      .update({ read: true })
      .eq('job_id', jobId)
      .neq('sender_id', user.id)
      .eq('read', false)
      .select('id');

    if (updateError) {
      logger.error('mark-read update error', updateError, {
        service: 'messages',
        jobId,
        userId: user.id,
      });
      throw updateError;
    }

    return NextResponse.json({ updated: updateResult?.length ?? 0 });
  }
);
