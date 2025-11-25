import { EmbeddedCheckoutComponent } from '@/components/payments/EmbeddedCheckout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface CheckoutPageProps {
  searchParams: {
    priceId?: string;
    jobId?: string;
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
  const { priceId, jobId, contractorId, quantity } = await searchParams;

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
            contractorId={contractorId}
            quantity={quantity ? parseInt(quantity, 10) : 1}
            onSuccess={() => {
              console.log('Payment successful!');
            }}
            onError={(error) => {
              console.error('Payment error:', error);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

