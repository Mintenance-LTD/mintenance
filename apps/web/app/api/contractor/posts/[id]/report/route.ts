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
    const body = await request.json();
    const { reason } = body;

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('contractor_posts')
      .select('id, contractor_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new NotFoundError('Post not found');
    }

    // Don't allow users to report their own posts
    if (post.contractor_id === user.id) {
      throw new BadRequestError('You cannot report your own post');
    }

    // Flag the post
    const { error: flagError } = await supabase
      .from('contractor_posts')
      .update({
        is_flagged: true,
        flagged_reason: reason || 'Reported by user',
      })
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
      message: 'Post reported successfully. It will be reviewed by moderators.' 
    });
  } catch (error) {
    logger.error('Error in POST /api/contractor/posts/[id]/report', error, {
      service: 'contractor_posts',
    });
    throw new InternalServerError('Internal server error');
  }
}

