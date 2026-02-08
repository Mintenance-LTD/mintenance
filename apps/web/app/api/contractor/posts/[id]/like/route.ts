import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const supabase = serverSupabase;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Authentication required');
    }

    // Handle async params in Next.js 15
    const resolvedParams = await Promise.resolve(params);
    const postId = resolvedParams.id;

    // SECURITY: Validate UUID format before database query
    if (!isValidUUID(postId)) {
      throw new BadRequestError('Invalid post ID format');
    }

    // SECURITY: Fix IDOR - verify post exists and user can access it
    const { data: post, error: postError } = await supabase
      .from('contractor_posts')
      .select('id, contractor_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      // Don't reveal if post exists or not - return generic error
      throw new NotFoundError('Post not found or access denied');
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
        throw new InternalServerError('Failed to unlike post');
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
        throw new InternalServerError('Failed to like post');
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
    throw new InternalServerError('Internal server error');
  }
}

