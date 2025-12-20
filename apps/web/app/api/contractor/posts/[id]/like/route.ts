import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle async params in Next.js 15
    const resolvedParams = await Promise.resolve(params);
    const postId = resolvedParams.id;

    // SECURITY: Validate UUID format before database query
    if (!isValidUUID(postId)) {
      return NextResponse.json({ error: 'Invalid post ID format' }, { status: 400 });
    }

    // SECURITY: Fix IDOR - verify post exists and user can access it
    const { data: post, error: postError } = await supabase
      .from('contractor_posts')
      .select('id, contractor_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      // Don't reveal if post exists or not - return generic error
      return NextResponse.json({ error: 'Post not found or access denied' }, { status: 404 });
    }

    // Check if like already exists
    const { data: existingLike } = await supabase
      .from('contractor_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('contractor_id', user.id)
      .single();

    if (existingLike) {
      // Unlike: delete the like
      const { error: deleteError } = await supabase
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
        return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 });
      }

      // Get updated likes count
      const { data: postData } = await supabase
        .from('contractor_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      return NextResponse.json({
        liked: false,
        likes_count: postData?.likes_count || 0
      });
    } else {
      // Like: create the like
      const { error: insertError } = await supabase
        .from('contractor_post_likes')
        .insert({
          post_id: postId,
          contractor_id: user.id,
        });

      if (insertError) {
        logger.error('Failed to like post', insertError, {
          service: 'contractor-posts',
          postId,
          userId: user.id,
        });
        return NextResponse.json({ error: 'Failed to like post' }, { status: 500 });
      }

      // Get updated likes count
      const { data: postData } = await supabase
        .from('contractor_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      return NextResponse.json({
        liked: true,
        likes_count: postData?.likes_count || 0
      });
    }
  } catch (error) {
    logger.error('Unexpected error in like post', error, { service: 'contractor-posts' });
    // SECURITY: Don't expose error details to client
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

