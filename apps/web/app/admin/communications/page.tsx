import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { CommunicationsClient } from './components/CommunicationsClient';

export const metadata = {
  title: 'Communications | Admin | Mintenance',
};

export default async function AdminCommunicationsPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();

  const { data: announcements } = await supabase
    .from('admin_announcements')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <CommunicationsClient
      initialAnnouncements={announcements ?? []}
      adminId={user?.id ?? ''}
    />
  );
}
