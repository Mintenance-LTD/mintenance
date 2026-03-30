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
import { theme, gradients } from '../theme';

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
            tintColor='#FFFFFF'
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Full-Bleed Gradient Hero — extends to very top */}
        <LinearGradient
          colors={gradients.heroGreen}
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
              <Ionicons
                name='arrow-back'
                size={24}
                color={theme.colors.textInverse}
              />
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
            <View
              style={[
                styles.kpiIcon,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons
                name='cash-outline'
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Revenue</Text>
              <Text style={styles.kpiValue}>{fmt(totalRevenue)}</Text>
            </View>
          </View>
          <View style={styles.kpiCard}>
            <View
              style={[
                styles.kpiIcon,
                { backgroundColor: theme.colors.accentLight },
              ]}
            >
              <Ionicons
                name='time-outline'
                size={22}
                color={theme.colors.accent}
              />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Outstanding</Text>
              <Text style={styles.kpiValue}>
                {fmt(financialData?.outstanding_invoices ?? 0)}
              </Text>
            </View>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons
                name='alert-circle-outline'
                size={22}
                color={theme.colors.error}
              />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Overdue</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.error }]}>
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
                <Ionicons
                  name='alert-circle'
                  size={32}
                  color={theme.colors.error}
                />
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
    backgroundColor: theme.colors.backgroundSecondary,
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
    color: theme.colors.textInverse,
    letterSpacing: -0.3,
  },
  heroLabel: {
    fontSize: 10,
    color: theme.colors.primaryLight,
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
    color: theme.colors.textInverse,
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
    color: theme.colors.primaryLight,
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
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 18,
    borderLeftWidth: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 1,
  },
  kpiLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },

  bottomSpacer: {
    height: 20,
  },
});

export default FinanceDashboardScreen;
