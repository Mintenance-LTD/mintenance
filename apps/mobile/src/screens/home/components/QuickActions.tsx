/**
 * Quick Actions Component
 *
 * Displays quick action buttons for common tasks.
 * Adapts based on user role (homeowner vs contractor).
 *
 * @filesize Target: <150 lines
 * @compliance Architecture principles - Single responsibility
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { QuickAction } from '../viewmodels/HomeNavigationCoordinator';

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  title = 'Quick Actions',
}) => {
  const renderActionButton = (action: QuickAction) => (
    <TouchableOpacity
      key={action.id}
      style={[styles.actionButton, { borderColor: action.color }]}
      onPress={action.action}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${action.color}15` }]}>
        <Ionicons
          name={action.icon as any}
          size={24}
          color={action.color}
        />
      </View>
      <Text style={styles.actionTitle}>{action.title}</Text>
      {action.subtitle && (
        <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {actions.map(renderActionButton)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingRight: 40, // Extra padding for last item
  },
  actionButton: {
    width: 120,
    padding: 16,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});