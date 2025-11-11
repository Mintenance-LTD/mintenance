'use client';

import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PayoutSuccessClientProps {
  hasPaymentSetup: boolean;
}

export function PayoutSuccessClient({ hasPaymentSetup }: PayoutSuccessClientProps) {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="bg-white rounded-lg border p-8 text-center">
        {hasPaymentSetup ? (
          <>
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment Setup Complete!</h1>
            <p className="text-gray-600 mb-6">
              Your payout account has been successfully set up. You can now receive payments from completed jobs.
            </p>
            <div className="space-y-4">
              <Link href="/contractor/payouts">
                <Button variant="primary" className="w-full">
                  View Payout Accounts
                </Button>
              </Link>
              <Link href="/contractor/dashboard-enhanced">
                <Button variant="secondary" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Setup In Progress</h1>
            <p className="text-gray-600 mb-6">
              Your payment setup is being processed. This may take a few moments. If you've completed all steps, 
              please wait a moment and refresh this page.
            </p>
            <div className="space-y-4">
              <Button
                variant="primary"
                className="w-full"
                onClick={handleRefresh}
              >
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refresh Status
              </Button>
              <Link href="/contractor/payouts">
                <Button variant="secondary" className="w-full">
                  Back to Payouts
                </Button>
              </Link>
            </div>
            <Alert className="mt-6 border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-700">
                If setup doesn't complete within a few minutes, please contact support or try setting up again from the payouts page.
              </AlertDescription>
            </Alert>
          </>
        )}
      </div>
    </div>
  );
}

