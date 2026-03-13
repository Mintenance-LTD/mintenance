import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  RefreshControl,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/shared';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { mobileApiClient } from '../../utils/mobileApiClient';

interface SubscriptionPlanFeatures {
  maxJobs?: number | null;
  maxActiveJobs?: number;
  prioritySupport?: boolean;
  advancedAnalytics?: boolean;
  customBranding?: boolean;
  apiAccess?: boolean;
  additionalFeatures?: Record<string, unknown>;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[] | SubscriptionPlanFeatures;
  recommended?: boolean;
}

const getFeatureStrings = (features: SubscriptionPlan['features']): string[] => {
  if (Array.isArray(features)) return features;
  if (!features || typeof features !== 'object') return [];
  const f = features as SubscriptionPlanFeatures;
  const result: string[] = [];
  if (f.maxJobs != null) result.push(`Up to ${f.maxJobs} jobs`);
  if (f.maxActiveJobs) result.push(`${f.maxActiveJobs} active jobs`);
  if (f.prioritySupport) result.push('Priority support');
  if (f.advancedAnalytics) result.push('Advanced analytics');
  if (f.customBranding) result.push('Custom branding');
  if (f.apiAccess) result.push('API access');
  return result;
};

interface SubscriptionStatus {
  role: string;
  subscription: {
    planType: string;
    planName?: string;
    status: string;
    amount?: number;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  } | null;
  trial?: {
    isTrialActive?: boolean;
    active?: boolean;
    daysRemaining: number;
  } | null;
  requiresSubscription?: boolean;
}

export const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await mobileApiClient.get<SubscriptionStatus>('/api/subscriptions/status');
      return response;
    },
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const response = await mobileApiClient.get<{
        plans: Array<{
          planType: string;
          name: string;
          price: number;
          currency?: string;
          features: string[] | SubscriptionPlanFeatures;
        }>;
      }>('/api/subscriptions/plans');
      return (response.plans || []).map((p) => ({
        id: p.planType,
        name: p.name,
        price: p.price,
        billingCycle: 'monthly' as const,
        features: p.features,
        recommended: p.planType === 'professional',
      }));
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planType: string) => {
      return mobileApiClient.post<{ subscriptionId: string; requiresPayment: boolean }>(
        '/api/subscriptions/create',
        { planType, billingCycle: 'monthly' }
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      if (data.requiresPayment) {
        Alert.alert('Payment Required', 'Please complete payment to activate your subscription.');
      } else {
        Alert.alert('Subscribed', 'Your subscription is now active.');
      }
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message || 'Failed to subscribe.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return mobileApiClient.post('/api/subscriptions/cancel', { cancelAtPeriodEnd: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      Alert.alert('Cancelled', 'Your subscription will end at the current billing period.');
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message || 'Failed to cancel subscription.');
    },
  });

  const handleSubscribe = (planType: string) => {
    Alert.alert('Subscribe', `Subscribe to the ${planType} plan?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Subscribe', onPress: () => subscribeMutation.mutate(planType) },
    ]);
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'Your subscription will remain active until the end of the current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
      ]
    );
  };

  const isLoading = statusLoading || plansLoading;

  const currentPlan = status?.subscription;
  const rawTrial = status?.trial;
  const trial = rawTrial ? { active: rawTrial.isTrialActive ?? rawTrial.active ?? false, daysRemaining: rawTrial.daysRemaining } : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
      <ScreenHeader title="Subscription" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetchStatus} tintColor="#10B981" colors={['#10B981']} />}
      >
        {isLoading ? (
          <View style={styles.inlineCenter}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.inlineText}>Loading subscription...</Text>
          </View>
        ) : statusError ? (
          <View style={styles.inlineCenter}>
            <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
            <Text style={styles.inlineText}>Failed to load subscription</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetchStatus()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <>
        {/* Current Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current Plan</Text>
          <View style={styles.statusRow}>
            <Text style={styles.planName}>
              {currentPlan?.planName || currentPlan?.planType || 'No Plan'}
            </Text>
            <Badge variant={currentPlan?.status === 'active' ? 'success' : 'warning'}>
              {currentPlan?.status || (trial?.active ? 'Trial' : 'Inactive')}
            </Badge>
          </View>
          {trial?.active && (
            <View style={styles.trialChip}>
              <Ionicons name="time-outline" size={14} color="#F59E0B" />
              <Text style={styles.trialText}>
                {trial.daysRemaining} days remaining in trial
              </Text>
            </View>
          )}
          {currentPlan?.currentPeriodEnd && (
            <Text style={styles.periodText}>
              {currentPlan.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
              {new Date(currentPlan.currentPeriodEnd).toLocaleDateString('en-GB')}
            </Text>
          )}
          {currentPlan?.status === 'active' && !currentPlan.cancelAtPeriodEnd && (
            <Button
              variant="ghost"
              size="sm"
              onPress={handleCancel}
              loading={cancelMutation.isPending}
              style={styles.cancelBtn}
            >
              Cancel Subscription
            </Button>
          )}
        </View>

        {/* Available Plans */}
        <Text style={styles.sectionTitle}>Available Plans</Text>

        {(plans || []).map((plan) => {
          const isCurrent = currentPlan?.planType === plan.id;
          const isSelected = selectedPlan === plan.id;
          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                isCurrent && styles.currentPlanCard,
                isSelected && !isCurrent && styles.selectedPlanCard,
              ]}
            >
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planTitle}>{plan.name}</Text>
                  <Text style={styles.planPrice}>
                    {`\u00A3${plan.price}`}
                    <Text style={styles.planCycle}>/{plan.billingCycle === 'monthly' ? 'mo' : 'yr'}</Text>
                  </Text>
                </View>
                <View style={styles.badgeStack}>
                  {plan.recommended && (
                    <View style={styles.recommendedBadge}>
                      <Ionicons name="star" size={10} color="#F59E0B" />
                      <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                  )}
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </View>
              </View>

              {getFeatureStrings(plan.features).map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <View style={styles.featureCheckWrap}>
                    <Ionicons name="checkmark" size={14} color="#10B981" />
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}

              {!isCurrent && (
                <Button
                  variant="primary"
                  fullWidth
                  size="sm"
                  onPress={() => handleSubscribe(plan.id)}
                  loading={subscribeMutation.isPending}
                  style={styles.subscribeBtn}
                >
                  {currentPlan ? 'Switch Plan' : 'Subscribe'}
                </Button>
              )}
            </View>
          );
        })}
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
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
  statusLabel: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    textTransform: 'capitalize',
  },
  trialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  trialText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
  },
  periodText: {
    fontSize: 13,
    color: '#717171',
    marginTop: 6,
  },
  cancelBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 14,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
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
  currentPlanCard: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  selectedPlanCard: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#222222',
    marginTop: 4,
  },
  planCycle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#B0B0B0',
  },
  badgeStack: {
    gap: 4,
    alignItems: 'flex-end',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  currentBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  featureCheckWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#717171',
    flex: 1,
  },
  subscribeBtn: {
    marginTop: 16,
    borderRadius: 28,
  },
  inlineCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  inlineText: {
    fontSize: 15,
    color: '#717171',
  },
  retryBtn: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SubscriptionScreen;
