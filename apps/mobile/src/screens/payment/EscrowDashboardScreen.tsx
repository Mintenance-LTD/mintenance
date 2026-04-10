import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { EmptyState } from '../../components/ui/EmptyState';
import { logger } from '../../utils/logger';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EscrowDashboard'>;

interface EscrowRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  job_title: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  held: { bg: '#FEF3C7', text: '#D97706' },
  release_pending: { bg: '#DBEAFE', text: '#2563EB' },
  released: { bg: '#D1FAE5', text: '#059669' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const EscrowDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [records, setRecords] = useState<EscrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEscrowData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('id, amount, status, created_at, job:job_id(title)')
        .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: EscrowRecord[] = (data ?? []).map(
        (row: Record<string, unknown>) => ({
          id: row.id as string,
          amount: row.amount as number,
          status: row.status as string,
          created_at: row.created_at as string,
          job_title:
            ((row.job as Record<string, unknown>)?.title as string) ??
            'Untitled Job',
        })
      );
      setRecords(mapped);
    } catch (error) {
      logger.error('Failed to fetch escrow data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEscrowData();
  }, [fetchEscrowData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEscrowData();
  }, [fetchEscrowData]);

  const totalHeld = records
    .filter((r) => r.status === 'held')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalPending = records
    .filter((r) => r.status === 'release_pending')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalReleased = records
    .filter((r) => r.status === 'released')
    .reduce((sum, r) => sum + r.amount, 0);

  const SummaryCard: React.FC<{
    label: string;
    amount: number;
    color: string;
    icon: string;
  }> = ({ label, amount, color, icon }) => (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <View style={[styles.summaryIconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={color}
        />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryAmount, { color }]}>
        {formatCurrency(amount)}
      </Text>
    </View>
  );

  const renderRecord = ({ item }: { item: EscrowRecord }) => {
    const statusStyle = STATUS_COLORS[item.status] ??
      STATUS_COLORS.held ?? { bg: '#F3F4F6', text: '#6B7280' };
    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <Text style={styles.recordTitle} numberOfLines={1}>
            {item.job_title}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
          >
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
              {formatStatus(item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.recordFooter}>
          <Text style={styles.recordAmount}>{formatCurrency(item.amount)}</Text>
          <Text style={styles.recordDate}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
            accessibilityLabel='Go back'
            style={styles.headerBackBtn}
          >
            <Ionicons
              name='arrow-back'
              size={24}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerOverline}>FINANCIAL OVERVIEW</Text>
            <Text style={styles.headerBarTitle}>Escrow Dashboard</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color={theme.colors.primary} />
          </View>
        ) : records.length === 0 ? (
          <EmptyState
            icon='wallet-outline'
            title='No Escrow Records'
            subtitle='Escrow transactions will appear here once payments are made.'
            style={styles.emptyState}
          />
        ) : (
          <FlatList
            data={records}
            renderItem={renderRecord}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
            ListHeaderComponent={
              <View style={styles.summaryRow}>
                <SummaryCard
                  label='Held'
                  amount={totalHeld}
                  color='#D97706'
                  icon='lock-closed-outline'
                />
                <SummaryCard
                  label='Pending'
                  amount={totalPending}
                  color='#2563EB'
                  icon='time-outline'
                />
                <SummaryCard
                  label='Released'
                  amount={totalReleased}
                  color='#059669'
                  icon='checkmark-circle-outline'
                />
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerBackBtn: {
    padding: 8,
  },
  headerTitleGroup: {
    flex: 1,
    alignItems: 'center',
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  recordCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  recordDate: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
});

export { EscrowDashboardScreen };
