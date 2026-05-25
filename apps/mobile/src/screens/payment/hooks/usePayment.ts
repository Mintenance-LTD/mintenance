import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { PaymentService } from '../../../services/PaymentService';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { logger } from '../../../utils/logger';

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  isDefault: boolean;
  createdAt: string;
}

interface UsePaymentOptions {
  userId: string | undefined;
  jobId: string;
  contractorId: string;
  jobTitle: string;
  amount: number;
  useEscrow: boolean;
  onSuccess: () => void;
}

export function usePayment({
  userId,
  jobId,
  contractorId,
  jobTitle,
  amount,
  useEscrow,
  onSuccess,
}: UsePaymentOptions) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fees = PaymentService.calculateFees(amount);
  const platformFee = fees.platformFee;
  const contractorPayout = fees.contractorAmount;
  const totalAmount = useEscrow ? amount : amount + platformFee;

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    if (!userId) return;

    try {
      const result = await PaymentService.getPaymentMethods();

      if (result.error || !result.methods) {
        setError(result.error || 'Failed to load payment methods');
        return;
      }

      setPaymentMethods(result.methods);

      const defaultMethod = result.methods.find(
        (m: PaymentMethod) => m.isDefault
      );
      if (defaultMethod) {
        setSelectedMethod(defaultMethod);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load payment methods');
      logger.error('Failed to load payment methods', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod || !userId) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setProcessing(true);
    try {
      if (useEscrow) {
        // Step 1: Create payment intent via API
        // 2026-05-23 audit-19 P1: paymentIntentSchema requires contractorId.
        // contractorId is already in the hook's options scope; thread it
        // through so the server can validate the request body.
        const intentResult = await PaymentService.createPaymentIntent(
          jobId,
          amount,
          selectedMethod.id,
          contractorId
        );

        if (intentResult.error || !intentResult.clientSecret) {
          throw new Error(
            intentResult.error || 'Failed to create payment intent'
          );
        }

        // Step 2: Confirm with Stripe SDK
        const confirmed = await PaymentService.confirmPayment({
          clientSecret: intentResult.clientSecret,
          paymentMethodId: selectedMethod.id,
        });

        if (confirmed.status !== 'Succeeded') {
          throw new Error('Payment confirmation failed');
        }

        // 2026-05-26 audit-53 P1: explicitly POST /api/payments/
        // confirm-intent to flip the escrow row from 'pending' to
        // 'held'. The Stripe webhook does the same flip on
        // payment_intent.succeeded, but webhook delivery can lag
        // seconds-to-minutes; without this client-side handoff the
        // homeowner saw "Payment Successful" while the contractor
        // sat on "Waiting for Payment". The server-side handler is
        // idempotent (validateEscrowTransition gates pending->held;
        // a duplicate call from the webhook no-ops), so firing both
        // paths is safe. Non-fatal: if confirm-intent fails the
        // webhook still settles eventually.
        if (intentResult.paymentIntentId) {
          try {
            await mobileApiClient.post('/api/payments/confirm-intent', {
              paymentIntentId: intentResult.paymentIntentId,
              jobId,
            });
          } catch (confirmErr) {
            logger.warn('confirm-intent call failed; webhook will reconcile', {
              jobId,
              paymentIntentId: intentResult.paymentIntentId,
              err:
                confirmErr instanceof Error
                  ? confirmErr.message
                  : String(confirmErr),
            });
          }
        }

        Alert.alert(
          'Payment Successful',
          'Your payment has been placed in escrow and will be released when the job is completed.',
          [{ text: 'OK', onPress: onSuccess }]
        );
      } else {
        // Direct payment using processJobPayment (handles 3DS)
        const result = await PaymentService.processJobPayment(
          jobId,
          amount,
          selectedMethod.id
        );

        if (result.requiresAction && result.clientSecret) {
          // Handle 3D Secure
          const confirmed = await PaymentService.confirmPayment({
            clientSecret: result.clientSecret,
            paymentMethodId: selectedMethod.id,
          });

          if (confirmed.status !== 'Succeeded') {
            throw new Error('Payment confirmation failed');
          }
        } else if (!result.success) {
          throw new Error(result.error || 'Payment failed');
        }

        Alert.alert(
          'Payment Successful',
          'Your payment has been processed successfully.',
          [{ text: 'OK', onPress: onSuccess }]
        );
      }
    } catch (err) {
      logger.error('Payment failed', err);
      setRetryCount((prev) => prev + 1);
      Alert.alert(
        'Payment Failed',
        retryCount < 2
          ? 'There was a problem processing your payment. Would you like to try again?'
          : 'Payment could not be completed. Please check your connection and try a different payment method.',
        retryCount < 2
          ? [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Try Again', onPress: handlePayment },
            ]
          : [{ text: 'OK' }]
      );
    } finally {
      setProcessing(false);
    }
  };

  const resetRetry = () => setRetryCount(0);

  return {
    paymentMethods,
    selectedMethod,
    setSelectedMethod,
    loading,
    processing,
    error,
    platformFee,
    contractorPayout,
    totalAmount,
    handlePayment,
    loadPaymentMethods,
    retryCount,
    resetRetry,
  };
}
