/**
 * PaymentScreen Component
 *
 * Handles payment processing with Stripe integration and escrow functionality.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../components/shared';
import { useAuth } from '../contexts/AuthContext';
import { PaymentSummaryCard } from './payment/components/PaymentSummaryCard';
import { EscrowInfoCard } from './payment/components/EscrowInfoCard';
import { PaymentMethodOption } from './payment/components/PaymentMethodOption';
import { usePayment } from './payment/hooks/usePayment';

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
  navigation: { goBack: () => void };
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  route,
  navigation,
}) => {
  const { user } = useAuth();
  const { jobId, amount, contractorId, jobTitle, useEscrow = true } = route.params;

  const payment = usePayment({
    userId: user?.id,
    jobId,
    contractorId,
    jobTitle,
    amount,
    useEscrow,
    onSuccess: () => navigation.goBack(),
  });

  if (payment.loading) {
    return <LoadingSpinner message="Loading payment options..." />;
  }

  if (payment.error) {
    return <ErrorView message={payment.error} onRetry={payment.loadPaymentMethods} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Payment" onBackPress={() => navigation.goBack()} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <PaymentSummaryCard
          jobTitle={jobTitle}
          jobId={jobId}
          amount={amount}
          platformFee={payment.platformFee}
          contractorPayout={payment.contractorPayout}
          totalAmount={payment.totalAmount}
          useEscrow={useEscrow}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          {payment.paymentMethods.length === 0 ? (
            <TouchableOpacity style={styles.addMethodButton}>
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.addMethodText}>Add Payment Method</Text>
            </TouchableOpacity>
          ) : (
            payment.paymentMethods.map(method => (
              <PaymentMethodOption
                key={method.id}
                method={method}
                isSelected={payment.selectedMethod?.id === method.id}
                onSelect={() => payment.setSelectedMethod(method)}
              />
            ))
          )}
        </View>

        {useEscrow && <EscrowInfoCard />}
      </ScrollView>

      <View style={styles.paymentButtonContainer}>
        <TouchableOpacity
          style={[styles.paymentButton, payment.processing && styles.paymentButtonDisabled]}
          onPress={payment.handlePayment}
          disabled={payment.processing || !payment.selectedMethod}
        >
          {payment.processing ? (
            <LoadingSpinner size="small" color={theme.colors.textInverse} />
          ) : (
            <>
              <Ionicons name="card-outline" size={20} color={theme.colors.textInverse} />
              <Text style={styles.paymentButtonText}>
                Pay ${payment.totalAmount.toFixed(2)}
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
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
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

export default PaymentScreen;
