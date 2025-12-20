import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

// Type definition for comment update data
interface CommentUpdateData {
  updated_at: string;
  comment_text?: string;
  is_solution?: boolean;
  solution_verified_by?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (existingComment.contractor_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 });
    }

    // Build update payload
    const updateData: CommentUpdateData = {
      updated_at: new Date().toISOString(),
    };

    if (comment_text !== undefined) {
      if (comment_text.trim().length === 0) {
        return NextResponse.json({ error: 'Comment text cannot be empty' }, { status: 400 });
      }
      if (comment_text.length > 2000) {
        return NextResponse.json({ error: 'Comment text must be 2000 characters or less' }, { status: 400 });
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
        return NextResponse.json({ error: 'Only post author or comment author can mark as solution' }, { status: 403 });
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
      return NextResponse.json({ error: 'Failed to update comment', details: updateError.message }, { status: 500 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = await params;

    // Verify comment exists and belongs to user
    const { data: existingComment, error: fetchError } = await supabase
      .from('contractor_post_comments')
      .select('contractor_id, post_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (existingComment.contractor_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 });
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
      return NextResponse.json({ error: 'Failed to delete comment', details: deleteError.message }, { status: 500 });
    }

    // The trigger should automatically update comments_count on contractor_posts
    return NextResponse.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    logger.error('Error in DELETE /api/contractor/posts/[id]/comments/[commentId]', error, {
      service: 'contractor',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

