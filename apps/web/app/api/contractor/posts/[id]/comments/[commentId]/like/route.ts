import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const supabase = serverSupabase;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
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

    const { commentId } = await params;

    // Verify comment exists
    const { data: comment, error: fetchError } = await supabase
      .from('contractor_post_comments')
      .select('id, likes_count')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      throw new NotFoundError('Comment not found');
    }

    // For now, we'll just increment/decrement likes_count
    // TODO: Create contractor_comment_likes table for proper like tracking
    // This would allow us to check if user already liked the comment
    // For MVP, we'll toggle between liked/unliked state
    const currentLikes = comment.likes_count || 0;
    
    // Since we don't have a likes table, we'll increment by 1 each time
    // In production, you'd want to track individual likes to prevent double-liking
    const newLikesCount = currentLikes + 1;

    const { data: updatedComment, error: updateError } = await supabase
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
      likes_count: updatedComment.likes_count 
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

