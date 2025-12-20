import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { KPICard } from './KPICard';
import { theme } from '../../theme';
import type { FinancialSummary } from '../../services/contractor-business';

const { width: screenWidth } = Dimensions.get('window');

interface KPIContainerProps {
  financialData: FinancialSummary;
  formatCurrency: (amount: number) => string;
  navigation: StackNavigationProp<any>;
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
          financialData.monthly_revenue.reduce((sum, rev) => sum + rev, 0)
        )}
        icon='cash'
        color={theme.colors.primary}
        change={{
          value: financialData.quarterly_growth,
          isPositive: financialData.quarterly_growth > 0,
        }}
        onPress={() => navigation.navigate('RevenueDetail')}
      />

      <KPICard
        title='Outstanding'
        value={formatCurrency(financialData.outstanding_invoices)}
        icon='time'
        color={theme.colors.warning}
        onPress={() => navigation.navigate('InvoiceManagement')}
      />

      <KPICard
        title='Overdue'
        value={formatCurrency(financialData.overdue_amount)}
        icon='warning'
        color={theme.colors.error}
        onPress={() => navigation.navigate('OverdueInvoices')}
      />

      <KPICard
        title='Tax Due'
        value={formatCurrency(financialData.tax_obligations)}
        icon='receipt'
        color={theme.colors.textSecondary}
        onPress={() => navigation.navigate('TaxCenter')}
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
