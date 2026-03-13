/**
 * ReportingScreen — Contractor analytics with green gradient hero
 *
 * Full-bleed hero with KPI summary, date range filters,
 * bar charts, category breakdown, rating distribution, recent reviews.
 * Uses direct Supabase queries for real data.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MarketingStats {
  completedJobs: number;
  totalJobs: number;
  winRate: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  monthlyTrend: Array<{ month: string; count: number; earnings: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
  ratingDistribution: Record<string, number>;
  recentReviews: Array<{ id: string; rating: number; comment: string; reviewer_name: string; created_at: string }>;
}

const DATE_RANGES = [
  { key: '7d' as const, label: '7 days', days: 7 },
  { key: '30d' as const, label: '30 days', days: 30 },
  { key: '90d' as const, label: '90 days', days: 90 },
  { key: '1y' as const, label: 'This year', days: 365 },
];

const KPI_CONFIG = [
  { key: 'jobs', icon: 'checkmark-circle-outline' as const, color: '#10B981', bg: '#D1FAE5', label: 'Jobs Done' },
  { key: 'winRate', icon: 'trending-up-outline' as const, color: '#3B82F6', bg: '#DBEAFE', label: 'Win Rate' },
  { key: 'earnings', icon: 'cash-outline' as const, color: '#F59E0B', bg: '#FEF3C7', label: 'Earnings' },
  { key: 'rating', icon: 'star-outline' as const, color: '#8B5CF6', bg: '#EDE9FE', label: 'Avg Rating' },
];

const EMPTY_STATS: MarketingStats = {
  completedJobs: 0,
  totalJobs: 0,
  winRate: 0,
  totalEarnings: 0,
  averageRating: 0,
  totalReviews: 0,
  monthlyTrend: [],
  categoryBreakdown: [],
  ratingDistribution: {},
  recentReviews: [],
};

async function fetchReportingData(userId: string, days: number): Promise<MarketingStats> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  // Fetch jobs, bids, reviews, escrow in parallel
  const [jobsRes, bidsRes, reviewsRes, escrowRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, status, category, created_at')
      .eq('contractor_id', userId)
      .gte('created_at', sinceISO),
    supabase
      .from('bids')
      .select('id, status, job_id')
      .eq('contractor_id', userId)
      .gte('created_at', sinceISO),
    supabase
      .from('reviews')
      .select('id, rating, comment, created_at, reviewer:reviewer_id(first_name, last_name)')
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('escrow_transactions')
      .select('amount, status, created_at')
      .eq('contractor_id', userId)
      .eq('status', 'released')
      .gte('created_at', sinceISO),
  ]);

  const jobs = jobsRes.data || [];
  const bids = bidsRes.data || [];
  const reviews = reviewsRes.data || [];
  const escrow = escrowRes.data || [];

  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const totalJobs = jobs.length;
  const acceptedBids = bids.filter((b) => b.status === 'accepted').length;
  const totalBids = bids.length;
  const winRate = totalBids > 0 ? acceptedBids / totalBids : 0;
  const totalEarnings = escrow.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Rating calculations
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
    : 0;

  // Rating distribution
  const ratingDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  reviews.forEach((r) => {
    const key = String(Math.round(r.rating || 0));
    if (ratingDistribution[key] !== undefined) ratingDistribution[key]++;
  });

  // Monthly trend
  const monthMap: Record<string, { count: number; earnings: number }> = {};
  jobs.forEach((j) => {
    if (j.status === 'completed' && j.created_at) {
      const d = new Date(j.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { count: 0, earnings: 0 };
      monthMap[key].count++;
    }
  });
  escrow.forEach((e) => {
    if (e.created_at) {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { count: 0, earnings: 0 };
      monthMap[key].earnings += e.amount || 0;
    }
  });
  const monthlyTrend = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, val]) => {
      const [, m] = key.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return { month: monthNames[parseInt(m, 10) - 1], count: val.count, earnings: val.earnings };
    });

  // Category breakdown
  const catMap: Record<string, number> = {};
  jobs.filter((j) => j.status === 'completed').forEach((j) => {
    const cat = j.category || 'Other';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });
  const categoryBreakdown = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, count]) => ({ category, count }));

  // Recent reviews
  const recentReviews = reviews.slice(0, 5).map((r) => {
    const reviewer = r.reviewer as { first_name?: string; last_name?: string } | null;
    return {
      id: r.id,
      rating: r.rating || 0,
      comment: r.comment || '',
      reviewer_name: reviewer ? `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim() : 'Customer',
      created_at: r.created_at,
    };
  });

  return {
    completedJobs,
    totalJobs,
    winRate,
    totalEarnings,
    averageRating,
    totalReviews,
    monthlyTrend,
    categoryBreakdown,
    ratingDistribution,
    recentReviews,
  };
}

export const ReportingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const selectedRange = DATE_RANGES.find((r) => r.key === dateRange)!;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-reporting', dateRange, user?.id],
    queryFn: () => fetchReportingData(user!.id, selectedRange.days),
    enabled: !!user?.id,
  });

  const stats = data || EMPTY_STATS;

  const kpiValues = [
    String(stats.completedJobs),
    `${Math.round(stats.winRate * 100)}%`,
    `\u00A3${stats.totalEarnings.toLocaleString()}`,
    stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'New',
  ];

  const maxBarCount = Math.max(...(stats.monthlyTrend || []).map((m) => m.count), 1);
  const maxBarEarnings = Math.max(...(stats.monthlyTrend || []).map((m) => m.earnings), 1);
  const maxCategoryCount = Math.max(...(stats.categoryBreakdown || []).map((c) => c.count), 1);
  const chartBarWidth = Math.min(32, (SCREEN_WIDTH - 100) / Math.max(stats.monthlyTrend.length, 1) - 12);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#FFFFFF" colors={['#10B981']} />}
      >
        {/* Green Gradient Hero — full bleed behind status bar */}
        <LinearGradient
          colors={['#064E3B', '#059669', '#10B981']}
          style={styles.hero}
        >
          {/* Safe area spacing for content only */}
          <View style={{ height: insets.top }} />
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <View style={styles.heroTopBar}>
            <TouchableOpacity style={styles.frostedCircle} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Reports & Analytics</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.heroKpiRow}>
            <View style={styles.heroKpi}>
              <Text style={styles.heroKpiValue}>{stats.completedJobs}</Text>
              <Text style={styles.heroKpiLabel}>Jobs</Text>
            </View>
            <View style={styles.heroKpiDivider} />
            <View style={styles.heroKpi}>
              <Text style={styles.heroKpiValue}>{`\u00A3${stats.totalEarnings.toFixed(0)}`}</Text>
              <Text style={styles.heroKpiLabel}>Earned</Text>
            </View>
            <View style={styles.heroKpiDivider} />
            <View style={styles.heroKpi}>
              <Text style={styles.heroKpiValue}>{stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '\u2014'}</Text>
              <Text style={styles.heroKpiLabel}>Rating</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {isLoading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
          )}

          {error && !data && (
            <View style={styles.errorCard}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="warning-outline" size={24} color="#EF4444" />
              </View>
              <Text style={styles.errorText}>Failed to load reporting data</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && (
            <>
              {/* Date Range Filter */}
              <View style={styles.filterRow}>
                {DATE_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range.key}
                    style={[styles.filterChip, dateRange === range.key && styles.filterChipActive]}
                    onPress={() => setDateRange(range.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: dateRange === range.key }}
                  >
                    <Text style={[styles.filterChipText, dateRange === range.key && styles.filterChipTextActive]}>
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* KPI Cards */}
              <View style={styles.kpiGrid}>
                {KPI_CONFIG.map((kpi, i) => (
                  <View key={kpi.key} style={styles.kpiCard}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: kpi.bg }]}>
                      <Ionicons name={kpi.icon} size={18} color={kpi.color} />
                    </View>
                    <Text style={styles.kpiValue}>{kpiValues[i]}</Text>
                    <Text style={styles.kpiLabel}>{kpi.label}</Text>
                  </View>
                ))}
              </View>

              {/* Monthly Jobs Bar Chart */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Monthly Jobs</Text>
                <View style={styles.sectionCard}>
                  {stats.monthlyTrend.length > 0 ? (
                    <View style={styles.barChart}>
                      {stats.monthlyTrend.map((item, idx) => {
                        const height = Math.max((item.count / maxBarCount) * 80, 6);
                        return (
                          <View key={idx} style={styles.barCol}>
                            <Text style={styles.barValue}>{item.count}</Text>
                            <View style={[styles.bar, { height, width: chartBarWidth, backgroundColor: '#10B981' }]} />
                            <Text style={styles.barLabel}>{item.month}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.chartEmpty}>
                      <Ionicons name="bar-chart-outline" size={28} color="#B0B0B0" />
                      <Text style={styles.chartEmptyText}>Complete jobs to see trends</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Earnings Trend */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Earnings Trend</Text>
                <View style={styles.sectionCard}>
                  {stats.monthlyTrend.length > 0 && stats.monthlyTrend.some((m) => m.earnings > 0) ? (
                    <View style={styles.barChart}>
                      {stats.monthlyTrend.map((item, idx) => {
                        const height = Math.max((item.earnings / maxBarEarnings) * 80, 6);
                        return (
                          <View key={idx} style={styles.barCol}>
                            <Text style={styles.barValue}>{`\u00A3${item.earnings.toFixed(0)}`}</Text>
                            <View style={[styles.bar, { height, width: chartBarWidth, backgroundColor: '#F59E0B' }]} />
                            <Text style={styles.barLabel}>{item.month}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.chartEmpty}>
                      <Ionicons name="cash-outline" size={28} color="#B0B0B0" />
                      <Text style={styles.chartEmptyText}>Earnings will appear here</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Category Breakdown */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By Category</Text>
                <View style={styles.sectionCard}>
                  {stats.categoryBreakdown.length > 0 ? (
                    stats.categoryBreakdown.map((cat, idx) => (
                      <View key={idx} style={styles.categoryRow}>
                        <Text style={styles.categoryLabel} numberOfLines={1}>{cat.category}</Text>
                        <View style={styles.categoryBar}>
                          <View style={[styles.categoryFill, { width: `${(cat.count / maxCategoryCount) * 100}%` }]} />
                        </View>
                        <Text style={styles.categoryCount}>{cat.count}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.chartEmpty}>
                      <Ionicons name="pie-chart-outline" size={28} color="#B0B0B0" />
                      <Text style={styles.chartEmptyText}>Category data will appear here</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Win Rate Gauge */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bid Performance</Text>
                <View style={styles.sectionCard}>
                  <View style={styles.gaugeRow}>
                    <View style={styles.gaugeItem}>
                      <View style={styles.gaugeCircle}>
                        <Text style={styles.gaugeValue}>{Math.round(stats.winRate * 100)}%</Text>
                      </View>
                      <Text style={styles.gaugeLabel}>Win Rate</Text>
                    </View>
                    <View style={styles.gaugeDivider} />
                    <View style={styles.gaugeItem}>
                      <View style={[styles.gaugeCircle, { borderColor: '#3B82F6' }]}>
                        <Text style={[styles.gaugeValue, { color: '#3B82F6' }]}>{stats.totalJobs}</Text>
                      </View>
                      <Text style={styles.gaugeLabel}>Total Jobs</Text>
                    </View>
                    <View style={styles.gaugeDivider} />
                    <View style={styles.gaugeItem}>
                      <View style={[styles.gaugeCircle, { borderColor: '#F59E0B' }]}>
                        <Text style={[styles.gaugeValue, { color: '#F59E0B' }]}>{stats.totalReviews}</Text>
                      </View>
                      <Text style={styles.gaugeLabel}>Reviews</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Rating Distribution */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rating Distribution</Text>
                <View style={styles.sectionCard}>
                  {stats.totalReviews > 0 ? (
                    [5, 4, 3, 2, 1].map((star) => {
                      const count = stats.ratingDistribution[String(star)] || 0;
                      const total = stats.totalReviews || 1;
                      return (
                        <View key={star} style={styles.ratingRow}>
                          <Text style={styles.ratingLabel}>{star}</Text>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <View style={styles.ratingBar}>
                            <View style={[styles.ratingFill, { width: `${(count / total) * 100}%` }]} />
                          </View>
                          <Text style={styles.ratingCount}>{count}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.chartEmpty}>
                      <Ionicons name="star-outline" size={28} color="#B0B0B0" />
                      <Text style={styles.chartEmptyText}>Ratings will appear after reviews</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Recent Reviews */}
              {stats.recentReviews.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Reviews</Text>
                  <View style={styles.sectionCard}>
                    {stats.recentReviews.map((review) => (
                      <View key={review.id} style={styles.reviewRow}>
                        <View style={styles.reviewHeader}>
                          <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                          <View style={styles.starRow}>
                            {Array.from({ length: 5 }, (_, i) => (
                              <Ionicons key={i} name={i < review.rating ? 'star' : 'star-outline'} size={14} color="#F59E0B" />
                            ))}
                          </View>
                        </View>
                        {review.comment ? (
                          <Text style={styles.reviewComment} numberOfLines={2}>{review.comment}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },

  // Hero
  hero: { paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  decorCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -40 },
  decorCircle2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -30, left: -30 },
  heroTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  frostedCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  heroKpiRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8 },
  heroKpi: { flex: 1, alignItems: 'center' },
  heroKpiValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  heroKpiLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginTop: 2 },
  heroKpiDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },

  content: { padding: 16, paddingBottom: 40 },

  // Loading
  loadingWrap: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 14, color: '#717171', marginTop: 12 },

  // Error
  errorCard: { alignItems: 'center', padding: 32, backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16 },
  errorIconWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  errorText: { fontSize: 15, fontWeight: '600', color: '#222222', marginBottom: 12 },
  retryButton: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  filterChipActive: { backgroundColor: '#10B981' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#717171' },
  filterChipTextActive: { color: '#FFFFFF' },

  // KPI
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', gap: 4,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  kpiIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  kpiValue: { fontSize: 22, fontWeight: '700', color: '#222222' },
  kpiLabel: { fontSize: 11, color: '#B0B0B0', fontWeight: '600' },

  // Sections
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222222', letterSpacing: -0.2, marginBottom: 10 },
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },

  // Bar chart
  barChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 130, paddingTop: 20 },
  barCol: { alignItems: 'center', gap: 4 },
  bar: { borderRadius: 6 },
  barLabel: { fontSize: 11, color: '#B0B0B0' },
  barValue: { fontSize: 10, fontWeight: '700', color: '#717171' },

  // Chart empty
  chartEmpty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  chartEmptyText: { fontSize: 13, color: '#B0B0B0' },

  // Gauge
  gaugeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 8 },
  gaugeItem: { alignItems: 'center', gap: 8 },
  gaugeCircle: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
  },
  gaugeValue: { fontSize: 18, fontWeight: '700', color: '#10B981' },
  gaugeLabel: { fontSize: 12, color: '#717171', fontWeight: '500' },
  gaugeDivider: { width: 1, height: 40, backgroundColor: '#EBEBEB' },

  // Category
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  categoryLabel: { width: 80, fontSize: 13, color: '#717171' },
  categoryBar: { flex: 1, height: 8, backgroundColor: '#EBEBEB', borderRadius: 4 },
  categoryFill: { height: 8, backgroundColor: '#10B981', borderRadius: 4 },
  categoryCount: { width: 24, fontSize: 13, fontWeight: '700', color: '#222222', textAlign: 'right' },

  // Rating
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  ratingLabel: { width: 16, fontSize: 13, fontWeight: '700', color: '#222222' },
  ratingBar: { flex: 1, height: 8, backgroundColor: '#EBEBEB', borderRadius: 4 },
  ratingFill: { height: 8, backgroundColor: '#F59E0B', borderRadius: 4 },
  ratingCount: { width: 24, fontSize: 12, color: '#B0B0B0', textAlign: 'right' },

  // Reviews
  reviewRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEBEB', paddingBottom: 10, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: '#222222' },
  starRow: { flexDirection: 'row', gap: 1 },
  reviewComment: { fontSize: 14, color: '#717171', lineHeight: 18 },
});

export default ReportingScreen;
