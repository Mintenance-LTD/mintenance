import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';
import { mobileApiClient } from '../../utils/mobileApiClient';

interface Escrow {
  id: string;
  jobTitle: string;
  amount: number;
  status: string;
  createdAt: string;
}

export const PayoutsScreen: React.FC = () => {
  const navigation = useNavigation();

  // No /api/contractor/payout/status route exists — infer from escrow data
  // If contractor has released escrows, they have a connected Stripe account
  const { data: escrows, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-escrows'],
    queryFn: async () => {
      const res = await mobileApiClient.get<{ success: boolean; data: Escrow[] }>('/api/contractor/escrows');
      return res.data || [];
    },
  });

  const hasConnectedStripe = (escrows || []).some((e) => e.status === 'released');

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await mobileApiClient.post<{ accountUrl: string; message: string }>('/api/contractor/payout/setup', {});
      return res;
    },
    onSuccess: (data) => {
      if (data.accountUrl) {
        Linking.openURL(data.accountUrl);
      }
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView onRetry={refetch} />;

  const totalReleased = (escrows || [])
    .filter((e) => e.status === 'released')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalHeld = (escrows || [])
    .filter((e) => e.status === 'held')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Payouts" showBack onBack={() => navigation.goBack()} />

      {/* Stripe Connect Status */}
      <Card variant="elevated" padding="md" style={styles.connectCard}>
        <View style={styles.connectHeader}>
          <Ionicons
            name={hasConnectedStripe ? 'checkmark-circle' : 'alert-circle'}
            size={24}
            color={hasConnectedStripe ? theme.colors.success : '#F59E0B'}
          />
          <View style={styles.connectInfo}>
            <Text style={styles.connectTitle}>
              {hasConnectedStripe ? 'Payouts Active' : 'Set Up Payouts'}
            </Text>
            <Text style={styles.connectDesc}>
              {hasConnectedStripe
                ? 'Your Stripe account is connected. Earnings will be deposited automatically.'
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
      </Card>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Released</Text>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>{'\u00A3'}{totalReleased.toFixed(2)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>In Escrow</Text>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{'\u00A3'}{totalHeld.toFixed(2)}</Text>
        </View>
      </View>

      {/* Escrow History */}
      <FlatList
        data={escrows || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListEmptyComponent={<EmptyState icon="cash-outline" title="No Payouts" subtitle="Your payout history will appear here." />}
        renderItem={({ item }) => (
          <View style={styles.escrowRow}>
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
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  connectCard: { marginHorizontal: 16, marginTop: 12 },
  connectHeader: { flexDirection: 'row', gap: 12 },
  connectInfo: { flex: 1 },
  connectTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  connectDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  setupBtn: { marginTop: 12 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  statCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, alignItems: 'center', ...theme.shadows.sm },
  statLabel: { fontSize: 11, color: theme.colors.textTertiary, fontWeight: '500', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 40 },
  escrowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, marginBottom: 8, ...theme.shadows.sm },
  escrowInfo: { flex: 1, marginRight: 12 },
  escrowTitle: { fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary },
  escrowDate: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  escrowRight: { alignItems: 'flex-end', gap: 4 },
  escrowAmount: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
});

export default PayoutsScreen;
