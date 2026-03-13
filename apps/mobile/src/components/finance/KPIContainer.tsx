import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { KPICard } from './KPICard';
import type { FinancialSummary } from '../../services/contractor-business';

const { width: screenWidth } = Dimensions.get('window');

interface KPIContainerProps {
  financialData: FinancialSummary;
  formatCurrency: (amount: number) => string;
  navigation: NativeStackNavigationProp<ProfileStackParamList>;
}

export const KPIContainer: React.FC<KPIContainerProps> = ({
  financialData,
  formatCurrency,
  navigation,
}) => {
  return (
    <View style={styles.kpiContainer}>
      <KPICard
        title='Total Revenue'
        value={formatCurrency(
          (financialData.monthly_revenue ?? []).reduce((sum, rev) => sum + rev, 0)
        )}
        icon='cash'
        color='#222222'
        change={{
          value: financialData.quarterly_growth,
          isPositive: financialData.quarterly_growth > 0,
        }}
        onPress={() => navigation.navigate('Reporting')}
      />

      <KPICard
        title='Outstanding'
        value={formatCurrency(financialData.outstanding_invoices)}
        icon='time'
        color='#F59E0B'
        onPress={() => navigation.navigate('InvoiceManagement')}
      />

      <KPICard
        title='Overdue'
        value={formatCurrency(financialData.overdue_amount)}
        icon='warning'
        color='#EF4444'
        onPress={() => navigation.navigate('InvoiceManagement')}
      />

      <KPICard
        title='Tax Due'
        value={formatCurrency(financialData.tax_obligations)}
        icon='receipt'
        color='#717171'
        onPress={() => navigation.navigate('Reporting')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
});
