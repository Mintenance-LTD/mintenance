import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

interface CommentUpdateData {
  updated_at: string;
  comment_text?: string;
  is_solution?: boolean;
  solution_verified_by?: string;
}

export const PATCH = withApiHandler({ roles: ['contractor'], rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  const commentId = params.commentId;
  const body = await request.json();
  const { comment_text, is_solution } = body;

  const { data: existingComment, error: fetchError } = await serverSupabase.from('contractor_post_comments').select('contractor_id, post_id').eq('id', commentId).single();

  if (fetchError || !existingComment) throw new NotFoundError('Comment not found');
  if (existingComment.contractor_id !== user.id) throw new ForbiddenError('You can only edit your own comments');

  const updateData: CommentUpdateData = { updated_at: new Date().toISOString() };

  if (comment_text !== undefined) {
    if (comment_text.trim().length === 0) throw new BadRequestError('Comment text cannot be empty');
    if (comment_text.length > 2000) throw new BadRequestError('Comment text must be 2000 characters or less');
    updateData.comment_text = comment_text.trim();
  }

  if (is_solution !== undefined) {
    const { data: post } = await serverSupabase.from('contractor_posts').select('contractor_id').eq('id', existingComment.post_id).single();
    if (post && (post.contractor_id === user.id || existingComment.contractor_id === user.id)) {
      updateData.is_solution = is_solution;
      if (is_solution) updateData.solution_verified_by = user.id;
    } else {
      throw new ForbiddenError('Only post author or comment author can mark as solution');
    }
  }

  const { data: updatedComment, error: updateError } = await serverSupabase.from('contractor_post_comments').update(updateData).eq('id', commentId).select(`*, contractor:contractor_id (id, first_name, last_name, profile_image_url)`).single();

  if (updateError) {
    logger.error('Error updating comment', updateError, { service: 'contractor', commentId, userId: user.id });
    throw new InternalServerError('Failed to update comment');
  }

  return NextResponse.json({ comment: { id: updatedComment.id, post_id: updatedComment.post_id, contractor_id: updatedComment.contractor_id, comment_text: updatedComment.comment_text, parent_comment_id: updatedComment.parent_comment_id, is_solution: updatedComment.is_solution || false, likes_count: updatedComment.likes_count || 0, created_at: updatedComment.created_at, updated_at: updatedComment.updated_at, contractor: updatedComment.contractor ? { id: updatedComment.contractor.id, first_name: updatedComment.contractor.first_name, last_name: updatedComment.contractor.last_name, profile_image_url: updatedComment.contractor.profile_image_url } : null } });
});

export const DELETE = withApiHandler({ roles: ['contractor'], rateLimit: { maxRequests: 30 } }, async (_req, { user, params }) => {
  const commentId = params.commentId;

  const { data: existingComment, error: fetchError } = await serverSupabase.from('contractor_post_comments').select('contractor_id, post_id').eq('id', commentId).single();

  if (fetchError || !existingComment) throw new NotFoundError('Comment not found');
  if (existingComment.contractor_id !== user.id) throw new ForbiddenError('You can only delete your own comments');

  const { error: deleteError } = await serverSupabase.from('contractor_post_comments').delete().eq('id', commentId);

  if (deleteError) {
    logger.error('Error deleting comment', deleteError, { service: 'contractor', commentId, userId: user.id });
    throw new InternalServerError('Failed to delete comment');
  }

  return NextResponse.json({ message: 'Comment deleted successfully' });
});
