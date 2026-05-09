import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { SubscriptionStatus } from './types';

/**
 * React Query hooks for the Subscription screen.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44f).
 */

export function useSubscriptionStatusQuery(role: string) {
  return useQuery({
    queryKey: ['subscription-status', role],
    queryFn: async (): Promise<SubscriptionStatus> => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      // Query the correct subscription table based on user role
      const subTable =
        role === 'contractor'
          ? 'contractor_subscriptions'
          : 'homeowner_subscriptions';
      const idCol = role === 'contractor' ? 'contractor_id' : 'homeowner_id';
      const { data: sub, error } = await supabase
        .from(subTable)
        .select('*')
        .eq(idCol, authUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !sub) {
        return {
          role,
          subscription: null,
          trial: null,
          requiresSubscription: false,
        };
      }
      return {
        role,
        subscription: {
          planType: sub.plan_type || sub.plan_id,
          planName: sub.plan_name,
          status: sub.status,
          amount: sub.amount,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
        trial: sub.trial_end
          ? {
              active: new Date(sub.trial_end as string) > new Date(),
              daysRemaining: Math.max(
                0,
                Math.ceil(
                  (new Date(sub.trial_end as string).getTime() - Date.now()) /
                    86400000
                )
              ),
            }
          : null,
        requiresSubscription: false,
      };
    },
  });
}

export function useSubscribeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planType: string) => {
      return mobileApiClient.post<{
        subscriptionId: string;
        requiresPayment: boolean;
      }>('/api/subscriptions/create', { planType, billingCycle: 'monthly' });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      if (data.requiresPayment) {
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
