import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/errors/api-error';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: Params) {
  try {

    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to mark messages as read');
    }

    const { id: threadId } = await context.params;
    if (!threadId) {
      throw new BadRequestError('Thread id is required');
    }

    const { data: jobData, error: jobError } = await serverSupabase
      .from('jobs')
      .select('homeowner_id, contractor_id')
      .eq('id', threadId)
      .single();

    if (jobError || !jobData) {
      logger.error('mark-read job error', jobError, {
        service: 'messages',
        threadId,
        userId: user.id,
      });
      throw new NotFoundError('Thread not found');
    }

    const isParticipant =
      jobData.homeowner_id === user.id || jobData.contractor_id === user.id;
    if (!isParticipant) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    const { data: updatedRows, error: updateError } = await serverSupabase
      .from('messages')
      .update({ read: true })
      .eq('job_id', threadId)
      .eq('receiver_id', user.id)
      .eq('read', false)
      .select('id');

    if (updateError) {
      logger.error('mark-read update error', updateError, {
        service: 'messages',
        threadId,
        userId: user.id,
      });
      throw updateError;
    }

    const updated = updatedRows?.length ?? 0;
    return NextResponse.json({ updated });
  } catch (err) {
    return handleAPIError(err);
  }
}
