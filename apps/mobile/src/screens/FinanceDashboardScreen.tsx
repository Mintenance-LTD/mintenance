import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FinanceHeader } from '../components/finance/FinanceHeader';
import { PeriodSelector } from '../components/finance/PeriodSelector';
import { KPIContainer } from '../components/finance/KPIContainer';
import { ChartSection } from '../components/finance/ChartSection';
import { QuickActions } from '../components/finance/QuickActions';
import { FinancialInsights } from '../components/finance/FinancialInsights';
import { useFinanceDashboard } from '../hooks/useFinanceDashboard';
import { useI18n } from '../hooks/useI18n';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { theme } from '../theme';

interface FinanceDashboardScreenProps {
  navigation: StackNavigationProp<any>;
}

export const FinanceDashboardScreen: React.FC<FinanceDashboardScreenProps> = ({
  navigation,
}) => {
  const { formatters } = useI18n();
  const {
    financialData,
    loading,
    refreshing,
    selectedPeriod,
    setSelectedPeriod,
    handleRefresh,
  } = useFinanceDashboard();

  const formatCurrency = (amount: number) => formatters.currency(amount);

  if (loading) {
    return <LoadingSpinner message='Loading financial dashboard...' />;
  }

  return (
    <View style={styles.container}>
      <FinanceHeader navigation={navigation} />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

        {financialData && (
          <>
            <KPIContainer
              financialData={financialData}
              formatCurrency={formatCurrency}
              navigation={navigation}
            />

            <ChartSection
              financialData={financialData}
              formatCurrency={formatCurrency}
            />

            <QuickActions navigation={navigation} />

            <FinancialInsights
              financialData={financialData}
              formatCurrency={formatCurrency}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default FinanceDashboardScreen;
