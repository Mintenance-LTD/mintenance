import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../theme';
import { mobileApiClient } from '../../utils/mobileApiClient';

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  job_title?: string;
  payment_type?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: '#ECFDF5', text: '#047857' },
  held: { bg: '#EFF6FF', text: '#2563EB' },
  released: { bg: '#ECFDF5', text: '#047857' },
  refunded: { bg: '#FEF3C7', text: '#B45309' },
  pending: { bg: '#F3F4F6', text: '#6B7280' },
};

export const FinancialsScreen: React.FC = () => {
  const navigation = useNavigation();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['homeowner-financials'],
    queryFn: async () => {
      const [paymentsRes, subscriptionRes] = await Promise.all([
        mobileApiClient.get<{ payments: PaymentRecord[] }>('/api/payments/history?limit=50'),
        mobileApiClient.get<{ subscription: { planType: string; status: string } | null }>(
          '/api/subscriptions/status'
        ),
      ]);

      const payments = paymentsRes.payments || [];

      const totalSpent = payments
        .filter((p) => p.status === 'completed' || p.status === 'released')
        .reduce((sum, p) => sum + p.amount, 0);

      const inEscrow = payments
        .filter((p) => p.status === 'held')
        .reduce((sum, p) => sum + p.amount, 0);

      const refunded = payments
        .filter((p) => p.status === 'refunded')
        .reduce((sum, p) => sum + p.amount, 0);

      const thisMonth = payments
        .filter((p) => {
          const d = new Date(p.created_at);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        totalSpent,
        inEscrow,
        refunded,
        thisMonth,
        recentPayments: payments.slice(0, 5),
        subscription: subscriptionRes.subscription,
      };
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView onRetry={refetch} />;
  if (!data) return <ErrorView onRetry={refetch} />;

  const formatAmount = (amount: number) => `\u00A3${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Financials" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
      >
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <Card variant="elevated" padding="sm" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Spent</Text>
            <Text style={styles.kpiValue}>{formatAmount(data.totalSpent)}</Text>
          </Card>
          <Card variant="elevated" padding="sm" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>In Escrow</Text>
            <Text style={[styles.kpiValue, { color: '#2563EB' }]}>{formatAmount(data.inEscrow)}</Text>
          </Card>
          <Card variant="elevated" padding="sm" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Refunded</Text>
            <Text style={[styles.kpiValue, { color: '#B45309' }]}>{formatAmount(data.refunded)}</Text>
          </Card>
          <Card variant="elevated" padding="sm" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>This Month</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.primary }]}>{formatAmount(data.thisMonth)}</Text>
          </Card>
        </View>

        {/* Subscription Status */}
        {data.subscription && (
          <Card variant="elevated" padding="md" style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Subscription</Text>
              <Badge variant={data.subscription.status === 'active' ? 'success' : 'warning'} size="sm">
                {data.subscription.status}
              </Badge>
            </View>
            <Text style={styles.subscriptionPlan}>
              {data.subscription.planType} Plan
            </Text>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('Subscription')}
              style={styles.manageLink}
            >
              <Text style={styles.manageLinkText}>Manage Subscription</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </Card>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('PaymentHistory')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {data.recentPayments.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet.</Text>
          ) : (
            data.recentPayments.map((payment) => {
              const colors = STATUS_COLORS[payment.status] || STATUS_COLORS.pending;
              return (
                <View key={payment.id} style={styles.transactionRow}>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle} numberOfLines={1}>
                      {payment.job_title || 'Payment'}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(payment.created_at).toLocaleDateString('en-GB')}
                    </Text>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionAmount}>{formatAmount(payment.amount)}</Text>
                    <View style={[styles.statusDot, { backgroundColor: colors.text }]} />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  content: {
    padding: theme.layout.screenPadding,
    paddingBottom: theme.spacing[10],
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[6],
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    fontWeight: theme.typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing[1],
  },
  kpiValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  subscriptionPlan: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: theme.spacing[2],
  },
  manageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[2],
  },
  manageLinkText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  viewAllText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingVertical: theme.spacing[6],
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  transactionInfo: {
    flex: 1,
    marginRight: theme.spacing[3],
  },
  transactionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  transactionDate: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing[0.5],
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  transactionAmount: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default FinancialsScreen;
