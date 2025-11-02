import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const { reason } = body;

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('contractor_posts')
      .select('id, contractor_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Don't allow users to report their own posts
    if (post.contractor_id === user.id) {
      return NextResponse.json({ error: 'You cannot report your own post' }, { status: 400 });
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
      console.error('Error flagging post:', flagError);
      return NextResponse.json({ error: 'Failed to report post', details: flagError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Post reported successfully. It will be reviewed by moderators.' 
    });
  } catch (error) {
    console.error('Error in POST /api/contractor/posts/[id]/report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

