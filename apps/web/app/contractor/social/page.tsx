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

  const { data: posts } = await supabase
    .from('contractor_posts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(50);

  return <ContractorSocialClient posts={posts || []} />;
}
