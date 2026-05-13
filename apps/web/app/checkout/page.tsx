import type { JSX } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { EmbeddedCheckoutComponent } from '@/components/payments/EmbeddedCheckout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Checkout | Mintenance',
  description:
    'Complete your payment securely through Stripe for maintenance services on Mintenance.',
};

interface CheckoutPageProps {
  searchParams: {
    priceId?: string;
    jobId?: string;
    bidId?: string;
    contractorId?: string;
    quantity?: string;
  };
}

/**
 * Checkout Page
 *
 * Example usage:
 * /checkout?priceId=price_1234567890
 * /checkout?priceId=price_1234567890&jobId=xxx&contractorId=yyy&quantity=2
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<CheckoutPageProps['searchParams']>;
}): Promise<JSX.Element> {
  const { priceId, jobId, bidId, contractorId, quantity } = await searchParams;

  // Server-side theme detection — same pattern used on
  // /contractor/support and /contractor/customers.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (!priceId) {
    if (isMintEditorial) {
      return (
        <div
          className='col'
          style={{
            gap: 20,
            maxWidth: 640,
            margin: '32px auto',
            padding: '0 16px',
          }}
        >
          <div className='col' style={{ gap: 4 }}>
            <h1 className='t-h1'>Checkout</h1>
            <p className='t-body'>Missing Price ID.</p>
          </div>
          <div className='card card-pad'>
            <p className='t-body'>
              Please provide a Price ID in the URL:
              <br />
              <code style={{ color: 'var(--me-brand)', fontWeight: 600 }}>
                /checkout?priceId=price_xxx
              </code>
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className='container mx-auto p-8'>
        <Card>
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
            <CardDescription>Missing Price ID</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>
              Please provide a Price ID in the URL: /checkout?priceId=price_xxx
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isMintEditorial) {
    return (
      <div
        className='col'
        style={{
          gap: 20,
          maxWidth: 720,
          margin: '32px auto',
          padding: '0 16px',
        }}
      >
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Complete your payment</h1>
          <p className='t-body'>
            Secure checkout powered by Stripe. Your card details never touch our
            servers.
          </p>
        </div>
        <ErrorBoundary>
          <div className='card card-pad'>
            <EmbeddedCheckoutComponent
              priceId={priceId}
              jobId={jobId}
              bidId={bidId}
              contractorId={contractorId}
              quantity={quantity ? parseInt(quantity, 10) : 1}
              successUrl={jobId ? `/jobs/${jobId}` : '/dashboard'}
            />
          </div>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-8'>
      <ErrorBoundary>
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>Secure checkout powered by Stripe</CardDescription>
          </CardHeader>
          <CardContent>
            <EmbeddedCheckoutComponent
              priceId={priceId}
              jobId={jobId}
              bidId={bidId}
              contractorId={contractorId}
              quantity={quantity ? parseInt(quantity, 10) : 1}
              successUrl={jobId ? `/jobs/${jobId}` : '/dashboard'}
            />
          </CardContent>
        </Card>
      </ErrorBoundary>
    </div>
  );
}
