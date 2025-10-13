import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { ContractorGalleryClient } from './components/ContractorGalleryClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ContractorGalleryPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: posts } = await supabase
    .from('contractor_posts')
    .select('*')
    .eq('contractor_id', user.id)
    .not('media_urls', 'is', null)
    .order('created_at', { ascending: false });

  const images = (posts || []).flatMap((post) =>
    (post.media_urls || []).map((imageUrl: string, index: number) => ({
      id: `${post.id}-${index}`,
      uri: imageUrl,
      title: post.title || 'Project Image',
      description: post.description || 'No description provided',
      category: post.post_type === 'portfolio' ? 'completed' : 'process',
      projectType: post.project_category || 'General Work',
      date: post.created_at,
      likes: post.likes_count || 0,
      liked: false,
    })),
  );

  return <ContractorGalleryClient images={images} />;
}
