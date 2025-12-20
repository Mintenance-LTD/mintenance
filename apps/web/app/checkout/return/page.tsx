'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface SessionStatus {
  status: 'open' | 'complete' | 'expired';
  customer_email: string | null;
}

/**
 * Return page for Stripe Embedded Checkout
 * 
 * This page is shown after the customer completes or cancels checkout.
 * It retrieves the session status and displays appropriate messaging.
 */
function CheckoutReturnContent(): JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessionStatus(): Promise<void> {
      if (!sessionId) {
        setError('No session ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/payments/session-status?session_id=${sessionId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to retrieve session status');
        }

        const data = await response.json();
        setSessionStatus(data);

        // If session is still open, redirect back to checkout
        if (data.status === 'open') {
          router.push('/checkout');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSessionStatus();
  }, [sessionId, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Payment Verification Error</CardTitle>
            <CardDescription>We encountered an issue verifying your payment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionStatus?.status === 'complete') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <CardTitle>Payment Successful!</CardTitle>
            </div>
            <CardDescription>
              Thank you for your payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {sessionStatus.customer_email ? (
                  <>
                    A confirmation email will be sent to{' '}
                    <strong>{sessionStatus.customer_email}</strong>.
                  </>
                ) : (
                  'Your payment has been processed successfully.'
                )}
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/')} className="flex-1">
                Return to Home
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="flex-1"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionStatus?.status === 'expired') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Session Expired</CardTitle>
            <CardDescription>The checkout session has expired</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please start a new checkout session to complete your payment.
              </AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default case - session is open or unknown
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Processing Payment</CardTitle>
          <CardDescription>Please wait while we process your payment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutReturnPage(): JSX.Element {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CheckoutReturnContent />
    </Suspense>
  );
}
