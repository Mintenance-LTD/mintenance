/**
 * SubscriptionScreen — current plan summary + role-specific plan
 * catalogue with subscribe / switch / cancel flows.
 *
 * Was a 664-line monolith. Split 2026-05-09 (AUDIT_PUNCH_LIST P2 #44f)
 * into typed plan data (`subscription/plans.ts`), React Query hooks
 * (`subscription/queries.ts`), the subscribe/cancel UI controllers
 * (`subscription/handleSubscribe.ts`), shared styles
 * (`subscription/styles.ts`), and 3 leaf components under
 * `subscription/components/`. Public behaviour preserved.
 */

import React, { useState } from 'react';
import { ScrollView, StatusBar, Text, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components/shared';
import { me } from '../../design-system/mint-editorial';

import { styles } from './theme/styles';
import { plansForRole } from './plans';
import {
  useCancelSubscriptionMutation,
  useSubscribeMutation,
  useSubscriptionStatusQuery,
} from './queries';
import {
  confirmCancelSubscription,
  handleSubscribePress,
} from './handleSubscribe';
import { CurrentPlanCard } from './components/CurrentPlanCard';
import { FoundingMemberCard } from './components/FoundingMemberCard';
import { PlanCard } from './components/PlanCard';
import { InlineError, InlineLoading } from './components/StatusInline';

export const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [selectedPlan] = useState<string | null>(null);

  const userRole = user?.role || 'homeowner';
  const plans = plansForRole(userRole);

  const {
    data: status,
    isLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useSubscriptionStatusQuery(userRole, user?.id);

  const subscribeMutation = useSubscribeMutation();
  const cancelMutation = useCancelSubscriptionMutation();

  const currentPlan = status?.subscription;
  // Early-access (founding-member) cohort: backend already grants the
  // top-tier feature set + 5% fee with no subscription, so suppress the
  // trial countdown and plan picker (mirrors web audit-89).
  const earlyAccess = !!status?.earlyAccess?.eligible;
  const rawTrial = status?.trial;
  const trial =
    rawTrial && !earlyAccess
      ? {
          active: rawTrial.isTrialActive ?? rawTrial.active ?? false,
          daysRemaining: rawTrial.daysRemaining,
        }
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg2} />
      <ScreenHeader
        title='Subscription'
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetchStatus}
            tintColor={me.brand}
            colors={[me.brand]}
          />
        }
      >
        {isLoading ? (
          <InlineLoading />
        ) : statusError ? (
          <InlineError onRetry={() => refetchStatus()} />
        ) : (
          <>
            {earlyAccess ? (
              <FoundingMemberCard />
            ) : (
              <>
                <CurrentPlanCard
                  currentPlan={currentPlan ?? null}
                  trial={trial}
                  cancelling={cancelMutation.isPending}
                  onCancel={() =>
                    confirmCancelSubscription(() => cancelMutation.mutate())
                  }
                />

                <Text style={styles.sectionTitle}>Available Plans</Text>

                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isCurrent={currentPlan?.planType === plan.id}
                    isSelected={selectedPlan === plan.id}
                    hasExistingSubscription={!!currentPlan}
                    subscribing={subscribeMutation.isPending}
                    onSubscribe={(planId) =>
                      handleSubscribePress({
                        planType: planId,
                        onSubscribe: (id) => subscribeMutation.mutate(id),
                        onAddCard: () =>
                          (
                            navigation as unknown as {
                              navigate: (screen: string) => void;
                            }
                          ).navigate('PaymentMethods'),
                      })
                    }
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SubscriptionScreen;
