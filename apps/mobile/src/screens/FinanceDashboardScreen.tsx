import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
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
import { me } from '../design-system/mint-editorial';

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
    // SkeletonDashboard's root is `flex: 1, padding: 16` with no own
    // backgroundColor — returning it bare lets whatever the parent
    // navigator paints behind show through, which on OS-dark-mode
    // surfaces reads as a black screen with floating light skeleton
    // bars (the user-reported "finance screen is broken"). Wrap in
    // the screen's own container style so the loading state matches
    // the rest of the app — `styles.container` was captured at
    // module load time (light mode) so it's guaranteed light even
    // when dark mode is on.
    return (
      <View style={styles.container}>
        <SkeletonDashboard />
      </View>
    );
  }

  const totalRevenue = (financialData?.monthly_revenue ?? []).reduce(
    (sum, rev) => sum + rev,
    0
  );

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor='transparent'
        barStyle='light-content'
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={me.onBrand}
            colors={[me.brand]}
          />
        }
      >
        {/* Full-Bleed Gradient Hero — extends to very top */}
        <LinearGradient
          colors={[me.brand2, me.brand]}
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
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name='arrow-back' size={24} color={me.onBrand} />
            </TouchableOpacity>
            <Text style={styles.heroNavTitle}>Finance Dashboard</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Reporting')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name='document-text-outline'
                size={22}
                color='rgba(255,255,255,0.8)'
              />
            </TouchableOpacity>
          </View>

          {/* Main amount */}
          <Text style={styles.heroLabel}>Total Revenue</Text>
          <Text style={styles.heroAmount}>{fmt(totalRevenue)}</Text>

          {/* Stats */}
          {financialData && (
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {fmt(financialData.outstanding_invoices)}
                </Text>
                <Text style={styles.heroStatLabel}>Outstanding</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {fmt(financialData.yearly_projection)}
                </Text>
                <Text style={styles.heroStatLabel}>Projected / yr</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* KPI Status Cards */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: me.brandSoft }]}>
              <Ionicons name='cash-outline' size={22} color={me.brand} />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Revenue</Text>
              <Text style={styles.kpiValue}>{fmt(totalRevenue)}</Text>
              {financialData && financialData.quarterly_growth !== 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 2,
                    marginTop: 2,
                  }}
                >
                  <Ionicons
                    name={
                      financialData.quarterly_growth > 0
                        ? 'trending-up'
                        : 'trending-down'
                    }
                    size={12}
                    color={
                      financialData.quarterly_growth > 0 ? me.brand : me.errFg
                    }
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color:
                        financialData.quarterly_growth > 0
                          ? me.brand
                          : me.errFg,
                    }}
                  >
                    {financialData.quarterly_growth > 0 ? '+' : ''}
                    {financialData.quarterly_growth.toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: me.warnBg }]}>
              <Ionicons name='time-outline' size={22} color={me.accent} />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Outstanding</Text>
              <Text style={styles.kpiValue}>
                {fmt(financialData?.outstanding_invoices ?? 0)}
              </Text>
            </View>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: me.errBg }]}>
              <Ionicons
                name='alert-circle-outline'
                size={22}
                color={me.errFg}
              />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Overdue</Text>
              <Text style={[styles.kpiValue, { color: me.errFg }]}>
                {fmt(financialData?.overdue_amount ?? 0)}
              </Text>
            </View>
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
                <Ionicons name='alert-circle' size={32} color={me.errFg} />
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
              <ChartSection
                financialData={financialData}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Full-bleed Hero
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
    color: me.onBrand,
    letterSpacing: -0.3,
  },
  heroLabel: {
    fontSize: 10,
    color: me.brandSoft,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    zIndex: 1,
    opacity: 0.9,
  },
  heroAmount: {
    fontSize: 56,
    fontWeight: '800',
    color: me.onBrand,
    letterSpacing: -2,
    marginBottom: 28,
    zIndex: 1,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 32,
  },
  heroStat: {
    alignItems: 'flex-start',
  },
  heroStatValue: {
    fontSize: 24,
    fontWeight: '600',
    color: me.brandSoft,
    letterSpacing: -0.3,
  },
  heroStatLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroStatDivider: {
    display: 'none',
  },

  // KPI Cards
  kpiRow: {
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  kpiCard: {
    backgroundColor: me.surface,
    borderRadius: 24,
    padding: 18,
    borderLeftWidth: 0,
    borderWidth: 1,
    borderColor: me.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: me.ink,
    letterSpacing: -0.5,
    marginBottom: 1,
  },
  kpiLabel: {
    fontSize: 10,
    color: me.ink2,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Content
  contentBody: {
    paddingHorizontal: 16,
  },

  // Error
  errorCard: {
    backgroundColor: me.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: me.line,
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
    color: me.ink,
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 14,
    color: me.ink2,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: me.brand,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '600',
  },

  bottomSpacer: {
    height: 20,
  },
});

export default FinanceDashboardScreen;
