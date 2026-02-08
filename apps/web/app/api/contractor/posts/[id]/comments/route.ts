import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { z } from 'zod';
import { sanitizeMessage } from '@/lib/sanitizer';

// Type definitions for comments
interface CommentContractor {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string | null;
}

interface CommentRecord {
  id: string;
  post_id: string;
  contractor_id: string;
  comment_text: string;
  parent_comment_id: string | null;
  is_solution?: boolean;
  likes_count?: number;
  created_at: string;
  updated_at: string;
  contractor?: CommentContractor;
}

interface FormattedComment {
  id: string;
  post_id: string;
  contractor_id: string;
  comment_text: string;
  parent_comment_id: string | null;
  is_solution: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
  contractor: CommentContractor | null;
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

    const { id } = await params;
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Authentication required');
    }

    const postId = id;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Fetch comments with contractor info
    const { data: comments, error: commentsError } = await supabase
      .from('contractor_post_comments')
      .select(`
        *,
        contractor:contractor_id (
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .eq('post_id', postId)
      .eq('is_flagged', false)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (commentsError) {
      logger.error('Error fetching comments', commentsError, {
        service: 'contractor',
        postId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to fetch comments');
    }

    // Fetch user's comment likes (if there's a likes table for comments)
    // For now, we'll structure comments with nested replies
    const formattedComments: FormattedComment[] = (comments || []).map((comment: CommentRecord) => ({
      id: comment.id,
      post_id: comment.post_id,
      contractor_id: comment.contractor_id,
      comment_text: comment.comment_text,
      parent_comment_id: comment.parent_comment_id,
      is_solution: comment.is_solution || false,
      likes_count: comment.likes_count || 0,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      contractor: comment.contractor ? {
        id: comment.contractor.id,
        first_name: comment.contractor.first_name,
        last_name: comment.contractor.last_name,
        profile_image_url: comment.contractor.profile_image_url,
      } : null,
    }));

    // Organize comments into tree structure (parent comments with nested replies)
    const parentComments = formattedComments.filter(c => !c.parent_comment_id);
    const replyMap = new Map<string, typeof formattedComments>();
    
    formattedComments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parentId = comment.parent_comment_id;
        if (!replyMap.has(parentId)) {
          replyMap.set(parentId, []);
        }
        replyMap.get(parentId)!.push(comment);
      }
    });

    const commentsWithReplies = parentComments.map(comment => ({
      ...comment,
      replies: replyMap.get(comment.id) || [],
    }));

    return NextResponse.json({ 
      comments: commentsWithReplies,
      total: formattedComments.length,
      limit,
      offset 
    });
  } catch (error) {
    logger.error('Error in GET /api/contractor/posts/[id]/comments', error, {
      service: 'contractor',
    });
    throw new InternalServerError('Internal server error');
  }
}

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

    // Create validation schema with sanitization
    const commentSchema = z.object({
      comment_text: z.string().min(1).max(2000).transform(val => sanitizeMessage(val)),
      parent_comment_id: z.string().uuid().optional(),
    });

    const parsed = commentSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestError('Invalid comment data: ' + parsed.error.message);
    }

    const { comment_text, parent_comment_id } = parsed.data;

    // Verify post exists and is active
    const { data: post, error: postError } = await supabase
      .from('contractor_posts')
      .select('id')
      .eq('id', postId)
      .eq('is_active', true)
      .single();

    if (postError || !post) {
      throw new NotFoundError('Post not found or inactive');
    }

    // If parent_comment_id is provided, verify it exists
    if (parent_comment_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('contractor_post_comments')
        .select('id, post_id')
        .eq('id', parent_comment_id)
        .eq('post_id', postId)
        .single();

      if (parentError || !parentComment) {
        throw new NotFoundError('Parent comment not found');
      }
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('contractor_post_comments')
      .insert({
        post_id: postId,
        contractor_id: user.id,
        comment_text,
        parent_comment_id: parent_comment_id || null,
        likes_count: 0,
        is_flagged: false,
      })
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

    if (commentError) {
      logger.error('Error creating comment', commentError, {
        service: 'contractor',
        postId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to create comment');
    }

    // The trigger should automatically update comments_count on contractor_posts
    // But we'll verify the post was updated
    const formattedComment = {
      id: comment.id,
      post_id: comment.post_id,
      contractor_id: comment.contractor_id,
      comment_text: comment.comment_text,
      parent_comment_id: comment.parent_comment_id,
      is_solution: comment.is_solution || false,
      likes_count: comment.likes_count || 0,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      contractor: comment.contractor ? {
        id: comment.contractor.id,
        first_name: comment.contractor.first_name,
        last_name: comment.contractor.last_name,
        profile_image_url: comment.contractor.profile_image_url,
      } : null,
      replies: [],
    };

    return NextResponse.json({ comment: formattedComment }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/contractor/posts/[id]/comments', error, {
      service: 'contractor',
    });
    throw new InternalServerError('Internal server error');
  }
}

