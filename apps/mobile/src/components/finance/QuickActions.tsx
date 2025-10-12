import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../../theme';

const { width: screenWidth } = Dimensions.get('window');

interface QuickActionsProps {
  navigation: StackNavigationProp<any>;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ navigation }) => {
  const actions = [
    {
      icon: 'receipt-outline',
      label: 'Create Invoice',
      onPress: () => navigation.navigate('CreateInvoice'),
    },
    {
      icon: 'card-outline',
      label: 'Add Expense',
      onPress: () => navigation.navigate('AddExpense'),
    },
    {
      icon: 'checkmark-circle-outline',
      label: 'Record Payment',
      onPress: () => navigation.navigate('RecordPayment'),
    },
    {
      icon: 'analytics-outline',
      label: 'View Reports',
      onPress: () => navigation.navigate('FinanceReports'),
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
              name={action.icon as any}
              size={24}
              color={theme.colors.primary}
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
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.base,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
