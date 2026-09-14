import { useState, useEffect, useRef } from 'react';
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
  const paymentInFlight = useRef(false);
  const paymentCompleted = useRef(false);
  const paymentEpoch = useRef(0);

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

  // Server-authoritative fee breakdown. The platform fee is tier-aware and
  // (since 2026-05-22) uncapped — values the mobile client cannot derive
  // because it doesn't know the contractor's subscription tier. The local
  // PaymentService.calculateFees() hardcodes the legacy 5% + £50 cap, so it's
  // used only as a placeholder while the GET below is in flight; the displayed
  // numbers are always reconciled to whatever the server returns.
  const [serverFees, setServerFees] = useState<{
    platformFee: number;
    contractorPayout: number;
    totalAmount: number;
  } | null>(null);

  const fallbackFees = PaymentService.calculateFees(amount);
  const platformFee = serverFees?.platformFee ?? fallbackFees.platformFee;
  const contractorPayout =
    serverFees?.contractorPayout ?? fallbackFees.contractorAmount;
  const totalAmount = useEscrow
    ? (serverFees?.totalAmount ?? amount)
    : amount + platformFee;

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  // Fetch the server-calculated fee breakdown so the homeowner sees the same
  // tier-aware figures the backend will actually apply at escrow release.
  useEffect(() => {
    let cancelled = false;
    if (!jobId) return;

    (async () => {
      try {
        const res = await mobileApiClient.get<{
          fees: {
            platformFee: number;
            contractorPayout: number;
            totalAmount: number;
          } | null;
        }>(`/api/jobs/${jobId}/payment-details`);

        if (!cancelled && res.fees) {
          setServerFees({
            platformFee: res.fees.platformFee,
            contractorPayout: res.fees.contractorPayout,
            totalAmount: res.fees.totalAmount,
          });
        }
      } catch (err) {
        // Non-fatal — keep the local placeholder. The authoritative fee is
        // still applied server-side at release regardless of what's shown.
        logger.warn(
          'Failed to load server fee breakdown; using local estimate',
          {
            jobId,
            err: err instanceof Error ? err.message : String(err),
          }
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

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
    if (paymentInFlight.current || paymentCompleted.current) return;
    if (!selectedMethod || !userId) {
      Alert.alert('Error', 'Please select a payment method');
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
            amount,
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
          amount,
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
