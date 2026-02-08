import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

// Type definition for comment update data
interface CommentUpdateData {
  updated_at: string;
  comment_text?: string;
  is_solution?: boolean;
  solution_verified_by?: string;
}

const supabase = serverSupabase;

export async function PATCH(
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
    const body = await request.json();
    const { comment_text, is_solution } = body;

    // Verify comment exists and belongs to user
    const { data: existingComment, error: fetchError } = await supabase
      .from('contractor_post_comments')
      .select('contractor_id, post_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !existingComment) {
      throw new NotFoundError('Comment not found');
    }

    if (existingComment.contractor_id !== user.id) {
      throw new ForbiddenError('You can only edit your own comments');
    }

    // Build update payload
    const updateData: CommentUpdateData = {
      updated_at: new Date().toISOString(),
    };

    if (comment_text !== undefined) {
      if (comment_text.trim().length === 0) {
        throw new BadRequestError('Comment text cannot be empty');
      }
      if (comment_text.length > 2000) {
        throw new BadRequestError('Comment text must be 2000 characters or less');
      }
      updateData.comment_text = comment_text.trim();
    }

    if (is_solution !== undefined) {
      // Only allow marking as solution if user is post author or comment author
      const { data: post } = await supabase
        .from('contractor_posts')
        .select('contractor_id')
        .eq('id', existingComment.post_id)
        .single();

      if (post && (post.contractor_id === user.id || existingComment.contractor_id === user.id)) {
        updateData.is_solution = is_solution;
        if (is_solution) {
          updateData.solution_verified_by = user.id;
        }
      } else {
        throw new ForbiddenError('Only post author or comment author can mark as solution');
      }
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('contractor_post_comments')
      .update(updateData)
      .eq('id', commentId)
      .select(`
        *,
        contractor:contractor_id (
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .single();

    if (updateError) {
      logger.error('Error updating comment', updateError, {
        service: 'contractor',
        commentId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to update comment');
    }

    const formattedComment = {
      id: updatedComment.id,
      post_id: updatedComment.post_id,
      contractor_id: updatedComment.contractor_id,
      comment_text: updatedComment.comment_text,
      parent_comment_id: updatedComment.parent_comment_id,
      is_solution: updatedComment.is_solution || false,
      likes_count: updatedComment.likes_count || 0,
      created_at: updatedComment.created_at,
      updated_at: updatedComment.updated_at,
      contractor: updatedComment.contractor ? {
        id: updatedComment.contractor.id,
        first_name: updatedComment.contractor.first_name,
        last_name: updatedComment.contractor.last_name,
        profile_image_url: updatedComment.contractor.profile_image_url,
      } : null,
    };

    return NextResponse.json({ comment: formattedComment });
  } catch (error) {
    logger.error('Error in PATCH /api/contractor/posts/[id]/comments/[commentId]', error, {
      service: 'contractor',
    });
    throw new InternalServerError('Internal server error');
  }
}

export async function DELETE(
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

    // Verify comment exists and belongs to user
    const { data: existingComment, error: fetchError } = await supabase
      .from('contractor_post_comments')
      .select('contractor_id, post_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !existingComment) {
      throw new NotFoundError('Comment not found');
    }

    if (existingComment.contractor_id !== user.id) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    // Delete comment (cascade will handle nested replies via database constraints)
    const { error: deleteError } = await supabase
      .from('contractor_post_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      logger.error('Error deleting comment', deleteError, {
        service: 'contractor',
        commentId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to delete comment');
    }

    // The trigger should automatically update comments_count on contractor_posts
    return NextResponse.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    logger.error('Error in DELETE /api/contractor/posts/[id]/comments/[commentId]', error, {
      service: 'contractor',
    });
    throw new InternalServerError('Internal server error');
  }
}

