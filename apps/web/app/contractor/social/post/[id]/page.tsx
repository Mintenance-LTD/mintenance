import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { redirect, notFound } from 'next/navigation';
import { PostDetailClient } from './components/PostDetailClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromCookies();
  const { id } = await params;

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

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
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (postError || !post) {
    notFound();
  }

  // Fetch user's like status
  const { data: userLike } = await supabase
    .from('contractor_post_likes')
    .select('id')
    .eq('post_id', id)
    .eq('contractor_id', user.id)
    .single();

  // Check if user is following the post author
  const { data: followStatus } = await supabase
    .from('contractor_follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', post.contractor_id)
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
    views_count: post.views_count || 0,
    liked: !!userLike,
    isFollowing: !!followStatus,
    contractor: post.contractor ? {
      id: post.contractor.id,
      first_name: post.contractor.first_name,
      last_name: post.contractor.last_name,
      profile_image_url: post.contractor.profile_image_url,
      city: post.contractor.city,
      country: post.contractor.country,
    } : null,
    // Additional fields based on post type
    skills_used: post.skills_used || [],
    materials_used: post.materials_used || [],
    project_duration: post.project_duration,
    project_cost: post.project_cost,
    help_category: post.help_category,
    urgency_level: post.urgency_level,
    budget_range: post.budget_range,
    item_name: post.item_name,
    item_condition: post.item_condition,
    rental_price: post.rental_price,
  };

  return <PostDetailClient post={formattedPost as any} currentUserId={user.id} />;
}

