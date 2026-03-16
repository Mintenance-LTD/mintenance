import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
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

export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const postId = params.id as string;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { data: comments, error: commentsError } = await serverSupabase
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
      logger.error('Error fetching comments', commentsError, { service: 'contractor', postId, userId: user.id });
      throw new InternalServerError('Failed to fetch comments');
    }

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
        if (!replyMap.has(parentId)) replyMap.set(parentId, []);
        replyMap.get(parentId)!.push(comment);
      }
    });

    const commentsWithReplies = parentComments.map(comment => ({
      ...comment,
      replies: replyMap.get(comment.id) || [],
    }));

    return NextResponse.json({ comments: commentsWithReplies, total: formattedComments.length, limit, offset });
  }
);

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const postId = params.id as string;
    const body = await request.json();

    const commentSchema = z.object({
      comment_text: z.string().min(1).max(2000).transform(val => sanitizeMessage(val)),
      parent_comment_id: z.string().uuid().optional(),
    });

    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestError('Invalid comment data: ' + parsed.error.message);

    const { comment_text, parent_comment_id } = parsed.data;

    // Verify post exists and is active
    const { data: post, error: postError } = await serverSupabase
      .from('contractor_posts')
      .select('id')
      .eq('id', postId)
      .eq('is_active', true)
      .single();

    if (postError || !post) throw new NotFoundError('Post not found or inactive');

    // If parent_comment_id is provided, verify it exists
    if (parent_comment_id) {
      const { data: parentComment, error: parentError } = await serverSupabase
        .from('contractor_post_comments')
        .select('id, post_id')
        .eq('id', parent_comment_id)
        .eq('post_id', postId)
        .single();

      if (parentError || !parentComment) throw new NotFoundError('Parent comment not found');
    }

    const { data: comment, error: commentError } = await serverSupabase
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
      logger.error('Error creating comment', commentError, { service: 'contractor', postId, userId: user.id });
      throw new InternalServerError('Failed to create comment');
    }

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
  }
);
