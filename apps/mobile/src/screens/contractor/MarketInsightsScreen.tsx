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
import { useNavigation } from '@react-navigation/native';
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

interface DemandCategory {
  id: string;
  category: string;
  demand_level: 'high' | 'medium' | 'low';
  avg_price: number;
  job_count: number;
  competition_count: number;
}

const DEMAND_COLORS = {
  high: theme.colors.primaryDark,
  medium: '#D97706',
  low: theme.colors.textTertiary,
};
const DEMAND_LABELS = { high: 'High Demand', medium: 'Medium', low: 'Low' };

export const MarketInsightsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-market-insights', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: rows, error: err } = await supabase
        .from('market_insights')
        .select('*')
        .order('job_count', { ascending: false });
      if (err) throw new Error(err.message);
      return (rows || []).map(
        (c: Record<string, unknown>): DemandCategory => ({
          id: c.id as string,
          category: (c.category as string) || '',
          demand_level:
            (c.demand_level as DemandCategory['demand_level']) || 'low',
          avg_price: (c.avg_price as number) || 0,
          job_count: (c.job_count as number) || 0,
          competition_count: (c.competition_count as number) || 0,
        })
      );
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
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />
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
            tintColor={theme.colors.textPrimary}
            colors={[theme.colors.textPrimary]}
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
                <Ionicons
                  name='cash-outline'
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.metricLabel}>Avg Price</Text>
                <Text style={styles.metricValue}>
                  {'\u00A3'}
                  {item.avg_price.toLocaleString('en-GB')}
                </Text>
              </View>
              <View style={styles.metric}>
                <Ionicons
                  name='briefcase-outline'
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.metricLabel}>Jobs</Text>
                <Text style={styles.metricValue}>{item.job_count}</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons
                  name='people-outline'
                  size={16}
                  color={theme.colors.textSecondary}
                />
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
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  list: { padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
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
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
});
