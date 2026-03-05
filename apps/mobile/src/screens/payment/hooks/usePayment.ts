import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { PaymentService } from '../../../services/PaymentService';
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
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
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

      const defaultMethod = result.methods.find((m: PaymentMethod) => m.isDefault);
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
        const intentResult = await PaymentService.createPaymentIntent(jobId, amount, selectedMethod.id);

        if (intentResult.error || !intentResult.clientSecret) {
          throw new Error(intentResult.error || 'Failed to create payment intent');
        }

        // Step 2: Confirm with Stripe SDK
        const confirmed = await PaymentService.confirmPayment({
          clientSecret: intentResult.clientSecret,
          paymentMethodId: selectedMethod.id,
        });

        if (confirmed.status !== 'Succeeded') {
          throw new Error('Payment confirmation failed');
        }

        // Step 3: Create escrow transaction record
        await PaymentService.createEscrowTransaction(
          jobId,
          userId,
          contractorId,
          amount
        );

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
