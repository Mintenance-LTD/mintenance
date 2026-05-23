/**
 * EscrowDashboardScreen — Mint Editorial redesign per
 * redesign-v2 contractor business deck screen 13.
 *
 * Replaces the legacy 3-pill summary (Held / Pending / Released)
 * with a single amber held-funds hero plus per-job rows that include
 * a 4-step progress bar (Posted → Working → Sign-off → Released)
 * and a footer note explaining the 7-day auto-release safety net.
 *
 * Bucket maths were corrected on 2026-05-21 (Bug #7) — `pending` and
 * `held` both belong to the "held-in-escrow" pot, `release_pending`
 * means the homeowner-approval window has opened, and `released` /
 * `completed` are the terminal paid state. We retain that intent
 * grouping here so the hero amount matches the per-row tally.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
import { me } from '../../design-system/mint-editorial';
import { styles } from './escrowDashboardStyles';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EscrowDashboard'>;

interface EscrowRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  job_title: string;
  payer_name?: string;
}

/**
 * The canonical escrow lifecycle is
 *   pending → held → release_pending → completed.
 * The deck's progress bar uses the *job* labels Posted → Working →
 * Sign-off → Released. The mapping below stays honest:
 *   - pending → step 0 (posted; Stripe charge in flight)
 *   - held    → step 1 (working; contractor is doing the work)
 *   - release_pending → step 2 (sign-off; homeowner reviewing)
 *   - released / completed → step 3 (released; money out)
 */
const STAGE_BY_STATUS: Record<string, 0 | 1 | 2 | 3> = {
  pending: 0,
  held: 1,
  release_pending: 2,
  released: 3,
  completed: 3,
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);

const heldSinceLabel = (createdIso: string): string => {
  const ms = Date.now() - new Date(createdIso).getTime();
  if (Number.isNaN(ms) || ms < 0) return 'Held since today';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Held since today';
  if (days === 1) return 'Held since yesterday';
  return `Held since ${new Date(createdIso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })}`;
};

const ProgressBar: React.FC<{ stage: 0 | 1 | 2 | 3 }> = ({ stage }) => (
  <>
    <View style={styles.progressTrack}>
      {[0, 1, 2, 3].map((i) => {
        const done = i < stage;
        const active = i === stage && stage !== 3;
        return (
          <View
            key={i}
            style={[
              styles.progressSeg,
              done && styles.progressSegDone,
              active && styles.progressSegActive,
              stage === 3 && styles.progressSegDone,
            ]}
          />
        );
      })}
    </View>
    <View style={styles.progressLabels}>
      <Text style={styles.progressLabel}>Posted</Text>
      <Text style={[styles.progressLabel, styles.progressLabelCenter]}>
        Working
      </Text>
      <Text style={[styles.progressLabel, styles.progressLabelCenter]}>
        Sign-off
      </Text>
      <Text style={[styles.progressLabel, styles.progressLabelEnd]}>
        Released
      </Text>
    </View>
  </>
);

const EscrowDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [records, setRecords] = useState<EscrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEscrowData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 2026-05-23 audit: use explicit FK form for the job embed —
      // matches PaymentHistoryScreen + the homeowner /financials API
      // route. The payer embed was already explicit (profiles!payer_id).
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(
          'id, amount, status, created_at, job:jobs!escrow_transactions_job_id_fkey(title), payer:profiles!payer_id(first_name, last_name)'
        )
        .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: EscrowRecord[] = (data ?? []).map(
        (row: Record<string, unknown>) => {
          const payer = row.payer as {
            first_name?: string;
            last_name?: string;
          } | null;
          const payerName = payer
            ? [payer.first_name, payer.last_name].filter(Boolean).join(' ')
            : '';
          return {
            id: row.id as string,
            amount: row.amount as number,
            status: row.status as string,
            created_at: row.created_at as string,
            job_title:
              ((row.job as Record<string, unknown>)?.title as string) ??
              'Untitled job',
            payer_name: payerName || undefined,
          };
        }
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

  const heldRecords = records.filter((r) =>
    ['pending', 'held'].includes(r.status)
  );
  const totalHeld = heldRecords.reduce((sum, r) => sum + r.amount, 0);

  const renderRecord = ({ item }: { item: EscrowRecord }) => {
    const stage: 0 | 1 | 2 | 3 = STAGE_BY_STATUS[item.status] ?? 1;
    const subline = item.payer_name
      ? `${item.payer_name} · ${heldSinceLabel(item.created_at)}`
      : heldSinceLabel(item.created_at);
    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <Text style={styles.recordTitle} numberOfLines={1}>
            {item.job_title}
          </Text>
          <Text style={styles.recordAmount}>{formatCurrency(item.amount)}</Text>
        </View>
        <Text style={styles.recordMeta}>{subline}</Text>
        <ProgressBar stage={stage} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={[styles.topNav, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
            accessibilityLabel='Go back'
            style={styles.backBtn}
          >
            <Ionicons name='arrow-back' size={20} color={me.ink} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color={me.brand} />
          </View>
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
                tintColor={me.brand}
              />
            }
            ListHeaderComponent={
              <View>
                <View style={styles.screenHeader}>
                  <Text style={styles.eyebrow}>Escrow</Text>
                  <Text style={styles.headline}>Escrow</Text>
                  <Text style={styles.sub}>
                    {user?.role === 'contractor'
                      ? 'Money customers have set aside for you.'
                      : 'Money you have set aside for your contractors.'}
                  </Text>
                </View>
                <View style={styles.heroCard}>
                  <View style={styles.heroBody}>
                    <Text style={styles.heroEyebrow}>Held in escrow</Text>
                    <Text style={styles.heroAmount}>
                      {formatCurrency(totalHeld)}
                    </Text>
                    <Text style={styles.heroSub}>
                      {heldRecords.length === 0
                        ? 'No funds currently held.'
                        : `${heldRecords.length} ${heldRecords.length === 1 ? 'job' : 'jobs'} · awaiting customer sign-off`}
                    </Text>
                  </View>
                  <Ionicons
                    name='lock-closed'
                    size={20}
                    color={me.warnFg}
                    style={styles.heroLockIcon}
                  />
                </View>

                <Text style={styles.sectionEyebrow}>
                  Active escrow · {records.length}
                </Text>
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                icon='wallet-outline'
                title='No escrow records'
                subtitle='Escrow transactions will appear here once payments are made.'
                style={styles.emptyState}
              />
            }
            ListFooterComponent={
              records.length > 0 ? (
                <View style={styles.autoReleaseCard}>
                  <Ionicons
                    name='shield-checkmark-outline'
                    size={16}
                    color={me.brand}
                  />
                  <Text style={styles.autoReleaseText}>
                    Funds release automatically{' '}
                    <Text style={styles.autoReleaseStrong}>
                      7 days after job completion
                    </Text>{' '}
                    if the customer doesn't flag an issue.
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export { EscrowDashboardScreen };
