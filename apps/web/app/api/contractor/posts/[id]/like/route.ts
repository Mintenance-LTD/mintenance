import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';
import { NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * POST /api/contractor/posts/[id]/like - toggle like on a post.
 */
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { user, params }) => {
    const postId = params.id;

    if (!isValidUUID(postId)) {
      throw new BadRequestError('Invalid post ID format');
    }

    // Verify post exists
    const { data: post, error: postError } = await serverSupabase
      .from('contractor_posts')
      .select('id, contractor_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new NotFoundError('Post not found or access denied');
    }

    // Check if like already exists
    const { data: existingLike } = await serverSupabase
      .from('contractor_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('contractor_id', user.id)
      .single();

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await serverSupabase
        .from('contractor_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('contractor_id', user.id);

      if (deleteError) {
        logger.error('Failed to unlike post', deleteError, {
          service: 'contractor-posts',
          postId,
          userId: user.id,
        });
        throw new InternalServerError('Failed to unlike post');
      }

      const { data: postData } = await serverSupabase
        .from('contractor_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      return NextResponse.json({ liked: false, likes_count: postData?.likes_count || 0 });
    }

    // Like
    const { error: insertError } = await serverSupabase
      .from('contractor_post_likes')
      .insert({ post_id: postId, contractor_id: user.id });

    if (insertError) {
      logger.error('Failed to like post', insertError, {
        service: 'contractor-posts',
        postId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to like post');
    }

    const { data: postData } = await serverSupabase
      .from('contractor_posts')
      .select('likes_count')
      .eq('id', postId)
      .single();

    return NextResponse.json({ liked: true, likes_count: postData?.likes_count || 0 });
  },
);
