/**
 * QuickActions Component
 *
 * Modern horizontal-row action list with coloured icon chips.
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

interface ActionItem {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  onPress: () => void;
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

  const actions: ActionItem[] = [
    {
      label: 'Browse Jobs',
      subtitle: 'Find new opportunities',
      icon: 'search',
      iconColor: '#0D9488',
      iconBg: '#CCFBF1',
      onPress: onBrowseJobsPress,
    },
    {
      label: 'Inbox',
      subtitle: 'Messages & updates',
      icon: 'mail',
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      onPress: onInboxPress,
    },
    ...(onQuotesPress
      ? [
          {
            label: 'Quotes',
            subtitle: 'Build & send estimates',
            icon: 'document-text' as keyof typeof Ionicons.glyphMap,
            iconColor: '#8B5CF6',
            iconBg: '#EDE9FE',
            onPress: onQuotesPress,
          },
        ]
      : []),
    ...(onInvoicesPress
      ? [
          {
            label: 'Invoices',
            subtitle: 'Manage billing',
            icon: 'receipt' as keyof typeof Ionicons.glyphMap,
            iconColor: '#D97706',
            iconBg: '#FEF3C7',
            onPress: onInvoicesPress,
          },
        ]
      : []),
    ...(onExpensesPress
      ? [
          {
            label: 'Expenses',
            subtitle: 'Track costs',
            icon: 'wallet' as keyof typeof Ionicons.glyphMap,
            iconColor: '#DC2626',
            iconBg: '#FEE2E2',
            onPress: onExpensesPress,
          },
        ]
      : []),
    ...(onCalendarPress
      ? [
          {
            label: 'Calendar',
            subtitle: 'Schedule & plan',
            icon: 'calendar' as keyof typeof Ionicons.glyphMap,
            iconColor: '#059669',
            iconBg: '#D1FAE5',
            onPress: onCalendarPress,
          },
        ]
      : []),
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.list}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.row, index === actions.length - 1 && styles.rowLast]}
            onPress={() => {
              haptics.buttonPress();
              action.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            activeOpacity={0.7}
          >
            <View style={[styles.iconChip, { backgroundColor: action.iconBg }]}>
              <Ionicons name={action.icon} size={20} color={action.iconColor} />
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.rowTitle}>{action.label}</Text>
              <Text style={styles.rowSubtitle}>{action.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  list: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 14,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
