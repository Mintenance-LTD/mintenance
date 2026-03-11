import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';
import { mobileApiClient } from '../../utils/mobileApiClient';

interface MarketingStats {
  completedJobs: number;
  winRate: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  monthlyTrend: Array<{ month: string; count: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
  ratingDistribution: Record<string, number>;
  recentReviews: Array<{ id: string; rating: number; comment: string; reviewer_name: string }>;
}

// Raw API response shape from /api/contractor/marketing-stats
interface ApiMarketingStats {
  stats: {
    completedJobs: number;
    winRate: number;
    totalEarnings: number;
    averageRating: number;
    totalReviews: number;
  };
  monthlyTrend: Array<{ month: string; jobsCompleted: number }>;
  categoryBreakdown: Array<{ category: string; value: number }>;
  ratingDistribution: Array<{ stars: number; count: number }>;
  recentReviews: Array<{ id: string; rating: number; comment: string; createdAt: string }>;
}

const DATE_RANGES = [
  { key: '7d' as const, label: 'Last 7 days' },
  { key: '30d' as const, label: 'Last 30 days' },
  { key: '90d' as const, label: 'Last 90 days' },
  { key: '1y' as const, label: 'This year' },
];

export const ReportingScreen: React.FC = () => {
  const navigation = useNavigation();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-reporting', dateRange],
    queryFn: async () => {
      const res = await mobileApiClient.get<ApiMarketingStats>(`/api/contractor/marketing-stats?range=${dateRange}`);
      // Transform nested API response to flat shape the UI expects
      const ratingDist: Record<string, number> = {};
      for (const entry of res.ratingDistribution || []) {
        ratingDist[String(entry.stars)] = entry.count;
      }
      return {
        completedJobs: res.stats.completedJobs,
        winRate: res.stats.winRate / 100, // API returns 0-100, UI does Math.round(val * 100)
        totalEarnings: res.stats.totalEarnings,
        averageRating: res.stats.averageRating,
        totalReviews: res.stats.totalReviews,
        monthlyTrend: (res.monthlyTrend || []).map((m) => ({ month: m.month, count: m.jobsCompleted })),
        categoryBreakdown: (res.categoryBreakdown || []).map((c) => ({ category: c.category, count: c.value })),
        ratingDistribution: ratingDist,
        recentReviews: (res.recentReviews || []).map((r) => ({
          id: r.id, rating: r.rating, comment: r.comment, reviewer_name: 'Customer',
        })),
      } satisfies MarketingStats;
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView message="Failed to load reporting data" onRetry={refetch} />;
  if (!data) return <ErrorView message="No reporting data available" onRetry={refetch} />;

  const maxCategoryCount = Math.max(...(data.categoryBreakdown || []).map((c) => c.count), 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Reports & Analytics" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
      >
        {/* Date Range Filter */}
        <View style={styles.filterRow}>
          {DATE_RANGES.map((range) => (
            <TouchableOpacity
              key={range.key}
              style={[
                styles.filterChip,
                dateRange === range.key && styles.filterChipActive,
              ]}
              onPress={() => setDateRange(range.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: dateRange === range.key }}
              accessibilityLabel={range.label}
            >
              <Text
                style={[
                  styles.filterChipText,
                  dateRange === range.key && styles.filterChipTextActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <Card variant="elevated" padding="sm" style={styles.kpiCard}>
            <Ionicons name="checkmark-circle" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.kpiValue}>{data.completedJobs}</Text>
            <Text style={styles.kpiLabel}>Jobs Done</Text>
          </Card>
          <Card variant="elevated" padding="sm" style={styles.kpiCard}>
            <Ionicons name="trending-up" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.kpiValue}>{Math.round(data.winRate * 100)}%</Text>
            <Text style={styles.kpiLabel}>Win Rate</Text>
          </Card>
          <Card variant="elevated" padding="sm" style={styles.kpiCard}>
            <Ionicons name="cash" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.kpiValue}>{'\u00A3'}{data.totalEarnings.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Earnings</Text>
          </Card>
          <Card variant="elevated" padding="sm" style={styles.kpiCard}>
            <Ionicons name="star" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.kpiValue}>{data.averageRating.toFixed(1)}</Text>
            <Text style={styles.kpiLabel}>Avg Rating</Text>
          </Card>
        </View>

        {/* Monthly Trend */}
        {data.monthlyTrend && data.monthlyTrend.length > 0 && (
          <Card variant="elevated" padding="md" style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Jobs</Text>
            <View style={styles.barChart}>
              {data.monthlyTrend.slice(-6).map((item, idx) => {
                const maxCount = Math.max(...data.monthlyTrend.map((m) => m.count), 1);
                const height = (item.count / maxCount) * 80;
                return (
                  <View key={idx} style={styles.barCol}>
                    <View style={[styles.bar, { height, backgroundColor: theme.colors.primary }]} />
                    <Text style={styles.barLabel}>{item.month.slice(0, 3)}</Text>
                    <Text style={styles.barValue}>{item.count}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Category Breakdown */}
        {data.categoryBreakdown && data.categoryBreakdown.length > 0 && (
          <Card variant="elevated" padding="md" style={styles.section}>
            <Text style={styles.sectionTitle}>By Category</Text>
            {data.categoryBreakdown.map((cat, idx) => (
              <View key={idx} style={styles.categoryRow}>
                <Text style={styles.categoryLabel}>{cat.category}</Text>
                <View style={styles.categoryBar}>
                  <View style={[styles.categoryFill, { width: `${(cat.count / maxCategoryCount) * 100}%` }]} />
                </View>
                <Text style={styles.categoryCount}>{cat.count}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Rating Distribution */}
        {data.ratingDistribution && (
          <Card variant="elevated" padding="md" style={styles.section}>
            <Text style={styles.sectionTitle}>Rating Distribution</Text>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = data.ratingDistribution[String(star)] || 0;
              const total = data.totalReviews || 1;
              return (
                <View key={star} style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>{star}</Text>
                  <Ionicons name="star" size={12} color={theme.colors.textSecondary} />
                  <View style={styles.ratingBar}>
                    <View style={[styles.ratingFill, { width: `${(count / total) * 100}%` }]} />
                  </View>
                  <Text style={styles.ratingCount}>{count}</Text>
                </View>
              );
            })}
          </Card>
        )}

        {/* Recent Reviews */}
        {data.recentReviews && data.recentReviews.length > 0 && (
          <Card variant="elevated" padding="md" style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {data.recentReviews.slice(0, 3).map((review) => (
              <View key={review.id} style={styles.reviewRow}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                  <View style={styles.starRow}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Ionicons key={i} name={i < review.rating ? 'star' : 'star-outline'} size={14} color={theme.colors.textSecondary} />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewComment} numberOfLines={2}>{review.comment}</Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  filterRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  filterChip: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.xxl,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.textInverse,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: theme.spacing.md },
  kpiCard: { flex: 1, minWidth: '45%', alignItems: 'center', gap: theme.spacing.xs },
  kpiValue: { fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary },
  kpiLabel: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textTertiary, fontWeight: theme.typography.fontWeight.medium },
  section: { marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary, marginBottom: theme.spacing[3] },
  barChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, paddingTop: theme.spacing[5] },
  barCol: { alignItems: 'center', gap: theme.spacing.xs },
  bar: { width: 28, borderRadius: theme.borderRadius.sm },
  barLabel: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textTertiary },
  barValue: { fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: theme.spacing.sm },
  categoryLabel: { width: 80, fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary },
  categoryBar: { flex: 1, height: 8, backgroundColor: theme.colors.borderLight, borderRadius: theme.borderRadius.sm },
  categoryFill: { height: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.sm },
  categoryCount: { width: 24, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary, textAlign: 'right' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  ratingLabel: { width: 16, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary },
  ratingBar: { flex: 1, height: 8, backgroundColor: theme.colors.borderLight, borderRadius: theme.borderRadius.sm },
  ratingFill: { height: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.sm },
  ratingCount: { width: 24, fontSize: theme.typography.fontSize.xs, color: theme.colors.textTertiary, textAlign: 'right' },
  reviewRow: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, paddingBottom: 10, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs },
  reviewerName: { fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary },
  starRow: { flexDirection: 'row', gap: 1 },
  reviewComment: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 18 },
});

export default ReportingScreen;
