/**
 * PaymentScreen — homeowner pays into escrow.
 *
 * Mint Editorial polish per redesign-v2 homeowner-deck "Payments &
 * escrow" detail. Visual only — Stripe PaymentIntent flow,
 * useScreenCaptureGuard, and the platform-fee/escrow split logic
 * inside `usePayment` are untouched.
 *
 * Layout:
 *   1. Minimal back nav (replaces the legacy ScreenHeader chrome).
 *   2. Inline Mint Editorial header (eyebrow + serif "Payment" +
 *      "<job title>" sub).
 *   3. PaymentSummaryCard (kept) + section eyebrow "Payment method".
 *   4. Method picker / "Add payment method" CTA + EscrowInfoCard.
 *   5. Sticky brand-fill "Pay £X" button at the bottom (replaces
 *      the previous `me.ink` heavy CTA — brand matches the editorial
 *      direction for primary money flows).
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner, ErrorView } from '../components/shared';
import { useAuth } from '../contexts/AuthContext';
import { PaymentSummaryCard } from './payment/components/PaymentSummaryCard';
import { EscrowInfoCard } from './payment/components/EscrowInfoCard';
import { PaymentMethodOption } from './payment/components/PaymentMethodOption';
import { usePayment } from './payment/hooks/usePayment';
import { me } from '../design-system/mint-editorial';
import { useScreenCaptureGuard } from '../hooks/useScreenCaptureGuard';
import { queryKeys } from '../lib/queryClient';

interface PaymentScreenProps {
  route: {
    params: {
      jobId: string;
      amount: number;
      contractorId: string;
      jobTitle?: string;
      useEscrow?: boolean;
    };
  };
  navigation: { goBack: () => void };
}

const fmtGBP = (n: number): string =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  route,
  navigation,
}) => {
  // SECURITY: payment summary + method selection should never leak via
  // screenshots or screen recording (Stripe amounts, escrow terms).
  useScreenCaptureGuard();

  const { user } = useAuth();
  const rootNavigation = useNavigation();
  const queryClient = useQueryClient();
  const {
    jobId,
    amount,
    contractorId,
    jobTitle = 'Your job',
    useEscrow = true,
  } = route.params;

  // 2026-05-26 audit-60 P1: previously the success handler just
  // called navigation.goBack(). JobDetailsScreen's react-query cache
  // for the job + escrow still held the pre-payment row, so the CTA
  // re-rendered as "Pay Now" until something else invalidated it.
  // Invalidate the relevant keys synchronously before popping so the
  // next render of the detail screen refetches with fresh state.
  // Both jobs.details and jobs.bids are invalidated because the
  // accepted-bid + escrow context flows through the same screen.
  const handlePaymentSuccess = React.useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.jobs.details(jobId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.jobs.bids(jobId),
    });
    navigation.goBack();
  }, [queryClient, jobId, navigation]);

  const payment = usePayment({
    userId: user?.id,
    jobId,
    contractorId,
    jobTitle,
    amount,
    useEscrow,
    onSuccess: handlePaymentSuccess,
  });

  if (payment.loading) {
    return <LoadingSpinner message='Loading payment options…' />;
  }

  if (payment.error) {
    return (
      <ErrorView message={payment.error} onRetry={payment.loadPaymentMethods} />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.screenHeader}>
            <Text style={styles.eyebrow}>Payment</Text>
            <Text style={styles.headline}>Payment</Text>
            <Text style={styles.sub} numberOfLines={2}>
              {jobTitle}
            </Text>
          </View>

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
            <Text style={styles.sectionEyebrow}>Payment method</Text>

            {payment.paymentMethods.length === 0 ? (
              <TouchableOpacity
                style={styles.addMethodButton}
                onPress={() => {
                  (
                    rootNavigation as unknown as {
                      navigate: (
                        screen: string,
                        params?: Record<string, unknown>
                      ) => void;
                    }
                  ).navigate('Main', {
                    screen: 'ProfileTab',
                    params: { screen: 'AddPaymentMethod' },
                  });
                }}
                accessibilityRole='button'
                accessibilityLabel='Add payment method'
              >
                <View style={styles.addMethodIconWrap}>
                  <Ionicons name='add' size={22} color={me.brand} />
                </View>
                <View style={styles.addMethodContent}>
                  <Text style={styles.addMethodText}>Add payment method</Text>
                  <Text style={styles.addMethodSubtext}>
                    Credit card, debit card, or bank account
                  </Text>
                </View>
                <Ionicons name='chevron-forward' size={16} color={me.ink3} />
              </TouchableOpacity>
            ) : (
              payment.paymentMethods.map((method) => (
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
              <Ionicons name='shield-checkmark' size={16} color={me.brand} />
            </View>
            <Text style={styles.securityText}>
              Your payment is protected by 256-bit SSL encryption and held
              securely in escrow until you approve the work.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.paymentButtonContainer}>
        <TouchableOpacity
          style={[
            styles.paymentButton,
            (payment.processing || !payment.selectedMethod) &&
              styles.paymentButtonDisabled,
          ]}
          onPress={payment.handlePayment}
          disabled={payment.processing || !payment.selectedMethod}
          accessibilityRole='button'
          accessibilityLabel={`Pay ${fmtGBP(payment.totalAmount)}`}
          accessibilityState={{
            disabled: payment.processing || !payment.selectedMethod,
          }}
        >
          {payment.processing ? (
            <LoadingSpinner size='small' color={me.onBrand} />
          ) : (
            <>
              <Ionicons name='lock-closed' size={18} color={me.onBrand} />
              <Text style={styles.paymentButtonText}>
                Pay {fmtGBP(payment.totalAmount)}
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
    backgroundColor: me.bg,
  },
  topNav: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  screenHeader: {
    paddingHorizontal: 4,
    marginTop: 6,
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  sub: {
    fontSize: 14,
    color: me.ink3,
    marginTop: 6,
    lineHeight: 19,
  },
  section: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  addMethodButton: {
    backgroundColor: me.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  addMethodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMethodContent: {
    flex: 1,
  },
  addMethodText: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 2,
  },
  addMethodSubtext: {
    fontSize: 12,
    color: me.ink2,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    marginTop: 6,
    marginBottom: 24,
  },
  securityIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: me.ink2,
    lineHeight: 17,
  },
  paymentButtonContainer: {
    padding: 16,
    backgroundColor: me.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    ...me.shadow.pop,
  },
  paymentButton: {
    backgroundColor: me.brand,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paymentButtonDisabled: {
    opacity: 0.55,
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: me.onBrand,
  },
});
