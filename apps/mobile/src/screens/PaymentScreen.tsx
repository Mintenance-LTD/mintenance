/**
 * PaymentScreen Component
 *
 * Handles payment processing with Stripe integration and escrow functionality.
 * Airbnb-style: soft shadows, no borders, warm gray background.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../components/shared';
import { useAuth } from '../contexts/AuthContext';
import { PaymentSummaryCard } from './payment/components/PaymentSummaryCard';
import { EscrowInfoCard } from './payment/components/EscrowInfoCard';
import { PaymentMethodOption } from './payment/components/PaymentMethodOption';
import { usePayment } from './payment/hooks/usePayment';
import { theme } from '../theme';

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
  const rootNavigation = useNavigation();
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
            <TouchableOpacity
              style={styles.addMethodButton}
              onPress={() => {
                (rootNavigation as unknown as { navigate: (screen: string, params?: Record<string, unknown>) => void })
                  .navigate('Main', { screen: 'ProfileTab', params: { screen: 'AddPaymentMethod' } });
              }}
              accessibilityRole="button"
              accessibilityLabel="Add payment method"
            >
              <View style={styles.addMethodIconWrap}>
                <Ionicons name="add" size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.addMethodContent}>
                <Text style={styles.addMethodText}>Add Payment Method</Text>
                <Text style={styles.addMethodSubtext}>Credit card, debit card, or bank account</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
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

        <View style={styles.securityNote}>
          <View style={styles.securityIconWrap}>
            <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
          </View>
          <Text style={styles.securityText}>
            Your payment is protected by 256-bit SSL encryption and held securely in escrow.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.paymentButtonContainer}>
        <TouchableOpacity
          style={[styles.paymentButton, (payment.processing || !payment.selectedMethod) && styles.paymentButtonDisabled]}
          onPress={payment.handlePayment}
          disabled={payment.processing || !payment.selectedMethod}
          accessibilityRole="button"
          accessibilityLabel={`Pay ${'\u00A3'}${payment.totalAmount.toFixed(2)}`}
          accessibilityState={{ disabled: payment.processing || !payment.selectedMethod }}
        >
          {payment.processing ? (
            <LoadingSpinner size="small" color={theme.colors.textInverse} />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color={theme.colors.textInverse} />
              <Text style={styles.paymentButtonText}>
                Pay {'\u00A3'}{payment.totalAmount.toFixed(2)}
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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  addMethodButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  addMethodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMethodContent: {
    flex: 1,
  },
  addMethodText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  addMethodSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  securityIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  paymentButtonContainer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  paymentButton: {
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 28,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paymentButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  paymentButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
});

export default PaymentScreen;
