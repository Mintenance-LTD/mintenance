import type { JSX } from 'react';
import type { Metadata } from 'next';
import { EmbeddedCheckoutComponent } from '@/components/payments/EmbeddedCheckout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { logger } from '@mintenance/shared';

export const metadata: Metadata = {
  title: 'Checkout | Mintenance',
  description: 'Complete your payment securely through Stripe for maintenance services on Mintenance.',
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
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<CheckoutPageProps['searchParams']> }): Promise<JSX.Element> {
  const { priceId, jobId, bidId, contractorId, quantity } = await searchParams;

  if (!priceId) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
            <CardDescription>Missing Price ID</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please provide a Price ID in the URL: /checkout?priceId=price_xxx
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
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
            onSuccess={() => {
              logger.info('Payment successful!');
            }}
            onError={(error) => {
              logger.error('Payment error:', error);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

