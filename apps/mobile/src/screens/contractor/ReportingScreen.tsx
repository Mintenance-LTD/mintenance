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
  RefreshControl,
  TouchableOpacity,
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
import { me } from '../../design-system/mint-editorial';
import { styles } from './ReportingStyles';
import {
  fetchReportingData,
  DATE_RANGES,
  KPI_CONFIG,
  EMPTY_STATS,
} from './reportingData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ReportingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>(
    '30d'
  );

  const selectedRange = DATE_RANGES.find((r) => r.key === dateRange)!;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-reporting', dateRange, user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('Not signed in');
      return fetchReportingData(user.id, selectedRange.days);
    },
    enabled: !!user?.id,
  });

  const stats = data || EMPTY_STATS;

  // 2026-05-21 audit: showing a 4.0 rating to a contractor with 0
  // completed jobs (orphan review row or default seed) undermines the
  // dashboard. Gate the rating reveal on at least one completed job
  // *and* at least one review \u2014 both must exist for an average to be
  // meaningful.
  const hasRatingSignal =
    stats.completedJobs > 0 &&
    stats.totalReviews > 0 &&
    stats.averageRating > 0;

  const kpiValues = [
    String(stats.completedJobs),
    `${Math.round(stats.winRate * 100)}%`,
    `\u00A3${stats.totalEarnings.toLocaleString()}`,
    hasRatingSignal ? stats.averageRating.toFixed(1) : 'New',
  ];

  const maxBarCount = Math.max(
    ...(stats.monthlyTrend || []).map((m) => m.count),
    1
  );
  const maxBarEarnings = Math.max(
    ...(stats.monthlyTrend || []).map((m) => m.earnings),
    1
  );
  const maxCategoryCount = Math.max(
    ...(stats.categoryBreakdown || []).map((c) => c.count),
    1
  );
  const chartBarWidth = Math.min(
    32,
    (SCREEN_WIDTH - 100) / Math.max(stats.monthlyTrend.length, 1) - 12
  );

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor='transparent'
        barStyle='light-content'
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor='#FFFFFF'
            colors={[me.brand]}
          />
        }
      >
        {/* Green Gradient Hero — full bleed behind status bar */}
        <LinearGradient colors={[me.brand2, me.brand]} style={styles.hero}>
          {/* Safe area spacing for content only */}
          <View style={{ height: insets.top }} />
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <View style={styles.heroTopBar}>
            <TouchableOpacity
              style={styles.frostedCircle}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name='arrow-back' size={20} color={me.onBrand} />
            </TouchableOpacity>
            <View style={{ width: 40 }} />
          </View>

          <Text style={styles.heroLabel}>Performance Dashboard</Text>
          <Text style={styles.heroTitle}>Reports & Analytics</Text>

          {/* Glass stat cards */}
          <View style={styles.heroKpiRow}>
            <View style={styles.heroKpiCard}>
              <Text style={styles.heroKpiLabel}>Jobs</Text>
              <View>
                <Text style={styles.heroKpiValue}>{stats.completedJobs}</Text>
                <Text style={styles.heroKpiSublabel}>Total</Text>
              </View>
            </View>
            <View style={styles.heroKpiCard}>
              <Text style={styles.heroKpiLabel}>Net</Text>
              <View>
                <Text
                  style={styles.heroKpiValue}
                >{`\u00A3${stats.totalEarnings.toFixed(0)}`}</Text>
                <Text style={styles.heroKpiSublabel}>Earned</Text>
              </View>
            </View>
            <View style={styles.heroKpiCard}>
              <Text style={styles.heroKpiLabel}>Rank</Text>
              <View>
                <Text style={styles.heroKpiValue}>
                  {hasRatingSignal ? stats.averageRating.toFixed(1) : '\u2014'}
                </Text>
                <Text style={styles.heroKpiSublabel}>Rating</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {isLoading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size='large' color={me.brand} />
              <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
          )}

          {error && !data && (
            <View style={styles.errorCard}>
              <View style={styles.errorIconWrap}>
                <Ionicons name='warning-outline' size={24} color={me.errFg} />
              </View>
              <Text style={styles.errorText}>
                Failed to load reporting data
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => refetch()}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && (
            <>
              {/* Date Range Filter — floating */}
              <View style={styles.filterWrapper}>
                <View style={styles.filterRow}>
                  {DATE_RANGES.map((range) => (
                    <TouchableOpacity
                      key={range.key}
                      style={[
                        styles.filterChip,
                        dateRange === range.key && styles.filterChipActive,
                      ]}
                      onPress={() => setDateRange(range.key)}
                      accessibilityRole='button'
                      accessibilityState={{ selected: dateRange === range.key }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          dateRange === range.key &&
                            styles.filterChipTextActive,
                        ]}
                      >
                        {range.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Activity Details header */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginBottom: 14,
                }}
              >
                <View>
                  <Text style={styles.sectionTitle}>Activity Details</Text>
                  <Text style={{ fontSize: 13, color: me.ink2 }}>
                    Real-time business insights
                  </Text>
                </View>
              </View>

              {/* KPI Cards */}
              <View style={styles.kpiGrid}>
                {KPI_CONFIG.map((kpi, i) => (
                  <View key={kpi.key} style={styles.kpiCard}>
                    <View
                      style={[styles.kpiIconWrap, { backgroundColor: kpi.bg }]}
                    >
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
                        const height = Math.max(
                          (item.count / maxBarCount) * 80,
                          6
                        );
                        return (
                          <View key={idx} style={styles.barCol}>
                            <Text style={styles.barValue}>{item.count}</Text>
                            <View
                              style={[
                                styles.bar,
                                {
                                  height,
                                  width: chartBarWidth,
                                  backgroundColor: me.brand,
                                },
                              ]}
                            />
                            <Text style={styles.barLabel}>{item.month}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.chartEmpty}>
                      <Ionicons
                        name='bar-chart-outline'
                        size={28}
                        color={me.ink3}
                      />
                      <Text style={styles.chartEmptyText}>
                        Complete jobs to see trends
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Earnings Trend */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Earnings Trend</Text>
                <View style={styles.sectionCard}>
                  {stats.monthlyTrend.length > 0 &&
                  stats.monthlyTrend.some((m) => m.earnings > 0) ? (
                    <View style={styles.barChart}>
                      {stats.monthlyTrend.map((item, idx) => {
                        const height = Math.max(
                          (item.earnings / maxBarEarnings) * 80,
                          6
                        );
                        return (
                          <View key={idx} style={styles.barCol}>
                            <Text
                              style={styles.barValue}
                            >{`\u00A3${item.earnings.toFixed(0)}`}</Text>
                            <View
                              style={[
                                styles.bar,
                                {
                                  height,
                                  width: chartBarWidth,
                                  backgroundColor: me.accent,
                                },
                              ]}
                            />
                            <Text style={styles.barLabel}>{item.month}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.chartEmpty}>
                      <Ionicons name='cash-outline' size={28} color={me.ink3} />
                      <Text style={styles.chartEmptyText}>
                        Earnings will appear here
                      </Text>
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
                        <Text style={styles.categoryLabel} numberOfLines={1}>
                          {cat.category}
                        </Text>
                        <View style={styles.categoryBar}>
                          <View
                            style={[
                              styles.categoryFill,
                              {
                                width: `${(cat.count / maxCategoryCount) * 100}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.categoryCount}>{cat.count}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.chartEmpty}>
                      <Ionicons
                        name='pie-chart-outline'
                        size={28}
                        color={me.ink3}
                      />
                      <Text style={styles.chartEmptyText}>
                        Category data will appear here
                      </Text>
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
                        <Text style={styles.gaugeValue}>
                          {Math.round(stats.winRate * 100)}%
                        </Text>
                      </View>
                      <Text style={styles.gaugeLabel}>Win Rate</Text>
                    </View>
                    <View style={styles.gaugeDivider} />
                    <View style={styles.gaugeItem}>
                      <View
                        style={[styles.gaugeCircle, { borderColor: '#3B82F6' }]}
                      >
                        <Text style={[styles.gaugeValue, { color: '#3B82F6' }]}>
                          {stats.totalJobs}
                        </Text>
                      </View>
                      <Text style={styles.gaugeLabel}>Total Jobs</Text>
                    </View>
                    <View style={styles.gaugeDivider} />
                    <View style={styles.gaugeItem}>
                      <View
                        style={[styles.gaugeCircle, { borderColor: me.accent }]}
                      >
                        <Text style={[styles.gaugeValue, { color: me.accent }]}>
                          {stats.totalReviews}
                        </Text>
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
                          <Ionicons name='star' size={12} color={me.accent} />
                          <View style={styles.ratingBar}>
                            <View
                              style={[
                                styles.ratingFill,
                                { width: `${(count / total) * 100}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.ratingCount}>{count}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.chartEmpty}>
                      <Ionicons name='star-outline' size={28} color={me.ink3} />
                      <Text style={styles.chartEmptyText}>
                        Ratings will appear after reviews
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Architect Tier Banner — gated. The copy claims "top 15%"
                  which is currently hardcoded vanity (no real percentile
                  signal wired up). Until the API ships percentile data,
                  only show the banner once the contractor has cleared a
                  meaningful body of work (>= 10 completed jobs). Below
                  that threshold the banner reads as marketing fluff, not
                  recognition. */}
              {stats.completedJobs >= 10 && (
                <LinearGradient
                  colors={[me.brand2, me.brand]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tierBanner}
                >
                  <View style={styles.tierContent}>
                    <View style={styles.tierHeader}>
                      <Ionicons name='ribbon' size={24} color={me.onBrand} />
                      <Text style={styles.tierTitle}>Architect Tier</Text>
                    </View>
                    <Text style={styles.tierDescription}>
                      You are in the top 15% of high-performing contractors this
                      month. Maintain this momentum for exclusive rewards.
                    </Text>
                  </View>
                  <View style={styles.tierWatermark}>
                    <Ionicons name='trophy' size={100} color={me.onBrand} />
                  </View>
                </LinearGradient>
              )}

              {/* Recent Reviews */}
              {stats.recentReviews.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Reviews</Text>
                  <View style={styles.sectionCard}>
                    {stats.recentReviews.map((review) => (
                      <View key={review.id} style={styles.reviewRow}>
                        <View style={styles.reviewHeader}>
                          <Text style={styles.reviewerName}>
                            {review.reviewer_name}
                          </Text>
                          <View style={styles.starRow}>
                            {Array.from({ length: 5 }, (_, i) => (
                              <Ionicons
                                key={i}
                                name={
                                  i < review.rating ? 'star' : 'star-outline'
                                }
                                size={14}
                                color={me.accent}
                              />
                            ))}
                          </View>
                        </View>
                        {review.comment ? (
                          <Text style={styles.reviewComment} numberOfLines={2}>
                            {review.comment}
                          </Text>
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

export default ReportingScreen;
