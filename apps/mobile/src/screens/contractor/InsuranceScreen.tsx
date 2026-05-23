import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileNavigation } from '../../navigation/hooks';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  ScreenHeader,
  LoadingSpinner,
  ErrorView,
} from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';

interface InsurancePolicy {
  id: string;
  type: string;
  provider: string;
  policy_number: string;
  // 2026-05-23 audit: dropped `public_liability` + `professional_indemnity`
  // fields — those columns don't exist on live `contractor_insurance`.
  // The query was succeeding, but the missing fields mapped to 0 so the
  // card rendered "£0" coverage for every active policy. Live schema
  // carries a single `coverage_amount` (and a `type` column to
  // disambiguate "general_liability" vs "professional_indemnity" vs
  // "public_liability" via the policy type itself).
  coverage_amount: number;
  expiry_date: string;
  status: 'active' | 'expired' | 'pending';
  document_url?: string;
}

const getStatusConfig = (status: string, expiryDate: string) => {
  const isExpired = new Date(expiryDate) < new Date();
  if (isExpired || status === 'expired') {
    return { label: 'Expired', bg: me.errBg, color: me.errFg };
  }
  if (status === 'pending') {
    return { label: 'Pending', bg: me.warnBg, color: me.warnFg };
  }
  return {
    label: 'Active',
    bg: me.brandSoft,
    color: me.brand2,
  };
};

const formatCurrency = (amount: number) =>
  `\u00A3${amount.toLocaleString('en-GB')}`;

export const InsuranceScreen: React.FC = () => {
  const navigation = useProfileNavigation();
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-insurance', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: rows, error: err } = await supabase
        .from('contractor_insurance')
        .select('*')
        .eq('contractor_id', user.id)
        .order('expiry_date', { ascending: false });
      if (err) throw new Error(err.message);
      return (rows || []).map(
        (p: Record<string, unknown>): InsurancePolicy => ({
          id: p.id as string,
          type: (p.type as string) || '',
          provider: (p.provider as string) || '',
          policy_number: (p.policy_number as string) || '',
          coverage_amount: Number(p.coverage_amount ?? 0),
          expiry_date: p.expiry_date as string,
          status: (p.status as InsurancePolicy['status']) || 'pending',
          document_url: p.document_url as string | undefined,
        })
      );
    },
    enabled: !!user?.id,
  });

  const policies = data || [];

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return <ErrorView message='Failed to load insurance' onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg2} />
      <ScreenHeader
        title='Insurance'
        showBack
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={policies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={me.ink}
            colors={[me.ink]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon='shield-outline'
            title='No Insurance'
            subtitle='Add your insurance policies to build trust with clients.'
          />
        }
        renderItem={({ item }) => {
          const status = getStatusConfig(item.status, item.expiry_date);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Ionicons name='shield-checkmark' size={22} color={me.ink} />
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.policyType}>{item.type}</Text>
                  <Text style={styles.provider}>{item.provider}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.badgeText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </View>

              {/* 2026-05-23 audit: one coverage figure per policy on live —
                  the `type` column disambiguates which kind of cover this
                  is (general_liability / professional_indemnity / etc.)
                  rather than splitting across two parallel columns the
                  table doesn't have. */}
              <View style={styles.coverageRow}>
                <View style={styles.coverageItem}>
                  <Text style={styles.coverageLabel}>Coverage</Text>
                  <Text style={styles.coverageValue}>
                    {item.coverage_amount > 0
                      ? formatCurrency(item.coverage_amount)
                      : '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  Policy: {item.policy_number}
                </Text>
                <Text style={styles.metaText}>
                  Expires:{' '}
                  {new Date(item.expiry_date).toLocaleDateString('en-GB')}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('BusinessProfile')}
        accessibilityLabel='Add insurance details'
      >
        <Ionicons name='add' size={26} color={me.onBrand} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  list: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...me.shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: me.bg3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: { flex: 1 },
  policyType: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
  },
  provider: { fontSize: 13, color: me.ink2, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  coverageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: me.line2,
  },
  coverageItem: { flex: 1 },
  coverageLabel: {
    fontSize: 12,
    color: me.ink2,
    marginBottom: 2,
  },
  coverageValue: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 12, color: me.ink3 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: me.ink,
    justifyContent: 'center',
    alignItems: 'center',
    ...me.shadow.pop,
  },
});
