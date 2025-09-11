import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CardField, useConfirmPayment } from '@stripe/stripe-react-native';

interface StripePaymentFormProps {
  amount: number;
  clientSecret: string;
  onPaymentSuccess: (paymentIntentId: string) => Promise<void>;
  onPaymentError: (error: string) => void;
}

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  clientSecret,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const { confirmPayment } = useConfirmPayment();

  const handlePayment = async () => {
    if (!cardComplete || !clientSecret) {
      Alert.alert('Error', 'Please complete your card information');
      return;
    }

    setLoading(true);
    try {
      const { paymentIntent, error } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) throw new Error(error.message);
      if (paymentIntent) await onPaymentSuccess(paymentIntent.id);
    } catch (error: any) {
      onPaymentError(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Information</Text>

      <CardField
        testID='card-field'
        postalCodeEnabled
        placeholders={{
          number: '4242 4242 4242 4242',
          expiration: 'MM/YY',
          cvc: 'CVC',
          postalCode: '12345',
        }}
        cardStyle={{
          backgroundColor: '#FFFFFF',
          textColor: '#000000',
          fontSize: 16,
          placeholderColor: '#999999',
        }}
        style={styles.cardField}
        onCardChange={(cardDetails) => setCardComplete(!!cardDetails?.complete)}
      />

      <View style={styles.securityInfo}>
        <Text style={styles.securityText}>
          Your payment information is secure
        </Text>
        <Text style={styles.securitySubtext}>
          Powered by Stripe - PCI DSS compliant
        </Text>
      </View>

      <TouchableOpacity
        accessibilityState={{ disabled: !cardComplete || loading }}
        accessible
        style={[
          styles.payButton,
          (!cardComplete || loading) && styles.payButtonDisabled,
        ]}
        onPress={handlePayment}
        disabled={!cardComplete || loading}
      >
        {loading ? (
          <ActivityIndicator
            testID='activity-indicator'
            color='#fff'
            size='small'
          />
        ) : (
          <Text style={styles.payButtonText}>
            Pay ${amount.toFixed(2)} Securely
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 },
  cardField: {
    width: '100%',
    height: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  securityInfo: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  securityText: { fontSize: 14, color: '#1e40af', fontWeight: '500' },
  securitySubtext: { fontSize: 12, color: '#64748b', marginTop: 4 },
  payButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonDisabled: { backgroundColor: '#d1d5db' },
  payButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
