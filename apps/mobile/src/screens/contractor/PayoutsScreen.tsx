import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Linking,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { mobileApiClient } from '../../utils/mobileApiClient';

interface Escrow {
  id: string;
  jobTitle: string;
  amount: number;
  status: string;
  createdAt: string;
}

const EMPTY_ESCROWS: Escrow[] = [];

export const PayoutsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const { data: escrows, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-escrows'],
    queryFn: async () => {
      try {
        const res = await mobileApiClient.get<{ success: boolean; data: Escrow[] }>('/api/contractor/escrows');
        return res.data || [];
      } catch {
        return EMPTY_ESCROWS;
      }
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['contractor-stripe-status'],
    queryFn: async () => {
      try {
        const res = await mobileApiClient.get<{ data: { stripe_account_id?: string; stripe_onboarding_complete?: boolean } }>('/api/contractor/profile-data');
        return res.data;
      } catch {
        return null;
      }
    },
  });
  const hasConnectedStripe = !!profile?.stripe_account_id && !!profile?.stripe_onboarding_complete;

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await mobileApiClient.post<{ accountUrl: string; message: string }>('/api/contractor/payout/setup', {});
      return res;
    },
    onSuccess: (data) => {
      if (data.accountUrl) Linking.openURL(data.accountUrl);
    },
  });

  const items = escrows || [];
  const totalReleased = items.filter((e) => e.status === 'released').reduce((sum, e) => sum + e.amount, 0);
  const totalHeld = items.filter((e) => e.status === 'held').reduce((sum, e) => sum + e.amount, 0);

  const getAccentColor = (status: string) => {
    if (status === 'released') return '#10B981';
    if (status === 'held') return '#3B82F6';
    return '#F59E0B';
  };

  const renderItem = ({ item }: { item: Escrow }) => (
    <View style={styles.escrowRow}>
      <View style={[styles.accentBar, { backgroundColor: getAccentColor(item.status) }]} />
      <View style={styles.escrowContent}>
        <View style={styles.escrowInfo}>
          <Text style={styles.escrowTitle} numberOfLines={1}>{item.jobTitle}</Text>
          <Text style={styles.escrowDate}>{new Date(item.createdAt).toLocaleDateString('en-GB')}</Text>
        </View>
        <View style={styles.escrowRight}>
          <Text style={styles.escrowAmount}>{'\u00A3'}{item.amount.toFixed(2)}</Text>
          <Badge
            variant={item.status === 'released' ? 'success' : item.status === 'held' ? 'primary' : 'warning'}
            size="sm"
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Badge>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <>
      {/* Stripe Connect Card */}
      <View style={styles.connectCard}>
        <View style={styles.connectHeader}>
          <View style={[styles.connectIconWrap, { backgroundColor: hasConnectedStripe ? '#D1FAE5' : '#FEF3C7' }]}>
            <Ionicons
              name={hasConnectedStripe ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={hasConnectedStripe ? '#10B981' : '#F59E0B'}
            />
          </View>
          <View style={styles.connectInfo}>
            <Text style={styles.connectTitle}>
              {hasConnectedStripe ? 'Payouts Active' : 'Set Up Payouts'}
            </Text>
            <Text style={styles.connectDesc}>
              {hasConnectedStripe
                ? 'Your Stripe account is connected.'
                : 'Connect your Stripe account to receive payments.'}
            </Text>
          </View>
        </View>
        {!hasConnectedStripe && (
          <Button
            variant="primary"
            fullWidth
            onPress={() => setupMutation.mutate()}
            loading={setupMutation.isPending}
            style={styles.setupBtn}
          >
            Set Up Stripe Account
          </Button>
        )}
      </View>

      {/* Section label */}
      <Text style={styles.historyLabel}>Payout History</Text>
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="cash-outline" size={28} color="#10B981" />
      </View>
      <Text style={styles.emptyTitle}>No Payouts Yet</Text>
      <Text style={styles.emptySubtitle}>Your payout history will appear here</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Green gradient hero */}
      <LinearGradient
        colors={['#064E3B', '#059669', '#10B981']}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}
      >
        {/* Decorative circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.heroTitle}>Payouts</Text>

        {/* Hero stats */}
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{'\u00A3'}{totalReleased.toFixed(0)}</Text>
            <Text style={styles.heroStatLabel}>Released</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{'\u00A3'}{totalHeld.toFixed(0)}</Text>
            <Text style={styles.heroStatLabel}>In Escrow</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading payouts...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="alert-circle-outline" size={28} color="#EF4444" />
          </View>
          <Text style={styles.emptyTitle}>Failed to load</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#10B981" colors={['#10B981']} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  hero: {
    paddingBottom: 28,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 18,
  },
  heroStats: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, padding: 16,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginTop: 2 },
  heroDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  connectCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  connectHeader: { flexDirection: 'row', gap: 14 },
  connectIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  connectInfo: { flex: 1 },
  connectTitle: { fontSize: 16, fontWeight: '700', color: '#222222' },
  connectDesc: { fontSize: 13, color: '#717171', marginTop: 4, lineHeight: 18 },
  setupBtn: { marginTop: 14, borderRadius: 28 },
  historyLabel: {
    fontSize: 12, fontWeight: '700', color: '#B0B0B0', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 10, marginTop: 8,
  },
  list: { padding: 16, paddingBottom: 40 },
  escrowRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 8, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  accentBar: { width: 4 },
  escrowContent: {
    flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14,
  },
  escrowInfo: { flex: 1, marginRight: 12 },
  escrowTitle: { fontSize: 15, fontWeight: '600', color: '#222222' },
  escrowDate: { fontSize: 12, color: '#B0B0B0', marginTop: 2 },
  escrowRight: { alignItems: 'flex-end', gap: 4 },
  escrowAmount: { fontSize: 15, fontWeight: '700', color: '#222222' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#717171' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#D1FAE5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#222222', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#717171', textAlign: 'center' },
  retryText: { fontSize: 14, color: '#10B981', fontWeight: '600', marginTop: 8 },
});

export default PayoutsScreen;
