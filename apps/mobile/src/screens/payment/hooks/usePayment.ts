import { useState, useEffect, useRef, useCallback } from 'react';
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
  const paymentInFlight = useRef(false);
  const paymentCompleted = useRef(false);
  const paymentEpoch = useRef(0);
  const methodLoadEpoch = useRef(0);

  // Holds the PaymentIntent created for THIS payment attempt. A "Try Again"
  // reuses this intent instead of minting a new one. Re-confirming a single
  // Stripe PaymentIntent can never charge the card twice (Stripe dedupes on
  // the intent); creating a fresh intent per retry is what risks a double
  // charge — see PaymentMethodService.confirmPayment's "DO NOT wrap with
  // retry" warning. A ref (not state) so the retry — which re-invokes the
  // SAME handlePayment closure via the Alert button — reads the latest value.
  const pendingIntentRef = useRef<{
    clientSecret: string;
    paymentIntentId?: string;
    providerSucceeded?: boolean;
  } | null>(null);

  useEffect(() => {
    paymentEpoch.current += 1;
    pendingIntentRef.current = null;
    paymentInFlight.current = false;
    paymentCompleted.current = false;
    setProcessing(false);
    return () => {
      paymentEpoch.current += 1;
    };
  }, [jobId, contractorId, userId]);

  const [serverFees, setServerFees] = useState<{
    platformFee: number;
    contractorPayout: number;
    totalAmount: number;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const quoteEpoch = useRef(0);
  const loadQuote = useCallback(async () => {
    const epoch = ++quoteEpoch.current;
    setServerFees(null);
    setQuoteError(null);
    setQuoteLoading(true);
    if (!jobId || !userId) {
      setQuoteError('Sign in and select a job to load its payment amount.');
      setQuoteLoading(false);
      return;
    }
    try {
      const response = await mobileApiClient.get<{
        fees: {
          platformFee: number;
          contractorPayout: number;
          totalAmount: number;
        } | null;
      }>(`/api/jobs/${jobId}/payment-details`);
      if (epoch !== quoteEpoch.current) return;
      const fees = response?.fees;
      if (
        !fees ||
        ![fees.platformFee, fees.contractorPayout, fees.totalAmount].every(
          (value) =>
            typeof value === 'number' && Number.isFinite(value) && value >= 0
        ) ||
        fees.totalAmount <= 0 ||
        fees.platformFee > fees.totalAmount ||
        fees.contractorPayout > fees.totalAmount
      ) {
        throw new Error('No valid payment quote is available for this job.');
      }
      setServerFees(fees);
    } catch {
      if (epoch === quoteEpoch.current)
        setQuoteError('Unable to load the payment amount. Please retry.');
    } finally {
      if (epoch === quoteEpoch.current) setQuoteLoading(false);
    }
  }, [jobId, userId]);
  useEffect(() => {
    void loadQuote();
    return () => {
      quoteEpoch.current += 1;
    };
  }, [loadQuote]);

  // Zero values are never displayed as a quote: the screen gates on quoteLoading/quoteError.
  const platformFee = serverFees?.platformFee ?? 0;
  const contractorPayout = serverFees?.contractorPayout ?? 0;
  const totalAmount = serverFees?.totalAmount ?? 0;

  const loadPaymentMethods = useCallback(async () => {
    const requestEpoch = ++methodLoadEpoch.current;
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const result = await PaymentService.getPaymentMethods();
      if (requestEpoch !== methodLoadEpoch.current) return;

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
      if (requestEpoch !== methodLoadEpoch.current) return;
      setError('Failed to load payment methods');
      logger.error('Failed to load payment methods', err);
    } finally {
      if (requestEpoch === methodLoadEpoch.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setPaymentMethods([]);
    setSelectedMethod(null);
    setError(null);
    void loadPaymentMethods();
    return () => {
      methodLoadEpoch.current += 1;
    };
  }, [loadPaymentMethods]);

  const handlePayment = async () => {
    if (paymentInFlight.current || paymentCompleted.current) return;
    if (!selectedMethod || !userId) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    if (quoteLoading || quoteError || !serverFees) {
      Alert.alert(
        'Payment unavailable',
        'Load the payment amount before trying again.'
      );
      return;
    }
    const epoch = paymentEpoch.current;
    paymentInFlight.current = true;
    setProcessing(true);
    try {
      if (useEscrow) {
        // Step 1: Create the payment intent ONCE. On a retry we reuse the
        // intent captured below rather than creating another — a second
        // create call would be a second chargeable intent and defeats the
        // single-charge guarantee.
        // 2026-05-23 audit-19 P1: paymentIntentSchema requires contractorId.
        // contractorId is already in the hook's options scope; thread it
        // through so the server can validate the request body.
        if (!pendingIntentRef.current) {
          const intentResult = await PaymentService.createPaymentIntent(
            jobId,
            serverFees.totalAmount,
            selectedMethod.id,
            contractorId
          );

          if (epoch !== paymentEpoch.current) return;
          if (
            intentResult.error ||
            !intentResult.clientSecret ||
            !intentResult.paymentIntentId
          ) {
            throw new Error(
              intentResult.error || 'Failed to create payment intent'
            );
          }

          pendingIntentRef.current = {
            clientSecret: intentResult.clientSecret,
            paymentIntentId: intentResult.paymentIntentId,
          };
        }

        const { clientSecret, paymentIntentId } = pendingIntentRef.current;

        // Retry application confirmation without asking Stripe to confirm an
        // already successful payment again. Keep this intent until escrow settles.
        if (!pendingIntentRef.current.providerSucceeded) {
          const confirmed = await PaymentService.confirmPayment({
            clientSecret,
            paymentMethodId: selectedMethod.id,
          });
          if (epoch !== paymentEpoch.current) return;
          if (confirmed.status !== 'Succeeded') {
            throw new Error('Payment confirmation failed');
          }
          pendingIntentRef.current.providerSucceeded = true;
        }

        const confirmation = await mobileApiClient.post<{
          success: boolean;
          status: string;
        }>('/api/payments/confirm-intent', { paymentIntentId, jobId });
        if (epoch !== paymentEpoch.current) return;
        if (confirmation?.success !== true || confirmation.status !== 'held') {
          throw new Error('Escrow confirmation is still pending');
        }
        paymentCompleted.current = true;

        Alert.alert(
          'Payment Successful',
          'Your payment has been placed in escrow and will be released when the job is completed.',
          [{ text: 'OK', onPress: onSuccess }]
        );
      } else {
        // Direct payment using processJobPayment (handles 3DS)
        const result = await PaymentService.processJobPayment(
          jobId,
          serverFees.totalAmount,
          selectedMethod.id
        );

        if (epoch !== paymentEpoch.current) return;
        if (result.requiresAction && result.clientSecret) {
          // Handle 3D Secure
          const confirmed = await PaymentService.confirmPayment({
            clientSecret: result.clientSecret,
            paymentMethodId: selectedMethod.id,
          });

          if (epoch !== paymentEpoch.current) return;
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
      if (epoch !== paymentEpoch.current) return;
      if (pendingIntentRef.current?.providerSucceeded) {
        logger.warn('Payment received; escrow confirmation pending', {
          jobId,
          paymentIntentId: pendingIntentRef.current.paymentIntentId,
          err: err instanceof Error ? err.message : String(err),
        });
        Alert.alert(
          'Payment Received',
          'Your payment was received. Escrow confirmation is still pending.',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Check Status', onPress: handlePayment },
          ]
        );
        return;
      }
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
      if (epoch === paymentEpoch.current) {
        paymentInFlight.current = false;
        setProcessing(false);
      }
    }
  };

  const resetRetry = () => {
    setRetryCount(0);
    // Changing the selected method must not discard an existing payment.
  };

  return {
    quoteLoading,
    quoteError,
    loadQuote,
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
