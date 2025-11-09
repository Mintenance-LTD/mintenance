import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = params.id;
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
      console.error('Error fetching comments:', commentsError);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Fetch user's comment likes (if there's a likes table for comments)
    // For now, we'll structure comments with nested replies
    const formattedComments = (comments || []).map((comment: any) => ({
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
    console.error('Error in GET /api/contractor/posts/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = params.id;
    const body = await request.json();
    const { comment_text, parent_comment_id } = body;

    if (!comment_text || comment_text.trim().length === 0) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    if (comment_text.length > 2000) {
      return NextResponse.json({ error: 'Comment text must be 2000 characters or less' }, { status: 400 });
    }

    // Verify post exists and is active
    const { data: post, error: postError } = await supabase
      .from('contractor_posts')
      .select('id')
      .eq('id', postId)
      .eq('is_active', true)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found or inactive' }, { status: 404 });
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
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('contractor_post_comments')
      .insert({
        post_id: postId,
        contractor_id: user.id,
        comment_text: comment_text.trim(),
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
      console.error('Error creating comment:', commentError);
      return NextResponse.json({ error: 'Failed to create comment', details: commentError.message }, { status: 500 });
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
    console.error('Error in POST /api/contractor/posts/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

