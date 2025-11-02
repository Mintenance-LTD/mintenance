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
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
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
    console.error('Error in GET /api/contractor/posts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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
    const { title, content, images } = body;

    // Verify post exists and belongs to user
    const { data: existingPost, error: fetchError } = await supabase
      .from('contractor_posts')
      .select('contractor_id')
      .eq('id', postId)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (existingPost.contractor_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own posts' }, { status: 403 });
    }

    // Build update payload
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      if (title.trim().length === 0) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (content !== undefined) {
      if (content.trim().length === 0) {
        return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
      }
      updateData.content = content.trim();
    }

    if (images !== undefined) {
      updateData.images = Array.isArray(images) ? images : [];
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
      console.error('Error updating post:', updateError);
      return NextResponse.json({ error: 'Failed to update post', details: updateError.message }, { status: 500 });
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
    console.error('Error in PATCH /api/contractor/posts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = params.id;

    // Verify post exists and belongs to user
    const { data: existingPost, error: fetchError } = await supabase
      .from('contractor_posts')
      .select('contractor_id')
      .eq('id', postId)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (existingPost.contractor_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own posts' }, { status: 403 });
    }

    // Soft delete: set is_active = false
    // Comments and likes will be cascade deleted via database constraints
    const { error: deleteError } = await supabase
      .from('contractor_posts')
      .update({ is_active: false })
      .eq('id', postId);

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      return NextResponse.json({ error: 'Failed to delete post', details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/contractor/posts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

