import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const updatePostSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(10000).optional(),
  images: z.array(z.string().url()).optional(),
  is_featured: z.boolean().optional(),
});

// Type definitions for post operations
interface PostUpdateData {
  updated_at: string;
  title?: string;
  content?: string;
  images?: string[];
  is_featured?: boolean;
}

const supabase = serverSupabase;

export async function GET(
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

    // Fetch post with contractor info
    const { data: post, error: postError } = await supabase
      .from('contractor_posts')
      .select(`
        *,
        contractor:contractor_id (
          id,
          first_name,
          last_name,
          profile_image_url,
          city,
          country
        )
      `)
      .eq('id', postId)
      .eq('is_active', true)
      .single();

    if (postError || !post) {
      throw new NotFoundError('Post not found');
    }

    // Increment views_count (track unique views)
    await supabase
      .from('contractor_posts')
      .update({ views_count: (post.views_count || 0) + 1 })
      .eq('id', postId);

    // Fetch user's like status
    const { data: userLike } = await supabase
      .from('contractor_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('contractor_id', user.id)
      .single();

    const formattedPost = {
      id: post.id,
      title: post.title || '',
      content: post.content || '',
      images: Array.isArray(post.images) ? post.images : [],
      post_type: post.post_type,
      created_at: post.created_at,
      updated_at: post.updated_at,
      likes_count: post.likes_count || 0,
      comments_count: post.comments_count || 0,
      shares_count: post.shares_count || 0,
      views_count: (post.views_count || 0) + 1, // Already incremented
      liked: !!userLike,
      contractor: post.contractor ? {
        id: post.contractor.id,
        first_name: post.contractor.first_name,
        last_name: post.contractor.last_name,
        profile_image_url: post.contractor.profile_image_url,
        city: post.contractor.city,
        country: post.contractor.country,
      } : null,
    };

    return NextResponse.json({ post: formattedPost });
  } catch (error) {
    logger.error('Error in GET /api/contractor/posts/[id]', error, {
      service: 'contractor',
    });
    throw new InternalServerError('Internal server error');
  }
}

export async function PATCH(
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

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = await params;
    const postId = id;
    const validation = await validateRequest(request, updatePostSchema);
    if (validation instanceof NextResponse) return validation;
    const { title, content, images, is_featured } = validation.data;

    // Verify post exists and belongs to user
    const { data: existingPost, error: fetchError } = await supabase
      .from('contractor_posts')
      .select('contractor_id')
      .eq('id', postId)
      .single();

    if (fetchError || !existingPost) {
      throw new NotFoundError('Post not found');
    }

    if (existingPost.contractor_id !== user.id) {
      throw new ForbiddenError('You can only edit your own posts');
    }

    // Build update payload
    const updateData: PostUpdateData = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      updateData.title = title.trim();
    }

    if (content !== undefined) {
      updateData.content = content.trim();
    }

    if (images !== undefined) {
      updateData.images = images;
    }

    if (is_featured !== undefined) {
      updateData.is_featured = is_featured;
    }

    // Update post
    const { data: updatedPost, error: updateError } = await supabase
      .from('contractor_posts')
      .update(updateData)
      .eq('id', postId)
      .select(`
        *,
        contractor:contractor_id (
          id,
          first_name,
          last_name,
          profile_image_url,
          city,
          country
        )
      `)
      .single();

    if (updateError) {
      logger.error('Error updating post', updateError, {
        service: 'contractor',
        postId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to update post');
    }

    // Fetch user's like status
    const { data: userLike } = await supabase
      .from('contractor_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('contractor_id', user.id)
      .single();

    const formattedPost = {
      id: updatedPost.id,
      title: updatedPost.title || '',
      content: updatedPost.content || '',
      images: Array.isArray(updatedPost.images) ? updatedPost.images : [],
      post_type: updatedPost.post_type,
      created_at: updatedPost.created_at,
      updated_at: updatedPost.updated_at,
      likes_count: updatedPost.likes_count || 0,
      comments_count: updatedPost.comments_count || 0,
      shares_count: updatedPost.shares_count || 0,
      views_count: updatedPost.views_count || 0,
      liked: !!userLike,
      contractor: updatedPost.contractor ? {
        id: updatedPost.contractor.id,
        first_name: updatedPost.contractor.first_name,
        last_name: updatedPost.contractor.last_name,
        profile_image_url: updatedPost.contractor.profile_image_url,
        city: updatedPost.contractor.city,
        country: updatedPost.contractor.country,
      } : null,
    };

    return NextResponse.json({ post: formattedPost });
  } catch (error) {
    logger.error('Error in PATCH /api/contractor/posts/[id]', error, {
      service: 'contractor',
    });
    throw new InternalServerError('Internal server error');
  }
}

export async function DELETE(
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

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = await params;
    const postId = id;

    // Verify post exists and belongs to user
    const { data: existingPost, error: fetchError } = await supabase
      .from('contractor_posts')
      .select('contractor_id')
      .eq('id', postId)
      .single();

    if (fetchError || !existingPost) {
      throw new NotFoundError('Post not found');
    }

    if (existingPost.contractor_id !== user.id) {
      throw new ForbiddenError('You can only delete your own posts');
    }

    // Soft delete: set is_active = false
    // Comments and likes will be cascade deleted via database constraints
    const { error: deleteError } = await supabase
      .from('contractor_posts')
      .update({ is_active: false })
      .eq('id', postId);

    if (deleteError) {
      logger.error('Error deleting post', deleteError, {
        service: 'contractor',
        postId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to delete post');
    }

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    logger.error('Error in DELETE /api/contractor/posts/[id]', error, {
      service: 'contractor',
    });
    throw new InternalServerError('Internal server error');
  }
}
