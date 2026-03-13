import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';

interface QuickActionsProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList>;
}

const ACTIONS = [
  { icon: 'receipt-outline' as const, label: 'Invoices', color: '#10B981', bg: '#D1FAE5', screen: 'InvoiceManagement' },
  { icon: 'card-outline' as const, label: 'Expenses', color: '#F59E0B', bg: '#FEF3C7', screen: 'Expenses' },
  { icon: 'cash-outline' as const, label: 'Payouts', color: '#3B82F6', bg: '#DBEAFE', screen: 'Payouts' },
  { icon: 'analytics-outline' as const, label: 'Reports', color: '#8B5CF6', bg: '#EDE9FE', screen: 'Reporting' },
];

export const QuickActions: React.FC<QuickActionsProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.row}>
        {ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.screen}
            style={styles.actionBtn}
            onPress={() => navigation.navigate(action.screen as never)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: action.bg }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={styles.label}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#222222',
    fontWeight: '600',
    textAlign: 'center',
  },
});
