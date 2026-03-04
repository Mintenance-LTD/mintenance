import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';
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
    status: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  } | null;
  trial?: {
    active: boolean;
    daysRemaining: number;
  };
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
      const response = await mobileApiClient.get<{ plans: SubscriptionPlan[] }>('/api/subscriptions/plans');
      return response.plans || [];
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
  if (isLoading) return <LoadingSpinner />;
  if (statusError) return <ErrorView onRetry={refetchStatus} />;

  const currentPlan = status?.subscription;
  const trial = status?.trial;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Subscription" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetchStatus} />}
      >
        {/* Current Status */}
        <Card variant="elevated" padding="md" style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current Plan</Text>
          <View style={styles.statusRow}>
            <Text style={styles.planName}>
              {currentPlan?.planType || 'No Plan'}
            </Text>
            <Badge variant={currentPlan?.status === 'active' ? 'success' : 'warning'}>
              {currentPlan?.status || (trial?.active ? 'Trial' : 'Inactive')}
            </Badge>
          </View>
          {trial?.active && (
            <Text style={styles.trialText}>
              {trial.daysRemaining} days remaining in trial
            </Text>
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
        </Card>

        {/* Available Plans */}
        <Text style={styles.sectionTitle}>Available Plans</Text>

        {(plans || []).map((plan) => {
          const isCurrent = currentPlan?.planType === plan.id;
          return (
            <Card
              key={plan.id}
              variant={selectedPlan === plan.id ? 'outlined' : 'elevated'}
              padding="md"
              style={[styles.planCard, isCurrent && styles.currentPlanCard]}
              interactive
              onPress={() => setSelectedPlan(plan.id)}
            >
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planTitle}>{plan.name}</Text>
                  <Text style={styles.planPrice}>
                    {`\u00A3${plan.price}`}
                    <Text style={styles.planCycle}>/{plan.billingCycle === 'monthly' ? 'mo' : 'yr'}</Text>
                  </Text>
                </View>
                {plan.recommended && (
                  <Badge variant="primary" size="sm">Recommended</Badge>
                )}
                {isCurrent && (
                  <Badge variant="success" size="sm">Current</Badge>
                )}
              </View>

              {getFeatureStrings(plan.features).map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Text style={styles.featureCheck}>✓</Text>
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
            </Card>
          );
        })}
      </ScrollView>
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
  },
  content: {
    padding: theme.layout.screenPadding,
    paddingBottom: theme.spacing[10],
  },
  statusCard: {
    marginBottom: theme.spacing[6],
  },
  statusLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    fontWeight: theme.typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing[2],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    textTransform: 'capitalize',
  },
  trialText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: theme.typography.fontWeight.medium,
    marginTop: theme.spacing[1],
  },
  periodText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
  },
  cancelBtn: {
    marginTop: theme.spacing[3],
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[4],
  },
  planCard: {
    marginBottom: theme.spacing[4],
  },
  currentPlanCard: {
    borderColor: '#222222',
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  planTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  planPrice: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing[1],
  },
  planCycle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.textTertiary,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  featureCheck: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.success,
    marginRight: theme.spacing[2],
    fontWeight: theme.typography.fontWeight.bold,
  },
  featureText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  subscribeBtn: {
    marginTop: theme.spacing[4],
  },
});

export default SubscriptionScreen;
