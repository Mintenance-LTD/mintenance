import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LoadingSpinner, ErrorView } from '../../components/shared';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { ProfileStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  job_title?: string;
  payment_type?: string;
  category?: string;
}

const CATEGORY_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  plumbing: { icon: 'water-outline', color: '#3B82F6', label: 'Plumbing' },
  electrical: { icon: 'flash-outline', color: theme.colors.accent, label: 'Electrical' },
  roofing: { icon: 'home-outline', color: theme.colors.error, label: 'Roofing' },
  painting: { icon: 'color-palette-outline', color: '#8B5CF6', label: 'Painting' },
  carpentry: { icon: 'hammer-outline', color: '#F97316', label: 'Carpentry' },
  landscaping: { icon: 'leaf-outline', color: theme.colors.primary, label: 'Landscaping' },
  cleaning: { icon: 'sparkles-outline', color: '#06B6D4', label: 'Cleaning' },
  hvac: { icon: 'thermometer-outline', color: '#EC4899', label: 'HVAC' },
  general: { icon: 'construct-outline', color: theme.colors.textSecondary, label: 'General' },
};

const STATUS_COLORS: Record<string, string> = {
  completed: theme.colors.primary,
  held: '#3B82F6',
  released: theme.colors.primary,
  release_pending: theme.colors.accent,
  refunded: theme.colors.accent,
  pending: theme.colors.textTertiary,
};

