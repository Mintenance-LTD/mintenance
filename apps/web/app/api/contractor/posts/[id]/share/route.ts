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

    // Verify post exists and is active
    const { data: post, error: postError } = await supabase
      .from('contractor_posts')
      .select('id, shares_count')
      .eq('id', postId)
      .eq('is_active', true)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found or inactive' }, { status: 404 });
    }

    // Increment shares_count
    const currentShares = post.shares_count || 0;
    const newSharesCount = currentShares + 1;

    const { data: updatedPost, error: updateError } = await supabase
      .from('contractor_posts')
      .update({ shares_count: newSharesCount })
      .eq('id', postId)
      .select('shares_count')
      .single();

    if (updateError) {
      console.error('Error updating share count:', updateError);
      return NextResponse.json({ error: 'Failed to track share', details: updateError.message }, { status: 500 });
    }

    // Generate shareable link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const shareLink = `${baseUrl}/contractor/social/post/${postId}`;

    return NextResponse.json({ 
      shares_count: updatedPost.shares_count,
      share_link: shareLink,
      message: 'Share tracked successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/contractor/posts/[id]/share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

