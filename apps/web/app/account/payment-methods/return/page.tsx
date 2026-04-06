'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { StandardCard } from '@/components/ui/StandardCard';
import { Button } from '@/components/ui/Button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Return page for Stripe Elements confirmSetup redirect.
 * Stripe appends ?setup_intent=... &setup_intent_client_secret=... &redirect_status=...
 *
 * We only display status here — the actual payment method attachment
 * happens server-side via the setup_intent.succeeded webhook, which is
 * the only authoritative source (redirect_status can be spoofed).
 */
export default function PaymentMethodReturnPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReturnContent />
    </Suspense>
  );
}

function ReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectStatus = searchParams.get('redirect_status');
  const [message, setMessage] = useState<{
    kind: 'success' | 'pending' | 'error';
    title: string;
    body: string;
  } | null>(null);

  useEffect(() => {
    switch (redirectStatus) {
      case 'succeeded':
        setMessage({
          kind: 'success',
          title: 'Payment method saved',
          body: 'Your payment method has been added to your account.',
        });
        break;
      case 'processing':
        setMessage({
          kind: 'pending',
          title: 'Processing',
          body: 'Your bank is verifying the details. This can take a few business days for Direct Debit.',
        });
        break;
      case 'requires_payment_method':
        setMessage({
          kind: 'error',
          title: 'Could not save payment method',
          body: 'The details were declined. Please try a different payment method.',
        });
        break;
      default:
        setMessage({
          kind: 'pending',
          title: 'Checking status',
          body: 'Your payment method is being processed.',
        });
    }
  }, [redirectStatus]);

  if (!message) return <LoadingState />;

  const Icon =
    message.kind === 'success'
      ? CheckCircle2
      : message.kind === 'error'
        ? AlertCircle
        : Loader2;

  const iconColor =
    message.kind === 'success'
      ? 'text-green-600'
      : message.kind === 'error'
        ? 'text-red-600'
        : 'text-amber-600';

  return (
    <div className="mx-auto max-w-md p-6">
      <StandardCard>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <Icon
            className={`h-12 w-12 ${iconColor} ${
              message.kind === 'pending' ? 'animate-spin' : ''
            }`}
          />
          <h1 className="text-xl font-semibold text-gray-900">
            {message.title}
          </h1>
          <p className="text-sm text-gray-600">{message.body}</p>
          <Button
            onClick={() => router.push('/account/payment-methods')}
            className="mt-2"
          >
            Back to payment methods
          </Button>
        </div>
      </StandardCard>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-md p-6">
      <StandardCard>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      </StandardCard>
    </div>
  );
}
