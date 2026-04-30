import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
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
import { theme } from '../../theme';

interface InsurancePolicy {
  id: string;
  type: string;
  provider: string;
  policy_number: string;
  coverage_amount: number;
  expiry_date: string;
  status: 'active' | 'expired' | 'pending';
  public_liability: number;
  professional_indemnity: number;
  document_url?: string;
}

const getStatusConfig = (status: string, expiryDate: string) => {
  const isExpired = new Date(expiryDate) < new Date();
  if (isExpired || status === 'expired') {
    return { label: 'Expired', bg: '#FEE2E2', color: '#DC2626' };
  }
  if (status === 'pending') {
    return { label: 'Pending', bg: theme.colors.accentLight, color: '#D97706' };
  }
  return {
    label: 'Active',
    bg: theme.colors.primaryLight,
    color: theme.colors.primaryDark,
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
          coverage_amount: (p.coverage_amount as number) || 0,
          expiry_date: p.expiry_date as string,
          status: (p.status as InsurancePolicy['status']) || 'pending',
          public_liability: (p.public_liability as number) || 0,
          professional_indemnity: (p.professional_indemnity as number) || 0,
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
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />
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
            tintColor={theme.colors.textPrimary}
            colors={[theme.colors.textPrimary]}
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
                  <Ionicons
                    name='shield-checkmark'
                    size={22}
                    color={theme.colors.textPrimary}
                  />
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

              <View style={styles.coverageRow}>
                <View style={styles.coverageItem}>
                  <Text style={styles.coverageLabel}>Public Liability</Text>
                  <Text style={styles.coverageValue}>
                    {formatCurrency(item.public_liability)}
                  </Text>
                </View>
                <View style={styles.coverageItem}>
                  <Text style={styles.coverageLabel}>
                    Professional Indemnity
                  </Text>
                  <Text style={styles.coverageValue}>
                    {formatCurrency(item.professional_indemnity)}
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
        <Ionicons name='add' size={26} color={theme.colors.textInverse} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  list: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: { flex: 1 },
  policyType: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  provider: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  coverageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  coverageItem: { flex: 1 },
  coverageLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  coverageValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 12, color: theme.colors.textTertiary },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
});
