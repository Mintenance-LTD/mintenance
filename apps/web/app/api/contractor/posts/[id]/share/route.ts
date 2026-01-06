import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const { id } = await params;
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Authentication required');
    }

    const postId = id;

    // Verify post exists and is active
    const { data: post, error: postError } = await supabase
      .from('contractor_posts')
      .select('id, shares_count')
      .eq('id', postId)
      .eq('is_active', true)
      .single();

    if (postError || !post) {
      throw new NotFoundError('Post not found or inactive');
    }

    // Increment shares_count
    const currentShares = post.shares_count || 0;
    const newSharesCount = currentShares + 1;

    const { data: updatedPost, error: updateError } = await supabase
      .from('contractor_posts')
      .update({ shares_count: newSharesCount })
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

    // Generate shareable link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const shareLink = `${baseUrl}/contractor/social/post/${postId}`;

    return NextResponse.json({ 
      shares_count: updatedPost.shares_count,
      share_link: shareLink,
      message: 'Share tracked successfully'
    });
  } catch (error) {
    logger.error('Error in POST /api/contractor/posts/[id]/share', error, {
      service: 'contractor_posts',
    });
    throw new InternalServerError('Internal server error');
  }
}

