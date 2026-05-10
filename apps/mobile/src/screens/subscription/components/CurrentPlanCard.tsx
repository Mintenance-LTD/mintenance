import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { theme } from '../../../theme';
import { styles } from '../theme/styles';
import type { SubscriptionStatus } from '../types';

/**
 * Current Plan summary card. Renders even when there's no active
 * subscription (shows "No Plan" / Inactive badge).
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44f).
 */
export function CurrentPlanCard({
  currentPlan,
  trial,
  cancelling,
  onCancel,
}: {
  currentPlan: SubscriptionStatus['subscription'];
  trial: { active: boolean; daysRemaining: number } | null;
  cancelling: boolean;
  onCancel: () => void;
}) {
  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusLabel}>Current Plan</Text>
      <View style={styles.statusRow}>
        <Text style={styles.planName}>
          {currentPlan?.planName || currentPlan?.planType || 'No Plan'}
        </Text>
        <Badge
          variant={currentPlan?.status === 'active' ? 'success' : 'warning'}
        >
          {currentPlan?.status || (trial?.active ? 'Trial' : 'Inactive')}
        </Badge>
      </View>
      {trial?.active && (
        <View style={styles.trialChip}>
          <Ionicons name='time-outline' size={14} color={theme.colors.accent} />
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
          variant='ghost'
          size='sm'
          onPress={onCancel}
          loading={cancelling}
          style={styles.cancelBtn}
        >
          Cancel Subscription
        </Button>
      )}
    </View>
  );
}
