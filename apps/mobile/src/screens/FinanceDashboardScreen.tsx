/**
 * FinanceDashboardScreen — Mint Editorial redesign per
 * redesign-v2 contractor business deck screen 02 "Finance".
 *
 * Layout:
 *   1. Lightweight top nav (no full-bleed gradient).
 *   2. Paper screen header with eyebrow + serif "Finance" title.
 *   3. Dark forest-mint hero card with sparkline (FinanceEditorialHero).
 *   4. 4-up bento (Cash in / Expenses / In escrow / Outstanding).
 *   5. Period selector + by-category bar breakdown +
 *      QuickActions + FinancialInsights (kept from the legacy layout
 *      because they own real behaviour — period filter writes to the
 *      hook, quick actions deep-link into Invoices / Expenses).
 *
 * The old full-bleed gradient hero + 3-card KPI row + decorative
 * circles have been retired. They were styled in the pre-Mint
 * "shiny green" identity and don't match the editorial direction.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { PeriodSelector } from '../components/finance/PeriodSelector';
import { QuickActions } from '../components/finance/QuickActions';
import { FinancialInsights } from '../components/finance/FinancialInsights';
import { FinanceEditorialHero } from '../components/finance/FinanceEditorialHero';
import { FinanceBento } from '../components/finance/FinanceBento';
import { ByCategoryBars } from '../components/finance/ByCategoryBars';
import { useFinanceDashboard } from '../hooks/useFinanceDashboard';
import { useI18n } from '../hooks/useI18n';
import { SkeletonDashboard } from '../components/ui/LoadingStates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { me } from '../design-system/mint-editorial';
import { styles } from './finance-dashboard/styles';

interface FinanceDashboardScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList>;
}

const FinanceDashboardScreen: React.FC<FinanceDashboardScreenProps> = ({
  navigation,
}) => {
  const { formatters } = useI18n();
  const insets = useSafeAreaInsets();
  const {
    financialData,
    loading,
    error,
    refreshing,
    selectedPeriod,
    setSelectedPeriod,
    handleRefresh,
  } = useFinanceDashboard();

  const fmt = (amount: number) => formatters.currency(amount);

  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonDashboard />
      </View>
    );
  }

  const monthly = financialData?.monthly_revenue ?? [];

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor='transparent'
        barStyle='dark-content'
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={me.brand}
            colors={[me.brand]}
          />
        }
      >
        <View style={[styles.topNav, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityRole='button'
            accessibilityLabel='Go back'
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name='arrow-back' size={20} color={me.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Reporting')}
            style={styles.backBtn}
            accessibilityRole='button'
            accessibilityLabel='Open reports'
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name='document-text-outline' size={18} color={me.ink} />
          </TouchableOpacity>
        </View>

        <View style={styles.screenHeader}>
          <Text style={styles.eyebrow}>Finance</Text>
          <Text style={styles.headline}>Finance</Text>
          <Text style={styles.sub}>This month so far</Text>
        </View>

        <FinanceEditorialHero monthlyRevenue={monthly} formatCurrency={fmt} />

        <FinanceBento
          cashIn={financialData?.escrow_revenue ?? 0}
          expenses={financialData?.total_expenses ?? 0}
          inEscrow={financialData?.escrow_in_flight ?? 0}
          outstanding={financialData?.outstanding_invoices ?? 0}
          formatCurrency={fmt}
        />

        <View style={styles.contentBody}>
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />

          {error ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIconWrap}>
                <Ionicons name='alert-circle' size={28} color={me.errFg} />
              </View>
              <Text style={styles.errorTitle}>Unable to load finances</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRefresh}
              >
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : financialData ? (
            <>
              <ByCategoryBars
                breakdown={financialData.expense_breakdown}
                formatCurrency={fmt}
              />
              <QuickActions navigation={navigation} />
              <FinancialInsights
                financialData={financialData}
                formatCurrency={fmt}
              />
            </>
          ) : null}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </View>
  );
};

export default FinanceDashboardScreen;
