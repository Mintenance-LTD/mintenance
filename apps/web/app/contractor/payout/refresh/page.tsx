import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ContractorLayoutShell } from '../../components/ContractorLayoutShell';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contractor Payout Setup Incomplete | Mintenance',
  description:
    'Complete your payout account setup to start receiving payments for your maintenance work.',
};

export default async function PayoutRefreshPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: contractor } = await serverSupabase
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('id', user.id)
    .single();

  // 2026-05-13: server-side theme detection — same pattern used
  // across the contractor server pages.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  return (
    <ContractorLayoutShell
      contractor={contractor}
      email={contractor?.email || ''}
      userId={user.id}
      initialPathname='/contractor/payouts'
    >
      <div className='container mx-auto max-w-2xl py-8 px-4'>
        <div
          className={
            isMintEditorial
              ? 'card card-pad'
              : 'bg-white rounded-lg border p-8 text-center'
          }
          style={isMintEditorial ? { textAlign: 'center' } : undefined}
        >
          <AlertCircle className='h-16 w-16 text-yellow-600 mx-auto mb-4' />
          <h1
            className={isMintEditorial ? 't-h2' : 'text-2xl font-bold mb-2'}
            style={isMintEditorial ? { marginBottom: 8 } : undefined}
          >
            Setup not complete
          </h1>
          <p
            className={isMintEditorial ? 't-body' : 'text-gray-600 mb-6'}
            style={isMintEditorial ? { marginBottom: 20 } : undefined}
          >
            It looks like you didn&apos;t finish setting up your payout account.
            Please complete the setup process to receive payments.
          </p>
          <Alert className='mb-6 border-yellow-200 bg-yellow-50'>
            <AlertDescription className='text-yellow-700'>
              You'll need to complete all required steps including bank account
              verification and identity confirmation.
            </AlertDescription>
          </Alert>
          <div className='space-y-4'>
            <Link href='/contractor/payouts'>
              <Button variant='primary' className='w-full'>
                Continue Setup
              </Button>
            </Link>
            <Link href='/contractor/dashboard-enhanced'>
              <Button variant='secondary' className='w-full'>
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </ContractorLayoutShell>
  );
}
