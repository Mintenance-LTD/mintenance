import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ContractorLayoutShell } from '../../components/ContractorLayoutShell';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function PayoutRefreshPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: contractor } = await serverSupabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', user.id)
    .single();

  return (
    <ContractorLayoutShell
      contractor={contractor}
      email={contractor?.email || ''}
      userId={user.id}
      initialPathname="/contractor/payouts"
    >
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <div className="bg-white rounded-lg border p-8 text-center">
          <AlertCircle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Setup Not Complete</h1>
          <p className="text-gray-600 mb-6">
            It looks like you didn't finish setting up your payout account. Please complete the setup process to receive payments.
          </p>
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-700">
              You'll need to complete all required steps including bank account verification and identity confirmation.
            </AlertDescription>
          </Alert>
          <div className="space-y-4">
            <Link href="/contractor/payouts">
              <Button variant="primary" className="w-full">
                Continue Setup
              </Button>
            </Link>
            <Link href="/contractor/dashboard-enhanced">
              <Button variant="secondary" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </ContractorLayoutShell>
  );
}

