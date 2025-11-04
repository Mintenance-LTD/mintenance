import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { validateCSRF } from '@/lib/csrf-validator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Validate CSRF token
    const csrfValidation = await validateCSRF(request);
    if (!csrfValidation.valid) {
      return NextResponse.json({ error: csrfValidation.error || 'CSRF validation failed' }, { status: 403 });
    }

    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle async params in Next.js 15
    const resolvedParams = await Promise.resolve(params);
    const postId = resolvedParams.id;

    // Check if like already exists
    const { data: existingLike } = await supabase
      .from('contractor_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('contractor_id', user.id)
      .single();

    if (existingLike) {
      // Unlike: delete the like
      const { error: deleteError } = await supabase
        .from('contractor_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('contractor_id', user.id);

      if (deleteError) {
        console.error('Error unliking post:', deleteError);
        return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 });
      }

      // Get updated likes count
      const { data: post } = await supabase
        .from('contractor_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      return NextResponse.json({ 
        liked: false,
        likes_count: post?.likes_count || 0
      });
    } else {
      // Like: create the like
      const { error: insertError } = await supabase
        .from('contractor_post_likes')
        .insert({
          post_id: postId,
          contractor_id: user.id,
        });

      if (insertError) {
        console.error('Error liking post:', insertError);
        return NextResponse.json({ error: 'Failed to like post' }, { status: 500 });
      }

      // Get updated likes count
      const { data: post } = await supabase
        .from('contractor_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      return NextResponse.json({ 
        liked: true,
        likes_count: post?.likes_count || 0
      });
    }
  } catch (error) {
    console.error('Error in POST /api/contractor/posts/[id]/like:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

