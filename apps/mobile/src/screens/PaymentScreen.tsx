/**
 * PaymentScreen Component
 * 
 * Handles payment processing with Stripe integration and escrow functionality.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { PaymentService, PaymentMethod, PaymentIntent } from '../../services/PaymentService';
import { useAuth } from '../../contexts/AuthContext';

interface PaymentScreenProps {
  route: {
    params: {
  jobId: string;
  amount: number;
  contractorId: string;
      jobTitle: string;
      useEscrow?: boolean;
    };
  };
  navigation: any;
}

interface PaymentMethodOptionProps {
  method: PaymentMethod;
  isSelected: boolean;
  onSelect: () => void;
}

const PaymentMethodOption: React.FC<PaymentMethodOptionProps> = ({
  method,
  isSelected,
  onSelect,
}) => {
  const getMethodIcon = () => {
    switch (method.type) {
      case 'card':
        return 'card-outline';
      case 'bank_account':
        return 'business-outline';
      case 'paypal':
        return 'logo-paypal';
      default:
        return 'card-outline';
    }
  };

  const getMethodDetails = () => {
    if (method.type === 'card' && method.card) {
      return `${method.card.brand.toUpperCase()} •••• ${method.card.last4}`;
    }
    if (method.type === 'bank_account' && method.bankAccount) {
      return `${method.bankAccount.bankName} •••• ${method.bankAccount.last4}`;
    }
    return 'Payment Method';
  };

  return (
    <TouchableOpacity
      style={[styles.paymentMethodOption, isSelected && styles.selectedMethod]}
      onPress={onSelect}
    >
      <View style={styles.methodContent}>
        <View style={styles.methodIcon}>
          <Ionicons name={getMethodIcon() as any} size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.methodDetails}>
          <Text style={styles.methodType}>{getMethodDetails()}</Text>
          {method.isDefault && (
            <Text style={styles.defaultLabel}>Default</Text>
          )}
        </View>
      </View>
      {isSelected && (
        <Ionicons name="checkmark-circle" size={24} color={theme.colors.secondary} />
      )}
    </TouchableOpacity>
  );
};

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  route,
  navigation,
}) => {
  const { user } = useAuth();
  const { jobId, amount, contractorId, jobTitle, useEscrow = true } = route.params;
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);

  const platformFee = PaymentService.calculatePlatformFee(amount);
  const contractorPayout = PaymentService.calculateContractorPayout(amount);
  const totalAmount = useEscrow ? amount : amount + platformFee;

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    if (!user) return;

    try {
      const methods = await PaymentService.getPaymentMethods(user.id);
      setPaymentMethods(methods);
      
      // Select default method
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
    if (!selectedMethod || !user) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setProcessing(true);
    try {
      if (useEscrow) {
        // Create escrow payment
        const escrowPayment = await PaymentService.createEscrowPayment(
        jobId,
          contractorId,
        user.id,
          amount,
          'usd',
          ['Job completed successfully', 'Client approval']
      );

      Alert.alert(
        'Payment Successful',
          'Your payment has been placed in escrow and will be released when the job is completed.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Direct payment
        const intent = await PaymentService.createPaymentIntent(amount, 'usd', {
          jobId,
          contractorId,
          clientId: user.id,
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
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
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

  if (loading) {
    return <LoadingSpinner message="Loading payment options..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={loadPaymentMethods} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Payment" onBackPress={() => navigation.goBack()} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Job Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle}>{jobTitle}</Text>
            <Text style={styles.jobId}>Job ID: {jobId}</Text>
          </View>

          <View style={styles.amountBreakdown}>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Job Amount</Text>
              <Text style={styles.amountValue}>${amount.toFixed(2)}</Text>
            </View>
            
            {useEscrow && (
              <>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Platform Fee</Text>
                  <Text style={styles.amountValue}>${platformFee.toFixed(2)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Contractor Payout</Text>
                  <Text style={styles.amountValue}>${contractorPayout.toFixed(2)}</Text>
                </View>
              </>
            )}
            
            <View style={[styles.amountRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>
                {useEscrow ? 'Total (Escrow)' : 'Total'}
            </Text>
              <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          {paymentMethods.length === 0 ? (
            <TouchableOpacity style={styles.addMethodButton}>
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.addMethodText}>Add Payment Method</Text>
            </TouchableOpacity>
          ) : (
            paymentMethods.map(method => (
              <PaymentMethodOption
                key={method.id}
                method={method}
                isSelected={selectedMethod?.id === method.id}
                onSelect={() => setSelectedMethod(method)}
              />
            ))
          )}
        </View>

        {/* Escrow Information */}
        {useEscrow && (
          <View style={styles.escrowCard}>
            <View style={styles.escrowHeader}>
              <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.secondary} />
              <Text style={styles.escrowTitle}>Escrow Protection</Text>
            </View>
            <Text style={styles.escrowDescription}>
              Your payment is protected by escrow. Funds will be released to the contractor only after:
            </Text>
            <View style={styles.escrowConditions}>
              <Text style={styles.conditionItem}>• Job is marked as completed</Text>
              <Text style={styles.conditionItem}>• You approve the work</Text>
              <Text style={styles.conditionItem}>• No disputes are raised within 48 hours</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.paymentButtonContainer}>
        <TouchableOpacity
          style={[styles.paymentButton, processing && styles.paymentButtonDisabled]}
          onPress={handlePayment}
          disabled={processing || !selectedMethod}
        >
          {processing ? (
            <LoadingSpinner size="small" color={theme.colors.textInverse} />
          ) : (
            <>
              <Ionicons name="card-outline" size={20} color={theme.colors.textInverse} />
              <Text style={styles.paymentButtonText}>
                Pay ${totalAmount.toFixed(2)}
                </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  summaryTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  jobInfo: {
    marginBottom: theme.spacing.lg,
  },
  jobTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  jobId: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  amountBreakdown: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.lg,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  amountLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  amountValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  totalLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  paymentMethodOption: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  selectedMethod: {
    borderColor: theme.colors.secondary,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    marginRight: theme.spacing.md,
  },
  methodDetails: {
    flex: 1,
  },
  methodType: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  defaultLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.secondary,
    marginTop: theme.spacing.xs,
  },
  addMethodButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  addMethodText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  escrowCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  escrowTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
  },
  escrowDescription: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  escrowConditions: {
    paddingLeft: theme.spacing.md,
  },
  conditionItem: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  paymentButtonContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  paymentButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  paymentButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
    marginLeft: theme.spacing.sm,
  },
});