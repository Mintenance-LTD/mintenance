/**
 * QuickActions Component (Contractor)
 *
 * Airbnb category-bar-style: horizontal scrollable icon circles
 * with label below. Each action is a quick tap target.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHaptics } from '../../utils/haptics';
import { theme } from '../../theme';

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
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
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
      label: 'Browse',
      icon: 'search',
      iconColor: theme.colors.primary,
      bgColor: theme.colors.primaryLight,
      onPress: onBrowseJobsPress,
    },
    {
      label: 'Inbox',
      icon: 'mail',
      iconColor: '#3B82F6',
      bgColor: '#DBEAFE',
      onPress: onInboxPress,
    },
    ...(onQuotesPress
      ? [{
          label: 'Quotes',
          icon: 'document-text' as keyof typeof Ionicons.glyphMap,
          iconColor: '#8B5CF6',
          bgColor: '#EDE9FE',
          onPress: onQuotesPress,
        }]
      : []),
    ...(onInvoicesPress
      ? [{
          label: 'Invoices',
          icon: 'receipt' as keyof typeof Ionicons.glyphMap,
          iconColor: theme.colors.accent,
          bgColor: theme.colors.accentLight,
          onPress: onInvoicesPress,
        }]
      : []),
    ...(onExpensesPress
      ? [{
          label: 'Expenses',
          icon: 'wallet' as keyof typeof Ionicons.glyphMap,
          iconColor: theme.colors.error,
          bgColor: '#FEE2E2',
          onPress: onExpensesPress,
        }]
      : []),
    ...(onCalendarPress
      ? [{
          label: 'Calendar',
          icon: 'calendar' as keyof typeof Ionicons.glyphMap,
          iconColor: '#06B6D4',
          bgColor: '#CFFAFE',
          onPress: onCalendarPress,
        }]
      : []),
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionItem}
            onPress={() => {
              haptics.buttonPress();
              action.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: action.bgColor }]}>
              <Ionicons name={action.icon} size={22} color={action.iconColor} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  scrollContent: {
    gap: 16,
    paddingRight: 8,
  },
  actionItem: {
    alignItems: 'center',
    width: 68,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});
