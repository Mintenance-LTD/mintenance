import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

interface QuickActionsProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList>;
}

// 2026-05-01 audit P1 (close `as never` sweep): typed `screen` against
// the ProfileStackParamList keys we actually navigate to so a typo on
// one of these strings is a compile error, not a runtime crash.
type FinanceQuickActionScreen =
  | 'InvoiceManagement'
  | 'Expenses'
  | 'Payouts'
  | 'Reporting';

const ACTIONS: ReadonlyArray<{
  icon:
    | 'receipt-outline'
    | 'card-outline'
    | 'cash-outline'
    | 'analytics-outline';
  label: string;
  color: string;
  bg: string;
  screen: FinanceQuickActionScreen;
}> = [
  {
    icon: 'receipt-outline' as const,
    label: 'Invoices',
    color: theme.colors.primary,
    bg: theme.colors.primaryLight,
    screen: 'InvoiceManagement',
  },
  {
    icon: 'card-outline' as const,
    label: 'Expenses',
    color: theme.colors.accent,
    bg: theme.colors.accentLight,
    screen: 'Expenses',
  },
  {
    icon: 'cash-outline' as const,
    label: 'Payouts',
    color: '#3B82F6',
    bg: '#DBEAFE',
    screen: 'Payouts',
  },
  {
    icon: 'analytics-outline' as const,
    label: 'Reports',
    color: '#8B5CF6',
    bg: '#EDE9FE',
    screen: 'Reporting',
  },
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
            onPress={() => {
              // Expenses screen optionally accepts {jobId, jobTitle} params;
              // omitted here since this surface fires the bare entry-point.
              if (action.screen === 'Expenses') {
                navigation.navigate('Expenses', undefined);
              } else {
                navigation.navigate(action.screen);
              }
            }}
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
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
    color: theme.colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
