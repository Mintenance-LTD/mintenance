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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { useResponsive } from '../../hooks/useResponsive';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PaymentService } from '../../services/PaymentService';

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

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'PaymentHistory'>;
}

const PAGE_SIZE = 20;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
    case 'succeeded':
      return theme.colors.primary;
    case 'pending':
    case 'processing':
      return '#F59E0B';
    case 'failed':
    case 'refunded':
      return '#EF4444';
    default:
      return theme.colors.textSecondary;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed':
    case 'succeeded':
      return 'Paid';
    case 'pending':
      return 'Pending';
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
    {payment.last4 && (
      <View style={styles.methodRow}>
        <Ionicons name="card-outline" size={14} color={theme.colors.textTertiary} />
        <Text style={styles.methodText}>
          **** {payment.last4}
        </Text>
      </View>
    )}
  </View>
);

type FilterType = 'all' | 'completed' | 'pending' | 'refunded';

export const PaymentHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const { isTablet } = useResponsive();
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
    queryKey: ['payment-history'],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await PaymentService.getPaymentHistory(PAGE_SIZE, pageParam) as {
        payments?: PaymentRecord[];
        total?: number;
        error?: string;
      };
      if (result.error) throw new Error(result.error);
      return {
        payments: result.payments || [],
        total: result.total || 0,
        offset: pageParam as number,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + PAGE_SIZE;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
  });

  const allPayments = data?.pages.flatMap((page) => page.payments) || [];

  const payments = filter === 'all'
    ? allPayments
    : allPayments.filter((p) => {
        if (filter === 'completed') return p.status === 'completed' || p.status === 'succeeded';
        if (filter === 'pending') return p.status === 'pending' || p.status === 'processing';
        if (filter === 'refunded') return p.status === 'refunded';
        return true;
      });

  const totalPaid = allPayments
    .filter((p) => p.status === 'completed' || p.status === 'succeeded')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = allPayments
    .filter((p) => p.status === 'pending' || p.status === 'processing')
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
      <ScreenHeader title="Payment History" showBack onBack={() => navigation.goBack()} />

      {/* Stats Row */}
      {allPayments.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Paid</Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {'\u00A3'}{totalPaid.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {'\u00A3'}{totalPending.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Refunded</Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {'\u00A3'}{totalRefunded.toFixed(2)}
            </Text>
          </View>
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
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
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
    backgroundColor: theme.colors.background,
  },
  listContainer: {
    padding: 16,
  },
  paymentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
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
    color: theme.colors.textPrimary,
  },
  paymentDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 6,
  },
  methodText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
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
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  filterChipActive: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
});

export default PaymentHistoryScreen;

