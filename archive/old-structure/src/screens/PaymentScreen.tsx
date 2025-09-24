import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Button from '../components/ui/Button';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { PaymentService } from '../services/PaymentService';
import { useAuth } from '../contexts/AuthContext';
// Removed unused Ionicons import
import { theme } from '../theme';
import { StripePaymentForm } from '../components/StripePaymentForm';
import { config } from '../config/environment';

interface PaymentParams {
  jobId: string;
  amount: number;
  contractorId: string;
}

interface Props {
  route: RouteProp<{ params: PaymentParams }>;
  navigation: StackNavigationProp<any>;
}

const PaymentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, amount, contractorId } = route.params || ({} as PaymentParams);
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initializingPayment, setInitializingPayment] = useState(false);

  const handlePayment = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to make a payment');
      return;
    }

    if (config.stripePublishableKey) {
      try {
        setInitializingPayment(true);
        const paymentIntent = await PaymentService.createJobPayment(
          jobId,
          amount
        );
        setClientSecret(paymentIntent.client_secret);
      } catch (error: any) {
        Alert.alert(
          'Payment Error',
          error.message || 'Unable to initialize payment'
        );
      } finally {
        setInitializingPayment(false);
      }
      return;
    }

    // Demo flow when Stripe is not configured
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      Alert.alert(
        'Demo Payment',
        'Stripe is not configured. This is a demo flow only.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert(
        'Payment Failed',
        error.message || 'Unable to process payment'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStripeSuccess = async (paymentIntentId: string) => {
    try {
      if (!user) throw new Error('User not authenticated');
      const escrow = await PaymentService.createEscrowTransaction(
        jobId,
        user.id,
        contractorId,
        amount
      );
      await PaymentService.holdPaymentInEscrow(escrow.id, paymentIntentId);

      Alert.alert(
        'Payment Successful',
        'Payment has been held in escrow and will be released when the job is completed.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert(
        'Payment Error',
        error.message || 'Failed to finalize escrow payment'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.paymentInfo}>
          <Text style={styles.title}>Secure Escrow Payment</Text>
          <Text style={styles.description}>
            Your payment will be held securely until the job is completed to
            your satisfaction.
          </Text>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount:</Text>
            <Text style={styles.amount}>${amount.toFixed(2)}</Text>
          </View>

          <View style={styles.escrowInfo}>
            <Text style={styles.escrowTitle}>How Escrow Works:</Text>
            <Text style={styles.escrowText}>
              • Payment is held securely by Mintenance
            </Text>
            <Text style={styles.escrowText}>
              • Funds are released when job is marked complete
            </Text>
            <Text style={styles.escrowText}>
              • Full refund if work is not satisfactory
            </Text>
            <Text style={styles.escrowText}>
              • Dispute resolution available if needed
            </Text>
          </View>
        </View>

        <View style={styles.paymentMethodContainer}>
          <Text style={styles.paymentMethodTitle}>Payment Method</Text>
          {clientSecret && config.stripePublishableKey ? (
            <StripePaymentForm
              amount={amount}
              clientSecret={clientSecret}
              onPaymentSuccess={handleStripeSuccess}
              onPaymentError={(msg) => Alert.alert('Payment Error', msg)}
            />
          ) : (
            <>
              <View style={styles.mockCardContainer}>
                <Text style={styles.mockCardText}>**** **** **** 4242</Text>
                <Text style={styles.mockCardSubtext}>Visa ending in 4242</Text>
              </View>
              {!config.stripePublishableKey && (
                <Text style={styles.mockNote}>
                  * Stripe is not configured. Using demo payment flow.
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        {!clientSecret && (
          <Button
            variant='primary'
            title={
              initializingPayment || loading
                ? 'Processing...'
                : `Pay $${amount.toFixed(2)}`
            }
            onPress={handlePayment}
            disabled={initializingPayment || loading}
            loading={initializingPayment || loading}
            fullWidth
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 18,
    color: theme.colors.textInverse,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
  },
  placeholder: { width: 50 },
  content: { flex: 1, padding: 20 },
  paymentInfo: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 10 },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginBottom: 20,
  },
  amountLabel: { fontSize: 18, fontWeight: '600', color: '#333' },
  amount: { fontSize: 24, fontWeight: 'bold', color: theme.colors.info },
  escrowInfo: { backgroundColor: '#E8F5E8', padding: 15, borderRadius: 8 },
  escrowTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  escrowText: { fontSize: 14, color: '#2E7D32', marginBottom: 5 },
  paymentMethodContainer: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 12,
  },
  paymentMethodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 15,
  },
  mockCardContainer: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
  },
  mockCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 5,
  },
  mockCardSubtext: { fontSize: 14, color: theme.colors.textSecondary },
  mockNote: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
});

export default PaymentScreen;
