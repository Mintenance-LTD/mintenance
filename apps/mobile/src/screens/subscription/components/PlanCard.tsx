import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/ui/Button';
import { theme } from '../../../theme';
import { styles } from '../theme/styles';
import { getFeatureStrings, type SubscriptionPlan } from '../types';

/**
 * One subscription plan card. Shows price, recommendation/current
 * badges, the feature list and a Subscribe / Switch Plan CTA.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44f).
 */
export function PlanCard({
  plan,
  isCurrent,
  isSelected,
  hasExistingSubscription,
  subscribing,
  onSubscribe,
}: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  isSelected: boolean;
  hasExistingSubscription: boolean;
  subscribing: boolean;
  onSubscribe: (planId: string) => void;
}) {
  return (
    <View
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
            {`£${plan.price}`}
            <Text style={styles.planCycle}>
              /{plan.billingCycle === 'monthly' ? 'mo' : 'yr'}
            </Text>
          </Text>
        </View>
        <View style={styles.badgeStack}>
          {plan.recommended && (
            <View style={styles.recommendedBadge}>
              <Ionicons name='star' size={10} color={theme.colors.accent} />
              <Text style={styles.recommendedText}>Most Popular</Text>
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
            <Ionicons name='checkmark' size={14} color={theme.colors.primary} />
          </View>
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}

      {!isCurrent && (
        <Button
          variant='primary'
          fullWidth
          size='sm'
          onPress={() => onSubscribe(plan.id)}
          loading={subscribing}
          style={styles.subscribeBtn}
        >
          {hasExistingSubscription ? 'Switch Plan' : 'Subscribe'}
        </Button>
      )}
    </View>
  );
}
