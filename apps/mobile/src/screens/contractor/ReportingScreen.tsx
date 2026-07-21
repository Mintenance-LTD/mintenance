/**
 * ReportingScreen — Mint Editorial redesign per redesign-v2
 * contractor business deck screen 09 "Reports".
 *
 * Layout:
 *   1. Lightweight back nav + serif "Reports" header with a
 *      period-aware sub line.
 *   2. Quarter switcher pills (This quarter / Last 30 days /
 *      Last 12 months / 7 days). Dark = active.
 *   3. NET REVENUE card with embedded monthly bar chart. The most
 *      recent 3 months (current quarter) are rendered with the
 *      stronger brand fill, prior months with the soft mint pastel,
 *      matching the deck's "current quarter highlighted" treatment.
 *   4. "Top categories · this period" list (the deck shows specific
 *      jobs; our existing aggregation returns category buckets, so
 *      we surface those under their honest label rather than fake
 *      per-job names).
 *   5. "Share report" CTA — exports the on-screen figures (net
 *      revenue, monthly breakdown, top categories) through the OS
 *      share sheet via React Native's built-in Share API, so it works
 *      in the shipped binary with no extra native module. A future PR
 *      can upgrade this to a branded PDF via `expo-print` (needs an EAS
 *      rebuild) + a `/api/contractor/reports/pdf` round-trip.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';
import { styles } from './reporting/styles';
import { fetchReportingData, EMPTY_STATS } from './reportingData';

type RangeKey = 'this-q' | '30d' | '12mo' | '7d';

interface RangeSpec {
  key: RangeKey;
  label: string;
  days: number;
}

// 2026-07-20: ordered by duration. Previously quarter → 30 days → 12 months
// → 7 days, which reads as random rather than as a scale.
const RANGES: readonly RangeSpec[] = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: 'this-q', label: 'This quarter', days: 90 },
  { key: '12mo', label: 'Last 12 months', days: 365 },
];

const fmtGBP = (n: number): string =>
  `£${Math.round(n).toLocaleString('en-GB')}`;

export const ReportingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [rangeKey, setRangeKey] = useState<RangeKey>('this-q');
  const selectedRange = RANGES.find((r) => r.key === rangeKey) ?? RANGES[0]!;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-reporting', rangeKey, user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('Not signed in');
      return fetchReportingData(user.id, selectedRange.days);
    },
    enabled: !!user?.id,
  });

  const stats = data || EMPTY_STATS;

  // Last 3 bars = current quarter (highlighted). We compare on month
  // string equality with the trailing months from `now`.
  const currentQuarterMonths = useMemo(() => {
    const set = new Set<string>();
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      set.add(d.toLocaleString('en-GB', { month: 'short' }));
    }
    return set;
  }, []);

  const maxEarnings = Math.max(
    ...(stats.monthlyTrend || []).map((m) => m.earnings),
    1
  );

  const handleExport = async () => {
    const lines: string[] = [
      'Mintenance — contractor report',
      selectedRange.label,
      '',
      `Net revenue: ${fmtGBP(stats.totalEarnings)}`,
      `Jobs completed: ${stats.completedJobs}`,
    ];

    const monthsWithEarnings = stats.monthlyTrend.filter((m) => m.earnings > 0);
    if (monthsWithEarnings.length > 0) {
      lines.push('', 'Monthly breakdown:');
      for (const m of monthsWithEarnings) {
        lines.push(
          `  ${m.month}: ${fmtGBP(m.earnings)} (${m.count} ${
            m.count === 1 ? 'job' : 'jobs'
          })`
        );
      }
    }

    if (stats.categoryBreakdown.length > 0) {
      lines.push('', 'Top categories:');
      for (const c of stats.categoryBreakdown) {
        lines.push(
          `  ${c.category}: ${c.count} ${c.count === 1 ? 'job' : 'jobs'}`
        );
      }
    }

    lines.push('', 'Generated from the Mintenance contractor app.');

    try {
      await Share.share({
        title: `Mintenance report — ${selectedRange.label}`,
        message: lines.join('\n'),
      });
    } catch {
      Alert.alert(
        'Could not open share sheet',
        'Please try again, or sign in at mintenance.co.uk/contractor for the full dashboard.'
      );
    }
  };

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
            refreshing={false}
            onRefresh={refetch}
            tintColor={me.brand}
            colors={[me.brand]}
          />
        }
      >
        <View style={[styles.topNav, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
            accessibilityLabel='Go back'
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name='arrow-back' size={20} color={me.ink} />
          </TouchableOpacity>
        </View>

        <View style={styles.screenHeader}>
          <Text style={styles.eyebrow}>Reports</Text>
          <Text style={styles.headline}>Reports</Text>
          <Text style={styles.sub}>{selectedRange.label}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScroll}
          contentContainerStyle={styles.pillsRow}
        >
          {RANGES.map((r) => {
            const active = rangeKey === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setRangeKey(r.key)}
                accessibilityRole='button'
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.pillText, active && styles.pillTextActive]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size='large' color={me.brand} />
            <Text style={styles.loadingText}>Loading analytics…</Text>
          </View>
        ) : error && !data ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name='warning-outline' size={22} color={me.errFg} />
            </View>
            <Text style={styles.errorText}>Failed to load reports</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refetch()}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueEyebrow}>Net revenue</Text>
              <Text style={styles.revenueAmount}>
                {fmtGBP(stats.totalEarnings)}
              </Text>
              {stats.monthlyTrend.length > 0 &&
              stats.monthlyTrend.some((m) => m.earnings > 0) ? (
                <>
                  <View style={styles.chartRow}>
                    {stats.monthlyTrend.map((item, i) => {
                      const ratio = Math.max(item.earnings / maxEarnings, 0.06);
                      const heightPct =
                        `${Math.round(ratio * 100)}%` as `${number}%`;
                      const inQuarter = currentQuarterMonths.has(item.month);
                      return (
                        <View key={i} style={styles.chartCol}>
                          <View
                            style={[
                              styles.bar,
                              { height: heightPct },
                              inQuarter ? styles.barActive : styles.barIdle,
                            ]}
                          />
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.chartLabelsRow}>
                    {stats.monthlyTrend.map((item, i) => (
                      <Text key={i} style={styles.chartLabel}>
                        {item.month}
                      </Text>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.chartEmpty}>
                  <Ionicons
                    name='bar-chart-outline'
                    size={26}
                    color={me.ink3}
                  />
                  <Text style={styles.chartEmptyText}>
                    Bars appear once you have completed jobs in this window.
                  </Text>
                </View>
              )}
            </View>

            {/* 2026-07-20: fetchReportingData already queries bids and
                reviews and computes winRate / averageRating / completedJobs
                — the screen rendered none of them, so two of its four
                queries were pure waste on every load and every range switch.
                These are the same numbers, now shown. No new queries. */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{stats.completedJobs}</Text>
                <Text style={styles.kpiLabel}>
                  {stats.completedJobs === 1 ? 'Job done' : 'Jobs done'}
                </Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>
                  {Math.round(stats.winRate)}%
                </Text>
                <Text style={styles.kpiLabel}>Win rate</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>
                  {stats.totalReviews > 0
                    ? `${stats.averageRating.toFixed(1)}★`
                    : '—'}
                </Text>
                <Text style={styles.kpiLabel}>
                  {stats.totalReviews > 0
                    ? `${stats.totalReviews} review${stats.totalReviews === 1 ? '' : 's'}`
                    : 'No reviews yet'}
                </Text>
              </View>
            </View>

            {stats.categoryBreakdown.length > 0 ? (
              <>
                <Text style={styles.sectionEyebrow}>
                  Top categories · this period
                </Text>
                <View style={styles.listCard}>
                  {stats.categoryBreakdown.map((cat, idx) => (
                    <View
                      key={cat.category}
                      style={[
                        styles.listRow,
                        idx === stats.categoryBreakdown.length - 1 &&
                          styles.listRowLast,
                      ]}
                    >
                      <Text style={styles.listLabel} numberOfLines={1}>
                        {cat.category}
                      </Text>
                      <Text style={styles.listValue}>
                        {cat.count} {cat.count === 1 ? 'job' : 'jobs'}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExport}
              accessibilityRole='button'
              accessibilityLabel='Share report for accountant'
            >
              <Ionicons name='share-outline' size={16} color={me.ink} />
              <Text style={styles.exportText}>Share report for accountant</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default ReportingScreen;
