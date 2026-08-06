import React from 'react';
import { View, Text, StyleSheet, Dimensions, Linking } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { KPICard } from './KPICard';
import type { FinancialSummary } from '../../services/contractor-business';
import { theme } from '../../theme';

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
          (financialData.monthly_revenue ?? []).reduce(
            (sum, rev) => sum + rev,
            0
          )
        )}
        icon='cash'
        color={theme.colors.textPrimary}
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
        color={theme.colors.accent}
        onPress={() => navigation.navigate('InvoiceManagement')}
      />

      <KPICard
        title='Overdue'
        value={formatCurrency(financialData.overdue_amount)}
        icon='warning'
        color={theme.colors.error}
        onPress={() => navigation.navigate('InvoiceManagement')}
      />

      <KPICard
        title='Taxable Profit'
        value={formatCurrency(financialData.taxable_profit)}
        icon='receipt'
        color={theme.colors.textSecondary}
        onPress={() => navigation.navigate('Reporting')}
      />

      {/* We show taxable profit (a figure we know), NOT a computed tax bill.
          Estimating the tax owed would require personal allowance, tax bands,
          NI, Scottish vs rUK rates and the contractor's other income — we are
          not a tax adviser, so we point them to HMRC. */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Taxable profit for the current tax year — estimate only, not tax
          advice. Work out the tax you owe at{' '}
          <Text
            style={styles.link}
            onPress={() =>
              Linking.openURL('https://www.gov.uk/self-assessment-tax-returns')
            }
          >
            gov.uk
          </Text>
          .
        </Text>
      </View>
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
  disclaimer: {
    width: '100%',
    marginTop: 4,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textSecondary,
  },
  link: {
    color: theme.colors.accent,
    textDecorationLine: 'underline',
  },
});
