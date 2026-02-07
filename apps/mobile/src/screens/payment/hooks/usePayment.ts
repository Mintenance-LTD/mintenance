import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { PaymentService, PaymentMethod } from '../../../services/PaymentService';
import { logger } from '../../../utils/logger';

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

  const platformFee = PaymentService.calculatePlatformFee(amount);
  const contractorPayout = PaymentService.calculateContractorPayout(amount);
  const totalAmount = useEscrow ? amount : amount + platformFee;

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    if (!userId) return;

    try {
      const methods = await PaymentService.getPaymentMethods(userId);
      setPaymentMethods(methods);

      const defaultMethod = methods.find(m => m.isDefault);
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
        await PaymentService.createEscrowPayment(
          jobId,
          contractorId,
          userId,
          amount,
          'usd',
          ['Job completed successfully', 'Client approval']
        );

        Alert.alert(
          'Payment Successful',
          'Your payment has been placed in escrow and will be released when the job is completed.',
          [{ text: 'OK', onPress: onSuccess }]
        );
      } else {
        const intent = await PaymentService.createPaymentIntent(amount, 'usd', {
          jobId,
          contractorId,
          clientId: userId,
          description: `Payment for ${jobTitle}`,
        });

        const confirmedIntent = await PaymentService.confirmPaymentIntent(
          intent.id,
          selectedMethod.id
        );

        if (confirmedIntent.status === 'succeeded') {
          Alert.alert(
            'Payment Successful',
            'Your payment has been processed successfully.',
            [{ text: 'OK', onPress: onSuccess }]
          );
        } else {
          throw new Error('Payment confirmation failed');
        }
      }
    } catch (err) {
      Alert.alert('Payment Failed', 'Please try again or contact support.');
      logger.error('Payment failed', err);
    } finally {
      setProcessing(false);
    }
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
  };
}
