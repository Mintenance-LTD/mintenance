import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ContractorLayoutShell } from '../../components/ContractorLayoutShell';
import { PayoutSuccessClient } from './components/PayoutSuccessClient';

export const metadata: Metadata = {
  title: 'Contractor Payout Setup Complete | Mintenance',
  description: 'Your payout account has been successfully configured. You are ready to receive payments.',
};

export default async function PayoutSuccessPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Verify payment setup is complete
  const { data: contractor } = await serverSupabase
    .from('users')
    .select('stripe_connect_account_id, first_name, last_name, email')
    .eq('id', user.id)
    .single();

  const hasPaymentSetup = !!contractor?.stripe_connect_account_id;

  return (
    <ContractorLayoutShell
      contractor={contractor}
      email={contractor?.email || ''}
      userId={user.id}
      initialPathname="/contractor/payouts"
    >
      <PayoutSuccessClient hasPaymentSetup={hasPaymentSetup} />
    </ContractorLayoutShell>
  );
}
