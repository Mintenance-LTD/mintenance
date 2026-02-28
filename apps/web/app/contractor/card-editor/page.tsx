import type { Metadata } from 'next';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { CardEditorClient } from './components/CardEditorClient';

export const metadata: Metadata = {
  title: 'Contractor Business Card Editor | Mintenance',
  description: 'Design and customize your digital business card to share with homeowners and clients on Mintenance.',
};


export default async function CardEditorPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: profile } = await serverSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return <CardEditorClient profile={profile || {}} />;
}
