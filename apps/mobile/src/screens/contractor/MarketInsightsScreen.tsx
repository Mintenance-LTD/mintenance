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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  ScreenHeader,
  LoadingSpinner,
  ErrorView,
} from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';

interface DemandCategory {
  id: string;
  category: string;
  demand_level: 'high' | 'medium' | 'low';
  avg_price: number;
  job_count: number;
  competition_count: number;
}

const DEMAND_COLORS = {
  high: me.brand2,
  medium: '#D97706',
  low: me.ink3,
};
const DEMAND_LABELS = { high: 'High Demand', medium: 'Medium', low: 'Low' };

export const MarketInsightsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  // 2026-05-23 audit: the screen used to read from a `market_insights`
  // table that doesn't exist on live. The canonical source is the
  // /api/contractor/market-insights endpoint which derives the same
  // shape from real jobs + contractor_profiles.specializations — the
  // server already returns the exact { categories: DemandCategory[] }
  // payload this screen needs, so the swap is a 1:1 replacement.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-market-insights', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as DemandCategory[];
      const response = (await mobileApiClient.get(
        '/api/contractor/market-insights'
      )) as { categories?: DemandCategory[] } | null;
      return response?.categories ?? [];
    },
    enabled: !!user?.id,
  });

  const categories = data || [];

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return (
      <ErrorView message='Failed to load market insights' onRetry={refetch} />
    );

  const totalJobs = categories.reduce((sum, c) => sum + c.job_count, 0);
  const totalCompetitors = categories.reduce(
    (sum, c) => sum + c.competition_count,
    0
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg2} />
      <ScreenHeader
        title='Market Insights'
        showBack
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={categories}
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
            icon='analytics-outline'
            title='No Insights Yet'
            subtitle='Market data will appear as activity grows in your area.'
          />
        }
        ListHeaderComponent={
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{totalJobs}</Text>
              <Text style={styles.summaryLabel}>Local Jobs</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{totalCompetitors}</Text>
              <Text style={styles.summaryLabel}>Competitors</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{categories.length}</Text>
              <Text style={styles.summaryLabel}>Categories</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.categoryName}>{item.category}</Text>
              <View
                style={[
                  styles.demandBadge,
                  { backgroundColor: `${DEMAND_COLORS[item.demand_level]}18` },
                ]}
              >
                <View
                  style={[
                    styles.demandDot,
                    { backgroundColor: DEMAND_COLORS[item.demand_level] },
                  ]}
                />
                <Text
                  style={[
                    styles.demandText,
                    { color: DEMAND_COLORS[item.demand_level] },
                  ]}
                >
                  {DEMAND_LABELS[item.demand_level]}
                </Text>
              </View>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Ionicons name='cash-outline' size={16} color={me.ink2} />
                <Text style={styles.metricLabel}>Avg Price</Text>
                <Text style={styles.metricValue}>
                  {'\u00A3'}
                  {item.avg_price.toLocaleString('en-GB')}
                </Text>
              </View>
              <View style={styles.metric}>
                <Ionicons name='briefcase-outline' size={16} color={me.ink2} />
                <Text style={styles.metricLabel}>Jobs</Text>
                <Text style={styles.metricValue}>{item.job_count}</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons name='people-outline' size={16} color={me.ink2} />
                <Text style={styles.metricLabel}>Competitors</Text>
                <Text style={styles.metricValue}>{item.competition_count}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  list: { padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    ...me.shadow.card,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: me.ink,
  },
  summaryLabel: {
    fontSize: 11,
    color: me.ink2,
    marginTop: 2,
  },
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    ...me.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    flex: 1,
  },
  demandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  demandDot: { width: 8, height: 8, borderRadius: 4 },
  demandText: { fontSize: 12, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center', flex: 1 },
  metricLabel: {
    fontSize: 11,
    color: me.ink2,
    marginTop: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
    marginTop: 2,
  },
});
