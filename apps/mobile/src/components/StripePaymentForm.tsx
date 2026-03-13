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
    if (loading || !cardComplete || !clientSecret) {
      if (!cardComplete || !clientSecret) {
        Alert.alert('Error', 'Please complete your card information');
      }
      return;
    }

    setLoading(true);
    try {
      const { paymentIntent, error } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) throw new Error(error.message);
      if (paymentIntent) await onPaymentSuccess(paymentIntent.id);
    } catch (error) {
      onPaymentError(error instanceof Error ? error.message : 'Payment failed');
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
          textColor: '#222222',
          fontSize: 15,
          placeholderColor: '#B0B0B0',
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
        testID='pay-button'
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
            color='#FFFFFF'
            size='small'
          />
        ) : (
          <Text style={styles.payButtonText}>
            Pay £{amount.toFixed(2)} Securely
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 16,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginBottom: 20,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  securityInfo: {
    backgroundColor: '#F7F7F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  securitySubtext: {
    fontSize: 12,
    color: '#717171',
    marginTop: 6,
  },
  payButton: {
    backgroundColor: '#222222',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#EBEBEB',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
