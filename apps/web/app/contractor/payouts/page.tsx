import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { PayoutsPageClient } from './components/PayoutsPageClient';

export default async function PayoutsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch contractor payout accounts
  const { data: payoutAccounts } = await serverSupabase
    .from('contractor_payout_accounts')
    .select('*')
    .eq('contractor_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch contractor data for layout
  const { data: contractor } = await serverSupabase
    .from('users')
    .select('id, first_name, last_name, email, company_name, profile_image_url')
    .eq('id', user.id)
    .single();

  return (
    <PayoutsPageClient
      contractor={contractor}
      initialPayoutAccounts={payoutAccounts || []}
      userId={user.id}
      userEmail={user.email}
    />
  );
}

