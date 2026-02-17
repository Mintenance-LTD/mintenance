import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../../theme';

const { width: screenWidth } = Dimensions.get('window');

interface QuickActionsProps {
  navigation: StackNavigationProp<Record<string, undefined>>;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ navigation }) => {
  const actions = [
    {
      icon: 'receipt-outline',
      label: 'Create Invoice',
      onPress: () => Alert.alert('Coming Soon', 'Invoice creation coming soon.'),
    },
    {
      icon: 'card-outline',
      label: 'Add Expense',
      onPress: () => Alert.alert('Coming Soon', 'Expense tracking coming soon.'),
    },
    {
      icon: 'checkmark-circle-outline',
      label: 'Record Payment',
      onPress: () => Alert.alert('Coming Soon', 'Payment recording coming soon.'),
    },
    {
      icon: 'analytics-outline',
      label: 'View Reports',
      onPress: () => Alert.alert('Coming Soon', 'Finance reports coming soon.'),
    },
  ];

  return (
    <View style={styles.actionsContainer}>
      <Text style={styles.actionsTitle}>Quick Actions</Text>
      <View style={styles.actionButtons}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionButton}
            onPress={action.onPress}
          >
            <Ionicons
              name={action.icon as keyof typeof Ionicons.glyphMap}
              size={24}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.actionButtonText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    marginBottom: 16,
    ...theme.shadows.base,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: (screenWidth - 72) / 2,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  actionButtonText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});
