import type { Metadata } from 'next';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { CardEditorClient } from './components/CardEditorClient';

export const metadata: Metadata = {
  title: 'Contractor Business Card Editor | Mintenance',
  description: 'Design and customize your digital business card to share with homeowners and clients on Mintenance.',
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CardEditorPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return <CardEditorClient profile={profile || {}} />;
}
