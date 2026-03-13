import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { mobileApiClient } from '../../utils/mobileApiClient';

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
    return { label: 'Pending', bg: '#FEF3C7', color: '#D97706' };
  }
  return { label: 'Active', bg: '#D1FAE5', color: '#059669' };
};

const formatCurrency = (amount: number) =>
  `\u00A3${amount.toLocaleString('en-GB')}`;

export const InsuranceScreen: React.FC = () => {
  const navigation = useNavigation();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-insurance'],
    queryFn: async () => {
      const res = await mobileApiClient.get<{ policies: InsurancePolicy[] }>('/api/contractor/insurance');
      return res.policies || [];
    },
  });

  const policies = data || [];

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView message="Failed to load insurance" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Insurance" showBack onBack={() => navigation.goBack()} />

      <FlatList
        data={policies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#222222" colors={['#222222']} />}
        ListEmptyComponent={<EmptyState icon="shield-outline" title="No Insurance" subtitle="Add your insurance policies to build trust with clients." />}
        renderItem={({ item }) => {
          const status = getStatusConfig(item.status, item.expiry_date);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Ionicons name="shield-checkmark" size={22} color="#222222" />
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.policyType}>{item.type}</Text>
                  <Text style={styles.provider}>{item.provider}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>

              <View style={styles.coverageRow}>
                <View style={styles.coverageItem}>
                  <Text style={styles.coverageLabel}>Public Liability</Text>
                  <Text style={styles.coverageValue}>{formatCurrency(item.public_liability)}</Text>
                </View>
                <View style={styles.coverageItem}>
                  <Text style={styles.coverageLabel}>Professional Indemnity</Text>
                  <Text style={styles.coverageValue}>{formatCurrency(item.professional_indemnity)}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Policy: {item.policy_number}</Text>
                <Text style={styles.metaText}>Expires: {new Date(item.expiry_date).toLocaleDateString('en-GB')}</Text>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddInsurance' as never)}
        accessibilityLabel="Upload insurance document"
      >
        <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  list: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerInfo: { flex: 1 },
  policyType: { fontSize: 16, fontWeight: '700', color: '#222222' },
  provider: { fontSize: 13, color: '#717171', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  coverageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  coverageItem: { flex: 1 },
  coverageLabel: { fontSize: 12, color: '#717171', marginBottom: 2 },
  coverageValue: { fontSize: 15, fontWeight: '600', color: '#222222' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 12, color: '#B0B0B0' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#222222', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
});

export default InsuranceScreen;
