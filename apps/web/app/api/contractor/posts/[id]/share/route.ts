import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * POST /api/contractor/posts/[id]/share - track a post share.
 */
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user, params }) => {
    const postId = params.id;

    // Verify post exists and is active
    const { data: post, error: postError } = await serverSupabase
      .from('contractor_posts')
      .select('id, shares_count')
      .eq('id', postId)
      .eq('is_active', true)
      .single();

    if (postError || !post) {
      throw new NotFoundError('Post not found or inactive');
    }

    const { data: updatedPost, error: updateError } = await serverSupabase
      .from('contractor_posts')
      .update({ shares_count: (post.shares_count || 0) + 1 })
      .eq('id', postId)
      .select('shares_count')
      .single();

    if (updateError) {
      logger.error('Error updating share count', updateError, {
        service: 'contractor_posts',
        userId: user.id,
        postId,
      });
      throw new InternalServerError('Failed to track share');
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const shareLink = `${baseUrl}/contractor/social/post/${postId}`;

    return NextResponse.json({
      shares_count: updatedPost.shares_count,
      share_link: shareLink,
      message: 'Share tracked successfully',
    });
  },
);
