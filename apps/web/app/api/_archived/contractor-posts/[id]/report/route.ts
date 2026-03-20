import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const reportPostSchema = z.object({
  reason: z.string().min(1).max(500),
});

/**
 * POST /api/contractor/posts/[id]/report - report a post for moderation.
 */
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user, params }) => {
    const postId = params.id;
    const validation = await validateRequest(request, reportPostSchema);
    if (validation instanceof NextResponse) return validation;
    const { reason } = validation.data;

    // Verify post exists
    const { data: post, error: postError } = await serverSupabase
      .from('contractor_posts')
      .select('id, contractor_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new NotFoundError('Post not found');
    }

    if (post.contractor_id === user.id) {
      throw new BadRequestError('You cannot report your own post');
    }

    const { error: flagError } = await serverSupabase
      .from('contractor_posts')
      .update({ is_flagged: true, flagged_reason: reason || 'Reported by user' })
      .eq('id', postId);

    if (flagError) {
      logger.error('Error flagging post', flagError, {
        service: 'contractor_posts',
        userId: user.id,
        postId,
      });
      throw new InternalServerError('Failed to report post');
    }

    return NextResponse.json({
      message: 'Post reported successfully. It will be reviewed by moderators.',
    });
  },
);
