import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
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
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { me } from '../../design-system/mint-editorial';

interface MarketingStatsResponse {
  profile: {
    name: string;
    companyName: string | null;
    rating: number;
    skills: string[];
  };
  stats: {
    completedJobs: number;
    totalBids: number;
    acceptedBids: number;
    winRate: number;
    totalEarnings: number;
    totalReviews: number;
    averageRating: number;
    totalMessages: number;
    totalPosts: number;
  };
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
}

interface MarketingTip {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TIPS: MarketingTip[] = [
  {
    id: '1',
    title: 'Complete Your Profile',
    description:
      'Profiles with photos and certifications get 3x more enquiries.',
    icon: 'person-circle-outline',
  },
  {
    id: '2',
    title: 'Respond Quickly',
    description: 'Contractors who reply within 1 hour win 60% more jobs.',
    icon: 'timer-outline',
  },
  {
    id: '3',
    title: 'Add Before & After Photos',
    description: 'Showcase your best work to attract premium clients.',
    icon: 'camera-outline',
  },
  {
    id: '4',
    title: 'Collect Reviews',
    description: 'Ask satisfied clients to leave reviews after each job.',
    icon: 'star-outline',
  },
];

const formatCurrency = (amount: number): string =>
  `\u00A3${amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const MarketingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['contractor-marketing-stats', user?.id],
    queryFn: async () => {
      return await mobileApiClient.get<MarketingStatsResponse>(
        '/api/contractor/marketing-stats'
      );
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error || !data)
    return (
      <ErrorView message='Failed to load marketing data' onRetry={refetch} />
    );

  // 2026-06-06 audit: default recentReviews so a partial response can't
  // crash the render with `undefined.length`.
  const { stats } = data;
  const recentReviews = data.recentReviews ?? [];
  const statCards = [
    {
      label: 'Win Rate',
      value: `${stats.winRate.toFixed(0)}%`,
      icon: 'trophy-outline' as const,
    },
    {
      label: 'Earnings',
      value: formatCurrency(stats.totalEarnings),
      icon: 'cash-outline' as const,
    },
    {
      label: 'Rating',
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—',
      icon: 'star-outline' as const,
    },
    {
      label: 'Jobs Done',
      value: String(stats.completedJobs),
      icon: 'checkmark-done-outline' as const,
    },
    {
      label: 'Bids Won',
      value: `${stats.acceptedBids}/${stats.totalBids}`,
      icon: 'trending-up-outline' as const,
    },
    {
      label: 'Reviews',
      value: String(stats.totalReviews),
      icon: 'chatbox-outline' as const,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg2} />
      <ScreenHeader
        title='Marketing'
        showBack
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={TIPS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={me.ink}
            colors={[me.ink]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.statsGrid}>
              {statCards.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <Ionicons name={s.icon} size={20} color={me.ink} />
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {recentReviews.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Recent Reviews</Text>
                {recentReviews.slice(0, 3).map((r) => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons
                          key={i}
                          name={i <= r.rating ? 'star' : 'star-outline'}
                          size={14}
                          color={me.warnFg}
                        />
                      ))}
                    </View>
                    {r.comment && (
                      <Text style={styles.reviewComment} numberOfLines={2}>
                        {r.comment}
                      </Text>
                    )}
                  </View>
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>Marketing Tips</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name={item.icon} size={22} color={me.ink} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{item.title}</Text>
              <Text style={styles.tipDesc}>{item.description}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  list: { padding: 16, paddingBottom: 32 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: me.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'flex-start',
    ...me.shadow.card,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
    marginTop: 6,
  },
  statLabel: { fontSize: 11, color: me.ink2, marginTop: 2 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
    marginTop: 8,
    marginBottom: 10,
  },
  reviewCard: {
    backgroundColor: me.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  reviewHeader: { flexDirection: 'row', gap: 2, marginBottom: 6 },
  reviewComment: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: me.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: { flex: 1 },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 2,
  },
  tipDesc: { fontSize: 12, color: me.ink2, lineHeight: 17 },
});
