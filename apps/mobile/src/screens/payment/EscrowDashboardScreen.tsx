import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
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
import { ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { me } from '../../design-system/mint-editorial';
import {
  getEscrowPresentation,
  groupEscrowRecords,
} from './escrowPresentation';
import { styles } from './escrowDashboardStyles';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EscrowDashboard'>;

interface EscrowRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  job_title: string;
  counterparty_name?: string;
  release_blocked_reason?: string;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);

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
      <Text style={styles.progressLabel}>Pending</Text>
      <Text style={[styles.progressLabel, styles.progressLabelCenter]}>
        Held
      </Text>
      <Text style={[styles.progressLabel, styles.progressLabelCenter]}>
        Approved
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

  const {
    data: records = [],
    isLoading: loading,
    isError: loadError,
    isRefetching: refreshing,
    refetch,
  } = useQuery({
    queryKey: ['escrow-dashboard', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<EscrowRecord[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(
          'id, amount, status, created_at, payer_id, payee_id, job:jobs!escrow_transactions_job_id_fkey(title), homeowner_approval, release_blocked_reason'
        )
        .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: EscrowRecord[] = (data ?? []).map(
        (row: Record<string, unknown>) => {
          return {
            id: row.id as string,
            release_blocked_reason: row.release_blocked_reason as
              | string
              | undefined,
            amount: Number(row.amount),
            status:
              row.status === 'held' && row.homeowner_approval
                ? 'release_pending'
                : (row.status as string),
            created_at: row.created_at as string,
            job_title:
              ((row.job as Record<string, unknown>)?.title as string) ??
              'Untitled job',
          };
        }
      );
      return mapped;
    },
  });
  const handleRefresh = () => {
    void refetch();
  };

  const heldRecords = records.filter((r) =>
    ['held', 'release_pending'].includes(r.status)
  );
  const totalHeld = heldRecords.reduce((sum, r) => sum + r.amount, 0);

  const renderRecord = ({ item }: { item: EscrowRecord }) => {
    const presentation = getEscrowPresentation(item);
    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <Text style={styles.recordTitle} numberOfLines={1}>
            {item.job_title}
          </Text>
          <Text style={styles.recordAmount}>{formatCurrency(item.amount)}</Text>
        </View>
        <Text style={styles.recordMeta}>{presentation.label}</Text>
        <Text style={styles.recordMeta}>{presentation.description}</Text>
        {presentation.group === 'Needs attention' && (
          <TouchableOpacity
            accessibilityRole='button'
            onPress={() => navigation.navigate('HelpCenter')}
          >
            <Text style={styles.recordMeta}>Get payment help →</Text>
          </TouchableOpacity>
        )}
        {presentation.stage !== null && (
          <ProgressBar stage={presentation.stage} />
        )}
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
        ) : loadError ? (
          <ErrorView
            message='Could not load escrow records'
            onRetry={handleRefresh}
          />
        ) : (
          <SectionList
            sections={groupEscrowRecords(records)}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionEyebrow}>
                {section.title} · {section.data.length}
              </Text>
            )}
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
                        ? 'No confirmed funds currently held.'
                        : `${heldRecords.length} ${heldRecords.length === 1 ? 'job' : 'jobs'} · funds held until release checks pass`}
                    </Text>
                  </View>
                  <Ionicons
                    name='lock-closed'
                    size={20}
                    color={me.warnFg}
                    style={styles.heroLockIcon}
                  />
                </View>

                {heldRecords.some(
                  (record) => !!record.release_blocked_reason
                ) && (
                  <Text style={styles.recordMeta}>
                    The held total includes funds awaiting support review. See
                    Needs attention below.
                  </Text>
                )}
                <Text style={styles.sectionEyebrow}>
                  Payment records · {records.length}
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
                    Pending payments are not yet confirmed. Approved work
                    remains held during the cooling-off period and release
                    checks. Released earnings then follow the payout schedule.
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
