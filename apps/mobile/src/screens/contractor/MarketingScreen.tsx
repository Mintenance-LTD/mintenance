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
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';

interface MarketingStats {
  profile_views: number;
  enquiries: number;
  conversion_rate: number;
  views_trend: number;
}

interface MarketingTip {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TIPS: MarketingTip[] = [
  { id: '1', title: 'Complete Your Profile', description: 'Profiles with photos and certifications get 3x more enquiries.', icon: 'person-circle-outline' },
  { id: '2', title: 'Respond Quickly', description: 'Contractors who reply within 1 hour win 60% more jobs.', icon: 'timer-outline' },
  { id: '3', title: 'Add Before & After Photos', description: 'Showcase your best work to attract premium clients.', icon: 'camera-outline' },
  { id: '4', title: 'Collect Reviews', description: 'Ask satisfied clients to leave reviews after each job.', icon: 'star-outline' },
];

export const MarketingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-marketing-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: row, error: err } = await supabase
        .from('contractor_profiles')
        .select('profile_views, enquiries, conversion_rate, views_trend')
        .eq('user_id', user.id)
        .single();
      if (err) return null;
      return {
        profile_views: (row?.profile_views as number) || 0,
        enquiries: (row?.enquiries as number) || 0,
        conversion_rate: (row?.conversion_rate as number) || 0,
        views_trend: (row?.views_trend as number) || 0,
      } as MarketingStats;
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView message="Failed to load marketing data" onRetry={refetch} />;

  const stats = data;
  const statCards = [
    { label: 'Profile Views', value: stats?.profile_views ?? 0, icon: 'eye-outline' as const, trend: stats?.views_trend },
    { label: 'Enquiries', value: stats?.enquiries ?? 0, icon: 'mail-outline' as const },
    { label: 'Conversion Rate', value: `${(stats?.conversion_rate ?? 0).toFixed(1)}%`, icon: 'trending-up-outline' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.backgroundSecondary} />
      <ScreenHeader title="Marketing" showBack onBack={() => navigation.goBack()} />

      <FlatList
        data={TIPS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={theme.colors.textPrimary} colors={[theme.colors.textPrimary]} />}
        ListHeaderComponent={
          <>
            <View style={styles.statsRow}>
              {statCards.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <Ionicons name={s.icon} size={22} color={theme.colors.textPrimary} />
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  {s.trend !== undefined && (
                    <Text style={[styles.trend, { color: s.trend >= 0 ? theme.colors.primaryDark : theme.colors.error }]}>
                      {s.trend >= 0 ? '+' : ''}{s.trend}%
                    </Text>
                  )}
                </View>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Marketing Tips</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name={item.icon} size={22} color={theme.colors.textPrimary} />
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
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  list: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 8 },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'center' },
  trend: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  tipCard: {
    backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  tipIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  tipDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
});

export default MarketingScreen;
