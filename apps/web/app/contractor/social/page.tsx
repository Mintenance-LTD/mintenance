import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { ContractorSocialClient } from './components/ContractorSocialClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ContractorSocialPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch posts with contractor info
  const { data: posts } = await supabase
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
    .eq('is_flagged', false)
    .order('created_at', { ascending: false })
    .limit(50);

  // Fetch user's likes
  const { data: userLikes } = await supabase
    .from('contractor_post_likes')
    .select('post_id')
    .eq('contractor_id', user.id);

  const likedPostIds = new Set(userLikes?.map(like => like.post_id) || []);

  // Format posts
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

  return <ContractorSocialClient posts={formattedPosts as any} currentUserId={user.id} />;
}
