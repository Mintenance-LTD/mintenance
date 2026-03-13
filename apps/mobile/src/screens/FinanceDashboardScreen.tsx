import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { PeriodSelector } from '../components/finance/PeriodSelector';
import { ChartSection } from '../components/finance/ChartSection';
import { QuickActions } from '../components/finance/QuickActions';
import { FinancialInsights } from '../components/finance/FinancialInsights';
import { useFinanceDashboard } from '../hooks/useFinanceDashboard';
import { useI18n } from '../hooks/useI18n';
import { SkeletonDashboard } from '../components/ui/LoadingStates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FinanceDashboardScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList>;
}

export const FinanceDashboardScreen: React.FC<FinanceDashboardScreenProps> = ({
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
    return <SkeletonDashboard />;
  }

  const totalRevenue = (financialData?.monthly_revenue ?? []).reduce((sum, rev) => sum + rev, 0);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFFFFF" colors={['#10B981']} />
        }
      >
        {/* Full-Bleed Gradient Hero — extends to very top */}
        <LinearGradient
          colors={['#064E3B', '#059669', '#10B981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroDecorCircle} />
          <View style={styles.heroDecorSmall} />
          <View style={styles.heroDecorDiamond} />

          {/* Safe area spacing */}
          <View style={{ height: insets.top + 12 }} />
          {/* Nav row */}
          <View style={styles.heroNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.heroNavTitle}>Finance Dashboard</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Reporting')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="document-text-outline" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          {/* Main amount */}
          <Text style={styles.heroLabel}>Total Revenue</Text>
          <Text style={styles.heroAmount}>{fmt(totalRevenue)}</Text>

          {/* Stats */}
          {financialData && (
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{fmt(financialData.outstanding_invoices)}</Text>
                <Text style={styles.heroStatLabel}>Outstanding</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{fmt(financialData.yearly_projection)}</Text>
                <Text style={styles.heroStatLabel}>Projected / yr</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* KPI Stat Cards — overlap hero bottom */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: '#10B981' }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="cash-outline" size={16} color="#10B981" />
            </View>
            <Text style={styles.kpiValue}>{fmt(totalRevenue)}</Text>
            <Text style={styles.kpiLabel}>Revenue</Text>
            {financialData && financialData.quarterly_growth !== 0 && (
              <View style={styles.kpiChange}>
                <Ionicons
                  name={financialData.quarterly_growth > 0 ? 'trending-up' : 'trending-down'}
                  size={11}
                  color={financialData.quarterly_growth > 0 ? '#10B981' : '#EF4444'}
                />
                <Text style={[styles.kpiChangeText, { color: financialData.quarterly_growth > 0 ? '#10B981' : '#EF4444' }]}>
                  {financialData.quarterly_growth > 0 ? '+' : ''}{financialData.quarterly_growth.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#F59E0B' }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time-outline" size={16} color="#F59E0B" />
            </View>
            <Text style={styles.kpiValue}>{fmt(financialData?.outstanding_invoices ?? 0)}</Text>
            <Text style={styles.kpiLabel}>Outstanding</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#EF4444' }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
            </View>
            <Text style={styles.kpiValue}>{fmt(financialData?.overdue_amount ?? 0)}</Text>
            <Text style={styles.kpiLabel}>Overdue</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentBody}>
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />

          {error ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
              </View>
              <Text style={styles.errorTitle}>Unable to load finances</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : financialData ? (
            <>
              <ChartSection financialData={financialData} formatCurrency={fmt} />
              <QuickActions navigation={navigation} />
              <FinancialInsights financialData={financialData} formatCurrency={fmt} />
            </>
          ) : null}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Full-bleed Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  heroDecorCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -50,
    right: -40,
  },
  heroDecorSmall: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 10,
    left: -20,
  },
  heroDecorDiamond: {
    position: 'absolute',
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 80,
    right: 60,
    transform: [{ rotate: '45deg' }],
    borderRadius: 6,
  },
  heroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    zIndex: 1,
  },
  heroNavTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    zIndex: 1,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    marginBottom: 24,
    zIndex: 1,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  heroStat: {
    alignItems: 'flex-start',
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 24,
  },

  // KPI Cards — overlap hero bottom
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: -20,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderLeftWidth: 3,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.3,
    marginBottom: 1,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#717171',
    fontWeight: '500',
  },
  kpiChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  kpiChangeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Content
  contentBody: {
    paddingHorizontal: 16,
  },

  // Error
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 14,
    color: '#717171',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  bottomSpacer: {
    height: 20,
  },
});

export default FinanceDashboardScreen;