export const FinancialsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['homeowner-financials', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data: rows, error: err } = await supabase
        .from('escrow_payments')
        .select('id, amount, status, created_at, category, jobs(title)')
        .eq('homeowner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (err) throw new Error(err.message);

      const payments: PaymentRecord[] = (rows || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        amount: (r.amount as number) || 0,
        status: r.status as string || 'pending',
        created_at: r.created_at as string,
        job_title: (r.jobs as Record<string, unknown>)?.title as string | undefined,
        category: r.category as string | undefined,
      }));

      // Fetch subscription from profile
      const { data: subRow } = await supabase
        .from('user_subscriptions')
        .select('plan_type, status')
        .eq('user_id', user.id)
        .single();

      const subscriptionRes = subRow ? { subscription: { planType: subRow.plan_type as string, status: subRow.status as string } } : { subscription: null };

      const totalSpent = payments
        .filter((p) => ['completed', 'released', 'release_pending'].includes(p.status))
        .reduce((sum, p) => sum + p.amount, 0);

      const inEscrow = payments
        .filter((p) => p.status === 'held' || p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);

      const refunded = payments
        .filter((p) => p.status === 'refunded')
        .reduce((sum, p) => sum + p.amount, 0);

      const now = new Date();
      const thisMonth = payments
        .filter((p) => {
          const d = new Date(p.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, p) => sum + p.amount, 0);

      // Build category breakdown from payments
      const categoryTotals: Record<string, number> = {};
      for (const p of payments.filter((pay) => ['completed', 'released', 'release_pending'].includes(pay.status))) {
        const cat = p.category || 'general';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + p.amount;
      }

      const categoryBreakdown = Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        totalSpent,
        inEscrow,
        refunded,
        thisMonth,
        recentPayments: payments.slice(0, 8),
        subscription: subscriptionRes.subscription,
        categoryBreakdown,
      };
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView message="Failed to load financial data" onRetry={refetch} />;
  if (!data) return <ErrorView message="No financial data available" onRetry={refetch} />;

  const fmt = (amount: number) => `\u00A3${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

  // Budget overview values
  const budgeted = data.totalSpent + data.inEscrow + data.refunded;
  const spent = data.totalSpent;
  const left = Math.max(budgeted - spent, 0);
  const spentPct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;

  // Donut segments
  const donutSegments = data.categoryBreakdown.length > 0
    ? data.categoryBreakdown.slice(0, 5)
    : [{ category: 'general', amount: 0, percentage: 100 }];

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#FFFFFF" colors={[theme.colors.primary]} />}
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

          <View style={{ height: insets.top + 12 }} />

          {/* Back button + title row */}
          <View style={styles.heroNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
            </TouchableOpacity>
            <Text style={styles.heroNavTitle}>My Finances</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Main amount */}
          <Text style={styles.heroLabel}>Total Spent</Text>
          <Text style={styles.heroAmount}>{fmt(data.totalSpent)}</Text>

          {/* Stats row */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{fmt(data.thisMonth)}</Text>
              <Text style={styles.heroStatLabel}>This Month</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{fmt(data.inEscrow)}</Text>
              <Text style={styles.heroStatLabel}>In Escrow</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stat Cards — horizontal row, overlapping hero bottom */}
        <View style={styles.statCardsRow}>
          <View style={styles.statCard}>
            <Ionicons name="card-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.statCardValue}>{fmt(data.totalSpent)}</Text>
            <Text style={styles.statCardLabel}>Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="lock-closed-outline" size={16} color="#3B82F6" />
            <Text style={styles.statCardValue}>{fmt(data.inEscrow)}</Text>
            <Text style={styles.statCardLabel}>Escrow</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="arrow-undo-outline" size={16} color={theme.colors.accent} />
            <Text style={styles.statCardValue}>{fmt(data.refunded)}</Text>
            <Text style={styles.statCardLabel}>Refunded</Text>
          </View>
        </View>

        {/* Content area with padding */}
        <View style={styles.contentBody}>
          {/* Budget Overview */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Budget Overview</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
            </View>

            <View style={styles.budgetRow}>
              <View style={styles.budgetItem}>
                <Text style={styles.budgetLabel}>Budgeted</Text>
                <Text style={styles.budgetValue}>{fmt(budgeted)}</Text>
              </View>
              <View style={styles.budgetItem}>
                <Text style={styles.budgetLabel}>Spent</Text>
                <Text style={[styles.budgetValue, { color: theme.colors.error }]}>{fmt(spent)}</Text>
              </View>
              <View style={styles.budgetItem}>
                <Text style={styles.budgetLabel}>Left</Text>
                <Text style={[styles.budgetValue, { color: theme.colors.primary }]}>{fmt(left)}</Text>
              </View>
            </View>

            <View style={styles.budgetBarBg}>
              <View style={[styles.budgetBarFill, { width: `${spentPct}%` }]} />
            </View>
            <Text style={styles.budgetHint}>
              {spentPct < 80 ? 'You are on track!' : spentPct < 100 ? 'Getting close to budget' : 'Over budget'}
            </Text>
          </View>

          {/* Spending Breakdown — Donut + Categories */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Spending Breakdown</Text>

            {data.categoryBreakdown.length > 0 && (
              <View style={styles.donutContainer}>
                <View style={styles.donutOuter}>
                  <View style={styles.donutInner}>
                    <Text style={styles.donutTotal}>{fmt(data.totalSpent)}</Text>
                    <Text style={styles.donutLabel}>Total</Text>
                  </View>
                </View>

                <View style={styles.donutLegend}>
                  {donutSegments.map((seg) => {
                    const config = CATEGORY_CONFIG[seg.category] || CATEGORY_CONFIG.general;
                    return (
                      <View key={seg.category} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: config.color }]} />
                        <Text style={styles.legendLabel}>{config.label}</Text>
                        <Text style={styles.legendPercent}>{seg.percentage}%</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Category Progress Bars */}
            {data.categoryBreakdown.slice(0, 6).map((cat) => {
              const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.general;
              const barWidth = Math.max(cat.percentage, 4);
              return (
                <View key={cat.category} style={styles.categoryRow}>
                  <View style={[styles.categoryIconWrap, { backgroundColor: `${config.color}18` }]}>
                    <Ionicons name={config.icon} size={16} color={config.color} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <View style={styles.categoryTopRow}>
                      <Text style={styles.categoryName}>{config.label}</Text>
                      <Text style={styles.categoryAmount}>{fmt(cat.amount)}</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${barWidth}%`, backgroundColor: config.color }]} />
                    </View>
                  </View>
                </View>
              );
            })}

            {data.categoryBreakdown.length === 0 && (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No spending data yet</Text>
              </View>
            )}
          </View>

          {/* Subscription Status */}
          {data.subscription && (
            <TouchableOpacity
              style={styles.subscriptionCard}
              onPress={() => navigation.navigate('Subscription')}
              activeOpacity={0.7}
            >
              <View style={styles.subscriptionLeft}>
                <View style={[styles.subscriptionIcon, { backgroundColor: data.subscription.status === 'active' ? '#D1FAE5' : theme.colors.accentLight }]}>
                  <Ionicons
                    name={data.subscription.status === 'active' ? 'shield-checkmark' : 'shield-outline'}
                    size={20}
                    color={data.subscription.status === 'active' ? theme.colors.primary : theme.colors.accent}
                  />
                </View>
                <View>
                  <Text style={styles.subscriptionTitle}>{data.subscription.planType} Plan</Text>
                  <Text style={styles.subscriptionStatus}>
                    {data.subscription.status === 'active' ? 'Active' : data.subscription.status}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}

          {/* Recent Transactions */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PaymentHistory')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {data.recentPayments.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="receipt-outline" size={24} color={theme.colors.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>No transactions yet</Text>
                <Text style={styles.emptySubtext}>Your payment history will appear here</Text>
              </View>
            ) : (
              data.recentPayments.map((payment, index) => {
                const cat = payment.category || 'general';
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;
                const statusColor = STATUS_COLORS[payment.status] || STATUS_COLORS.pending;
                const isLast = index === data.recentPayments.length - 1;

                return (
                  <View key={payment.id} style={[styles.transactionRow, isLast && styles.transactionRowLast]}>
                    <View style={[styles.transactionIcon, { backgroundColor: `${config.color}18` }]}>
                      <Ionicons name={config.icon} size={18} color={config.color} />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle} numberOfLines={1}>
                        {payment.job_title || 'Payment'}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {new Date(payment.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={styles.transactionAmount}>{fmt(payment.amount)}</Text>
                      <View style={styles.transactionStatusWrap}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.transactionStatus, { color: statusColor }]}>
                          {payment.status.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

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
  scrollView: {
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
    color: theme.colors.textInverse,
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
    color: theme.colors.textInverse,
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
    color: theme.colors.textInverse,
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

  // Stat Cards — overlap hero bottom
  statCardsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: -20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  statCardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
    marginTop: 6,
  },
  statCardLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },

  // Content body
  contentBody: {
    paddingHorizontal: 16,
  },

  // Section Card
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Budget Overview
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  budgetItem: {},
  budgetLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  budgetBarBg: {
    height: 8,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  budgetBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  budgetHint: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Donut
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  donutOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 12,
    borderColor: theme.colors.border,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutInner: {
    alignItems: 'center',
  },
  donutTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  donutLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  donutLegend: {
    flex: 1,
    marginLeft: 20,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  legendPercent: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },

  // Category Progress Bars
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  categoryAmount: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // Subscription
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  subscriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subscriptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textTransform: 'capitalize',
  },
  subscriptionStatus: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'capitalize',
  },

  // Transactions
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight,
  },
  transactionRowLast: {
    borderBottomWidth: 0,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  transactionStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  transactionStatus: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },

  bottomSpacer: {
    height: 20,
  },
});

export default FinancialsScreen;
