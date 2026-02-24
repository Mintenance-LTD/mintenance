/**
 * QuickActions Component
 * 
 * Displays quick action buttons for contractors to browse jobs and access inbox.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useHaptics } from '../../utils/haptics';

interface QuickActionsProps {
  onBrowseJobsPress: () => void;
  onInboxPress: () => void;
  onQuotesPress?: () => void;
  onInvoicesPress?: () => void;
  onExpensesPress?: () => void;
  onCalendarPress?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onBrowseJobsPress,
  onInboxPress,
  onQuotesPress,
  onInvoicesPress,
  onExpensesPress,
  onCalendarPress,
}) => {
  const haptics = useHaptics();

  const actions = [
    { label: 'Browse Jobs', subtitle: 'Find opportunities', icon: 'search', color: theme.colors.primary, onPress: onBrowseJobsPress },
    { label: 'Inbox', subtitle: 'Messages & updates', icon: 'mail', color: theme.colors.accent, onPress: onInboxPress },
    ...(onQuotesPress ? [{ label: 'Quotes', subtitle: 'Build & send', icon: 'document-text', color: '#8B5CF6', onPress: onQuotesPress }] : []),
    ...(onInvoicesPress ? [{ label: 'Invoices', subtitle: 'Manage billing', icon: 'receipt', color: '#F59E0B', onPress: onInvoicesPress }] : []),
    ...(onExpensesPress ? [{ label: 'Expenses', subtitle: 'Track costs', icon: 'wallet', color: '#EF4444', onPress: onExpensesPress }] : []),
    ...(onCalendarPress ? [{ label: 'Calendar', subtitle: 'Schedule & plan', icon: 'calendar', color: '#10B981', onPress: onCalendarPress }] : []),
  ];

  return (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.actionsGrid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionCard}
            onPress={() => {
              haptics.buttonPress();
              action.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View style={styles.actionIcon}>
              <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={24} color={action.color} />
            </View>
            <Text style={styles.actionTitle}>{action.label}</Text>
            <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  quickActionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...theme.shadows.base,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
