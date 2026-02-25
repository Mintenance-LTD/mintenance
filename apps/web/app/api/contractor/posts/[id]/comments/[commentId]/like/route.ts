import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError, InternalServerError } from '@/lib/errors/api-error';

/**
 * POST /api/contractor/posts/[id]/comments/[commentId]/like
 * Like a comment on a contractor post
 */
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { user, params }) => {
    const { commentId } = params;

    // Verify comment exists
    const { data: comment, error: fetchError } = await serverSupabase
      .from('contractor_post_comments')
      .select('id, likes_count')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      throw new NotFoundError('Comment not found');
    }

    // TODO: Create contractor_comment_likes table for proper like tracking
    // This would allow checking if user already liked the comment
    const newLikesCount = (comment.likes_count || 0) + 1;

    const { data: updatedComment, error: updateError } = await serverSupabase
      .from('contractor_post_comments')
      .update({ likes_count: newLikesCount })
      .eq('id', commentId)
      .select('likes_count')
      .single();

    if (updateError) {
      logger.error('Error updating comment likes', updateError, {
        service: 'contractor',
        commentId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to update comment likes');
    }

    return NextResponse.json({
      liked: true,
      likes_count: updatedComment.likes_count,
    });
  }
);
