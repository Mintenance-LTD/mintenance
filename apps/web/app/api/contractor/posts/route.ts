import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const postType = searchParams.get('post_type');
    const search = searchParams.get('search');
    const location = searchParams.get('location');
    const sort = searchParams.get('sort') || 'newest';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const followingOnly = searchParams.get('following') === 'true';

    // Build query
    let query = supabase
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
      .eq('is_active', true)
      .eq('is_flagged', false);

    // Filter by post type
    if (postType && postType !== 'all') {
      query = query.eq('post_type', postType);
    }

    // Filter by following only
    if (followingOnly) {
      // Get list of contractors the user is following
      const { data: following } = await supabase
        .from('contractor_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];
      if (followingIds.length > 0) {
        query = query.in('contractor_id', followingIds);
      } else {
        // User follows no one, return empty array
        return NextResponse.json({ posts: [], total: 0 });
      }
    }

    // Search filter (title or content)
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Location filter (city) - Note: This filters by contractor's city, not post location
    // For more precise location filtering, we'd need to join users table differently
    // For now, we'll skip this filter as nested field filtering doesn't work well with Supabase
    // TODO: Implement location filtering via separate query or postgres function

    // Apply sorting
    switch (sort) {
      case 'popular':
        query = query.order('likes_count', { ascending: false });
        break;
      case 'most_commented':
        query = query.order('comments_count', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Fetch user's likes
    const { data: userLikes } = await supabase
      .from('contractor_post_likes')
      .select('post_id')
      .eq('contractor_id', user.id);

    const likedPostIds = new Set(userLikes?.map(like => like.post_id) || []);

    // Map posts to include liked status and format images
    const formattedPosts = (posts || []).map((post: any) => ({
      id: post.id,
      title: post.title || '',
      content: post.content || '',
      images: Array.isArray(post.images) ? post.images : [],
      post_type: post.post_type,
      created_at: post.created_at,
      likes_count: post.likes_count || 0,
      comments_count: post.comments_count || 0,
      shares_count: post.shares_count || 0,
      views_count: post.views_count || 0,
      liked: likedPostIds.has(post.id),
      contractor: post.contractor ? {
        id: post.contractor.id,
        first_name: post.contractor.first_name,
        last_name: post.contractor.last_name,
        profile_image_url: post.contractor.profile_image_url,
        city: post.contractor.city,
        country: post.contractor.country,
      } : null,
    }));

    return NextResponse.json({ 
      posts: formattedPosts,
      total: formattedPosts.length,
      limit,
      offset 
    });
  } catch (error) {
    console.error('Error in GET /api/contractor/posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      content, 
      images = [], 
      post_type = 'work_showcase',
      job_id,
      skills_used,
      materials_used,
      project_duration,
      project_cost,
      latitude,
      longitude,
      location_radius = 50
    } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // Validate post_type
    const validPostTypes = ['work_showcase', 'help_request', 'tip_share', 'equipment_share', 'referral_request'];
    if (!validPostTypes.includes(post_type)) {
      return NextResponse.json({ error: `Invalid post_type. Must be one of: ${validPostTypes.join(', ')}` }, { status: 400 });
    }

    // Create post
    const { data: post, error: postError } = await supabase
      .from('contractor_posts')
      .insert({
        contractor_id: user.id,
        title: title.trim(),
        content: content.trim(),
        post_type,
        images: Array.isArray(images) ? images : [],
        job_id: job_id || null,
        skills_used: Array.isArray(skills_used) ? skills_used : null,
        materials_used: Array.isArray(materials_used) ? materials_used : null,
        project_duration: project_duration || null,
        project_cost: project_cost || null,
        latitude: latitude || null,
        longitude: longitude || null,
        location_radius: location_radius || 50,
        is_active: true,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        views_count: 0,
      })
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

    if (postError) {
      console.error('Error creating post:', postError);
      return NextResponse.json({ error: 'Failed to create post', details: postError.message }, { status: 500 });
    }

    const formattedPost = {
      id: post.id,
      title: post.title || '',
      content: post.content || '',
      images: Array.isArray(post.images) ? post.images : [],
      post_type: post.post_type,
      created_at: post.created_at,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      views_count: 0,
      liked: false,
      contractor: post.contractor ? {
        id: post.contractor.id,
        first_name: post.contractor.first_name,
        last_name: post.contractor.last_name,
        profile_image_url: post.contractor.profile_image_url,
        city: post.contractor.city,
        country: post.contractor.country,
      } : null,
    };

    return NextResponse.json({ post: formattedPost }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/contractor/posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

