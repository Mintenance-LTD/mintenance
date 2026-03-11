/**
 * QuickActionsHomeowner Component
 *
 * Web-dashboard-style quick actions for homeowners.
 * Full-width rows with colored icon chips, title + subtitle, chevron.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface QuickActionsHomeownerProps {
  onPostJobPress: () => void;
  onPropertiesPress: () => void;
  onFindContractorsPress: () => void;
  onMessagesPress: () => void;
}

interface ActionItem {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  onPress: () => void;
}

export const QuickActionsHomeowner: React.FC<QuickActionsHomeownerProps> = ({
  onPostJobPress,
  onPropertiesPress,
  onFindContractorsPress,
  onMessagesPress,
}) => {
  const actions: ActionItem[] = [
    {
      label: 'Post a Job',
      subtitle: 'Get quotes from local pros',
      icon: 'add-circle',
      iconColor: theme.colors.primary,
      iconBg: theme.colors.primaryLight,
      onPress: onPostJobPress,
    },
    {
      label: 'Find Contractors',
      subtitle: 'Browse verified professionals',
      icon: 'search',
      iconColor: theme.colors.info,
      iconBg: theme.colors.backgroundSecondary,
      onPress: onFindContractorsPress,
    },
    {
      label: 'My Properties',
      subtitle: 'Manage your homes',
      icon: 'home',
      iconColor: theme.colors.info,
      iconBg: theme.colors.backgroundSecondary,
      onPress: onPropertiesPress,
    },
    {
      label: 'Messages',
      subtitle: 'Chat with contractors',
      icon: 'chatbubbles',
      iconColor: theme.colors.warning,
      iconBg: theme.colors.accentLight,
      onPress: onMessagesPress,
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.list}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.row, index === actions.length - 1 && styles.rowLast]}
            onPress={action.onPress}
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
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  list: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
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
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
