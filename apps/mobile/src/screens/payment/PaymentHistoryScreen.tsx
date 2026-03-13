/**
 * PaymentHistoryScreen - View payment receipts and transaction history
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { useResponsive } from '../../hooks/useResponsive';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface EscrowPayment {
  id: string;
  jobId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  job?: { title?: string; description?: string };
  payer?: { first_name?: string; last_name?: string };
  payee?: { first_name?: string; last_name?: string };
}

interface PaymentRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  last4?: string;
  createdAt: string;
}

const mapEscrowToPayment = (p: EscrowPayment): PaymentRecord => ({
  id: p.id,
  jobId: p.jobId,
  jobTitle: p.job?.title || 'Payment',
  amount: Number(p.amount ?? 0),
  status: p.status,
  createdAt: p.createdAt,
});

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'PaymentHistory'>;
}

const PAGE_SIZE = 20;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
    case 'succeeded':
    case 'released':
      return '#10B981';
    case 'held':
      return '#3B82F6';
    case 'pending':
    case 'processing':
    case 'release_pending':
      return '#F59E0B';
    case 'failed':
    case 'refunded':
      return '#EF4444';
    default:
      return '#717171';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed':
    case 'succeeded':
    case 'released':
      return 'Paid';
    case 'held':
      return 'In Escrow';
    case 'pending':
      return 'Pending';
    case 'release_pending':
      return 'Releasing';
    case 'processing':
      return 'Processing';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
    default:
      return status;
  }
};

const getRefundExpectedDate = (createdAt: string): string => {
  const refundDate = new Date(createdAt);
  refundDate.setDate(refundDate.getDate() + 10);
  return refundDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const PaymentCard: React.FC<{ payment: PaymentRecord }> = ({ payment }) => (
  <View style={styles.paymentCard}>
    <View style={styles.paymentHeader}>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentTitle} numberOfLines={1}>
          {payment.jobTitle || `Job #${payment.jobId.slice(0, 8)}`}
        </Text>
        <Text style={styles.paymentDate}>
          {new Date(payment.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
      <View style={styles.paymentRight}>
        <Text style={styles.paymentAmount}>
          {'\u00A3'}{Number(payment.amount).toFixed(2)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
            {getStatusLabel(payment.status)}
          </Text>
        </View>
      </View>
    </View>
    {payment.status === 'refunded' && (
      <View style={styles.refundTimeline}>
        <Ionicons name="time-outline" size={14} color="#F59E0B" />
        <Text style={styles.refundTimelineText}>
          Expected by {getRefundExpectedDate(payment.createdAt)}
        </Text>
      </View>
    )}
    <View style={styles.cardFooter}>
      {payment.last4 && (
        <View style={styles.methodRow}>
          <Ionicons name="card-outline" size={14} color="#B0B0B0" />
          <Text style={styles.methodText}>
            **** {payment.last4}
          </Text>
        </View>
      )}
      {(payment.status === 'completed' || payment.status === 'succeeded') && (
        <TouchableOpacity
          style={styles.receiptButton}
          onPress={() => Linking.openURL(`https://mintenance.com/invoices/${payment.jobId}`)}
          accessibilityRole="button"
          accessibilityLabel="Download receipt"
        >
          <Ionicons name="download-outline" size={16} color="#222222" />
          <Text style={styles.receiptButtonText}>Receipt</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

type FilterType = 'all' | 'completed' | 'pending' | 'refunded';

export const PaymentHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const { isTablet } = useResponsive();
  const { user } = useAuth();
  const numColumns = isTablet ? 2 : 1;

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['payment-history', user?.id],
    queryFn: async ({ pageParam }: { pageParam: number | undefined }) => {
      if (!user?.id) return { payments: [], nextCursor: undefined };
      const offset = pageParam || 0;
      const { data: rows, error: err } = await supabase
        .from('escrow_payments')
        .select('id, job_id, payer_id, payee_id, amount, status, created_at, updated_at, job:job_id(title, description)')
        .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (err) throw new Error(err.message);
      const payments = (rows || []).map((r: Record<string, unknown>): PaymentRecord => {
        const job = r.job as Record<string, unknown> | null;
        return {
          id: r.id as string,
          jobId: r.job_id as string,
          jobTitle: (job?.title as string) || 'Payment',
          amount: Number(r.amount ?? 0),
          status: r.status as string,
          createdAt: r.created_at as string,
        };
      });
      return {
        payments,
        nextCursor: payments.length >= PAGE_SIZE ? offset + PAGE_SIZE : undefined,
      };
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user?.id,
  });

  const allPayments = data?.pages.flatMap((page) => page.payments) || [];

  const payments = filter === 'all'
    ? allPayments
    : allPayments.filter((p) => {
        if (filter === 'completed') return ['completed', 'succeeded', 'released', 'release_pending'].includes(p.status);
        if (filter === 'pending') return ['pending', 'processing', 'held'].includes(p.status);
        if (filter === 'refunded') return p.status === 'refunded';
        return true;
      });

  const totalPaid = allPayments
    .filter((p) => ['completed', 'succeeded', 'released', 'release_pending'].includes(p.status))
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = allPayments
    .filter((p) => ['pending', 'processing', 'held'].includes(p.status))
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalRefunded = allPayments
    .filter((p) => p.status === 'refunded')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) return <LoadingSpinner message="Loading payment history..." />;
  if (error) return <ErrorView message="Failed to load payment history" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
      <ScreenHeader title="Payment History" showBack onBack={() => navigation.goBack()} />

      {/* Stats Row */}
      {allPayments.length > 0 && (
        <View style={styles.statsRow}>
          {[
            { label: 'PAID', value: totalPaid, iconBg: '#D1FAE5', iconColor: '#10B981', icon: 'checkmark-circle-outline' as const },
            { label: 'PENDING', value: totalPending, iconBg: '#FEF3C7', iconColor: '#F59E0B', icon: 'time-outline' as const },
            { label: 'REFUNDED', value: totalRefunded, iconBg: '#FEE2E2', iconColor: '#EF4444', icon: 'arrow-undo-outline' as const },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: stat.iconBg }]}>
                <Ionicons name={stat.icon} size={14} color={stat.iconColor} />
              </View>
              <Text style={styles.statValue}>
                {'\u00A3'}{stat.value.toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['all', 'completed', 'pending', 'refunded'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {payments.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No Payments Yet"
          subtitle="Your payment transactions will appear here."
          ctaLabel="Go Back"
          onCtaPress={() => navigation.goBack()}
        />
      ) : (
        <FlatList
          key={numColumns}
          numColumns={numColumns}
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PaymentCard payment={item} />}
          columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#222222"
              colors={['#222222']}
            />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingMore}>
                <LoadingSpinner size="small" />
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  listContainer: {
    padding: 16,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfo: {
    flex: 1,
    marginRight: 12,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  paymentDate: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 4,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodText: {
    fontSize: 12,
    color: '#B0B0B0',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F7F7F7',
  },
  receiptButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222222',
  },
  refundTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  refundTimelineText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    color: '#B0B0B0',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  filterChipActive: {
    backgroundColor: '#222222',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#717171',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
});

export default PaymentHistoryScreen;
