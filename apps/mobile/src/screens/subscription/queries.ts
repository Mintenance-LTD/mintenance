import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStripe } from '@stripe/stripe-react-native';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import type { SubscriptionStatus } from './types';

/**
 * React Query hooks for the Subscription screen.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44f).
 *
 * 2026-05-23 audit-18:
 *   - P1: status now reads through the canonical /api/subscriptions/status
 *     (was direct supabase + hardcoded requiresSubscription:false, so
 *     expired trials / missing plans / early-access entitlement were all
 *     misreported).
 *   - P1: subscribe mutation actually presents the Stripe PaymentSheet
 *     when the server signals requiresPayment + returns the bundle.
 *     Previously the alert claimed payment was required and then no
 *     payment path existed — leaving users stuck.
 *   - P2: status query key now includes user.id so logging out and into
 *     another account with the same role can't reuse stale state.
 */

interface PaymentSheetBundle {
  clientSecret: string;
  ephemeralKeySecret: string;
  customerId: string;
}

interface SubscribeResponse {
  subscriptionId: string;
  stripeSubscriptionId?: string | null;
  clientSecret?: string | null;
  requiresPayment: boolean;
  paymentSheet?: PaymentSheetBundle | null;
  isUpgrade?: boolean;
}

export function useSubscriptionStatusQuery(role: string, userId?: string) {
  return useQuery({
    queryKey: ['subscription-status', role, userId ?? null],
    queryFn: async (): Promise<SubscriptionStatus> => {
      // /api/subscriptions/status runs TrialService.requiresSubscription
      // and getEarlyAccessEntitlement server-side. Direct supabase reads
      // here would skip both of those — see audit-18 task #98.
      return mobileApiClient.get<SubscriptionStatus>(
        '/api/subscriptions/status'
      );
    },
    enabled: !!userId,
  });
}

export function useSubscribeMutation() {
  const queryClient = useQueryClient();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  return useMutation({
    mutationFn: async (planType: string): Promise<SubscribeResponse> => {
      const res = await mobileApiClient.post<SubscribeResponse>(
        '/api/subscriptions/create',
        { planType, billingCycle: 'monthly' }
      );

      // No payment to confirm — the subscription is already active /
      // free-tier / on trial. Return as-is.
      if (!res.requiresPayment) return res;

      // Server says payment is required but couldn't ship the mobile
      // PaymentSheet bundle (clientSecret only). We can't present the
      // sheet without all three values — surface that clearly rather
      // than dropping the user on a broken alert.
      if (!res.paymentSheet) {
        throw new Error(
          'Payment required but the payment sheet could not be prepared. Please try again or finish from the web app.'
        );
      }

      const { clientSecret, ephemeralKeySecret, customerId } = res.paymentSheet;
      const initResult = await initPaymentSheet({
        merchantDisplayName: 'Mintenance',
        customerId,
        customerEphemeralKeySecret: ephemeralKeySecret,
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: true,
        returnURL: 'mintenance://subscription-return',
      });
      if (initResult.error) {
        logger.warn('Subscription initPaymentSheet failed', {
          message: initResult.error.message,
        });
        throw new Error(initResult.error.message);
      }

      const presentResult = await presentPaymentSheet();
      if (presentResult.error) {
        if (presentResult.error.code === 'Canceled') {
          // User dismissed the sheet — surface as a soft signal so the
          // mutation goes through onSuccess instead of onError. The
          // subscription row exists in `incomplete` state and they can
          // retry later from the same screen.
          return res;
        }
        logger.warn('Subscription presentPaymentSheet failed', {
          message: presentResult.error.message,
        });
        throw new Error(presentResult.error.message);
      }

      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      if (data.requiresPayment && data.paymentSheet) {
        Alert.alert(
          'Subscription started',
          'Payment completed. Your subscription is being activated.'
        );
      } else if (data.requiresPayment) {
        // We threw earlier in mutationFn when paymentSheet was missing;
        // this branch should be unreachable but guard for safety.
        Alert.alert(
          'Payment Required',
          'Please complete payment to activate your subscription.'
        );
      } else {
        Alert.alert('Subscribed', 'Your subscription is now active.');
      }
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message || 'Failed to subscribe.');
    },
  });
}

export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return mobileApiClient.post('/api/subscriptions/cancel', {
        cancelAtPeriodEnd: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      Alert.alert(
        'Cancelled',
        'Your subscription will end at the current billing period.'
      );
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message || 'Failed to cancel subscription.');
    },
  });
}
