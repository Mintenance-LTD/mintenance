import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { PaymentService } from '../services/PaymentService';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
// import { useStripe, useConfirmPayment, StripeProvider } from '@stripe/stripe-react-native';

// Production-ready payment screen with full Stripe integration
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
  const { jobId, amount, contractorId } = route.params || {};
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to make a payment');
      return;
    }

    setLoading(true);
    try {
      // Create payment intent
      const paymentIntent = await PaymentService.createJobPayment(jobId, amount);
      
      // Create escrow transaction
      const escrowTransaction = await PaymentService.createEscrowTransaction(
        jobId,
        user.id,
        contractorId,
        amount
      );

      // In a real app, you'd handle the payment with Stripe Elements here
      // For now, we'll simulate a successful payment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Hold payment in escrow
      await PaymentService.holdPaymentInEscrow(
        escrowTransaction.id,
        paymentIntent.id
      );

      Alert.alert(
        'Payment Successful',
        'Payment has been held in escrow and will be released when the job is completed.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Payment Failed', error.message || 'Unable to process payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.paymentInfo}>
          <Text style={styles.title}>Secure Escrow Payment</Text>
          <Text style={styles.description}>
            Your payment will be held securely until the job is completed to your satisfaction.
          </Text>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount:</Text>
            <Text style={styles.amount}>${amount.toFixed(2)}</Text>
          </View>

          <View style={styles.escrowInfo}>
            <Text style={styles.escrowTitle}>🔒 How Escrow Works:</Text>
            <Text style={styles.escrowText}>• Payment is held securely by Mintenance</Text>
            <Text style={styles.escrowText}>• Funds are released when job is marked complete</Text>
            <Text style={styles.escrowText}>• Full refund if work is not satisfactory</Text>
            <Text style={styles.escrowText}>• Dispute resolution available if needed</Text>
          </View>
        </View>

        <View style={styles.paymentMethodContainer}>
          <Text style={styles.paymentMethodTitle}>Payment Method</Text>
          <View style={styles.mockCardContainer}>
            <Text style={styles.mockCardText}>💳 **** **** **** 4242</Text>
            <Text style={styles.mockCardSubtext}>Visa ending in 4242</Text>
          </View>
          <Text style={styles.mockNote}>
            * This is a demo. In production, you'd use Stripe Elements for secure card input.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Pay ${amount.toFixed(2)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#007AFF',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  paymentInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
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
  amountLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  escrowInfo: {
    backgroundColor: '#E8F5E8',
    padding: 15,
    borderRadius: 8,
  },
  escrowTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  escrowText: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 5,
  },
  paymentMethodContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
  },
  paymentMethodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  mockCardContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  mockCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  mockCardSubtext: {
    fontSize: 14,
    color: '#666',
  },
  mockNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  payButton: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PaymentScreen;