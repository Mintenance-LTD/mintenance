import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = params;

    // Verify comment exists
    const { data: comment, error: fetchError } = await supabase
      .from('contractor_post_comments')
      .select('id, likes_count')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
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
      console.error('Error updating comment likes:', updateError);
      return NextResponse.json({ error: 'Failed to update comment likes', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      liked: true,
      likes_count: updatedComment.likes_count 
    });
  } catch (error) {
    console.error('Error in POST /api/contractor/posts/[id]/comments/[commentId]/like:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

