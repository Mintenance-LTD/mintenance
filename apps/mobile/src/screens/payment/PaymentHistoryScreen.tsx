/**
 * PaymentHistoryScreen — view payment receipts and transaction history.
 *
 * Mint Editorial polish per redesign-v2 homeowner-deck "Payments &
 * escrow" detail. Replaces the legacy ScreenHeader chrome with an
 * inline serif "Payment history" header and standardises filter
 * chips to the dark-ink active state used by Invoices and Reports.
 *
 * The per-row card + status helpers live in
 * `components/PaymentHistoryCard.tsx` (untouched).
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { useResponsive } from '../../hooks/useResponsive';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';
import {
  PaymentCard,
  type PaymentRecord,
} from './components/PaymentHistoryCard';

interface Props {
  navigation: NativeStackNavigationProp<
    ProfileStackParamList,
    'PaymentHistory'
  >;
}

const PAGE_SIZE = 20;

type FilterType = 'all' | 'completed' | 'pending' | 'refunded';

const COMPLETED_STATUSES = [
  'completed',
  'succeeded',
  'released',
  'release_pending',
];
const PENDING_STATUSES = ['pending', 'processing', 'held'];

const fmtGBP = (n: number): string =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
      // 2026-05-23 audit: use the explicit FK form
      // `jobs!escrow_transactions_job_id_fkey(...)` instead of the
      // `job:job_id(...)` shortcut so the embed resolves the same
      // way it does in the canonical /api/payments/history route.
      const { data: rows, error: err } = await supabase
        .from('escrow_transactions')
        .select(
          'id, job_id, payer_id, payee_id, amount, status, created_at, updated_at, job:jobs!escrow_transactions_job_id_fkey(title, description)'
        )
        .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (err) throw new Error(err.message);
      const payments = (rows || []).map(
        (r: Record<string, unknown>): PaymentRecord => {
          const job = r.job as Record<string, unknown> | null;
          return {
            id: r.id as string,
            jobId: r.job_id as string,
            jobTitle: (job?.title as string) || 'Payment',
            amount: Number(r.amount ?? 0),
            status: r.status as string,
            createdAt: r.created_at as string,
          };
        }
      );
      return {
        payments,
        nextCursor:
          payments.length >= PAGE_SIZE ? offset + PAGE_SIZE : undefined,
      };
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user?.id,
  });

  const allPayments = data?.pages.flatMap((page) => page.payments) || [];

  const payments =
    filter === 'all'
      ? allPayments
      : allPayments.filter((p) => {
          if (filter === 'completed')
            return COMPLETED_STATUSES.includes(p.status);
          if (filter === 'pending') return PENDING_STATUSES.includes(p.status);
          if (filter === 'refunded') return p.status === 'refunded';
          return true;
        });

  const totalPaid = allPayments
    .filter((p) => COMPLETED_STATUSES.includes(p.status))
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = allPayments
    .filter((p) => PENDING_STATUSES.includes(p.status))
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalRefunded = allPayments
    .filter((p) => p.status === 'refunded')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) return <LoadingSpinner message='Loading payment history…' />;
  if (error)
    return (
      <ErrorView message='Failed to load payment history' onRetry={refetch} />
    );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg} />

      <View style={styles.topNav}>
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
        <Text style={styles.eyebrow}>Payments</Text>
        <Text style={styles.headline}>Payment history</Text>
        <Text style={styles.sub}>
          {allPayments.length} {allPayments.length === 1 ? 'record' : 'records'}
        </Text>
      </View>

      {allPayments.length > 0 && (
        <View style={styles.statsRow}>
          {[
            {
              label: 'Paid',
              value: totalPaid,
              iconBg: me.brandSoft,
              iconColor: me.brand,
              icon: 'checkmark-circle-outline' as const,
            },
            {
              label: 'Pending',
              value: totalPending,
              iconBg: me.warnBg,
              iconColor: me.warnFg,
              icon: 'time-outline' as const,
            },
            {
              label: 'Refunded',
              value: totalRefunded,
              iconBg: me.errBg,
              iconColor: me.errFg,
              icon: 'arrow-undo-outline' as const,
            },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View
                style={[styles.statIconWrap, { backgroundColor: stat.iconBg }]}
              >
                <Ionicons name={stat.icon} size={14} color={stat.iconColor} />
              </View>
              <Text style={styles.statValue}>{fmtGBP(stat.value)}</Text>
              <Text style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.filterRow}>
        {(['all', 'completed', 'pending', 'refunded'] as FilterType[]).map(
          (f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                filter === f && styles.filterChipActive,
              ]}
              onPress={() => setFilter(f)}
              accessibilityRole='button'
              accessibilityState={{ selected: filter === f }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === f && styles.filterChipTextActive,
                ]}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {payments.length === 0 ? (
        <EmptyState
          icon='receipt-outline'
          title='No payments yet'
          subtitle='Your payment transactions will appear here.'
          ctaLabel='Go back'
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
              tintColor={me.brand}
              colors={[me.brand]}
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
                <LoadingSpinner size='small' />
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
    backgroundColor: me.bg,
  },
  topNav: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeader: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  sub: {
    fontSize: 14,
    color: me.ink3,
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
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
    color: me.ink3,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  statValue: {
    fontFamily: me.font.display,
    fontSize: 16,
    color: me.ink,
    letterSpacing: me.displayTracking,
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
    borderRadius: 999,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line2,
  },
  filterChipActive: {
    backgroundColor: me.ink,
    borderColor: me.ink,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
  },
  filterChipTextActive: {
    color: me.onBrand,
  },
});

export default PaymentHistoryScreen;
