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
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  image_url?: string;
}

interface SocialStats {
  followers: number;
  following: number;
}

export const SocialScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const { data: posts, isLoading: postsLoading, error: postsError, refetch: refetchPosts } = useQuery({
    queryKey: ['contractor-posts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: rows, error: err } = await supabase
        .from('contractor_posts')
        .select('*')
        .eq('contractor_id', user.id)
        .order('created_at', { ascending: false });
      if (err) throw new Error(err.message);
      return (rows || []).map((p: Record<string, unknown>): Post => ({
        id: p.id as string,
        title: p.title as string || '',
        content: p.content as string || '',
        created_at: p.created_at as string,
        likes_count: (p.likes_count as number) || 0,
        comments_count: (p.comments_count as number) || 0,
        image_url: p.image_url as string | undefined,
      }));
    },
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ['contractor-followers', user?.id],
    queryFn: async () => {
      if (!user?.id) return { followers: 0, following: 0 };
      const { data: row, error: err } = await supabase
        .from('contractor_profiles')
        .select('followers_count, following_count')
        .eq('user_id', user.id)
        .single();
      if (err) return { followers: 0, following: 0 };
      return {
        followers: (row?.followers_count as number) || 0,
        following: (row?.following_count as number) || 0,
      } as SocialStats;
    },
    enabled: !!user?.id,
  });

  if (postsLoading) return <LoadingSpinner />;
  if (postsError) return <ErrorView message="Failed to load social feed" onRetry={refetchPosts} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
      <ScreenHeader title="Social" showBack onBack={() => navigation.goBack()} />

      <FlatList
        data={posts || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetchPosts} tintColor="#222222" colors={['#222222']} />}
        ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="No Posts Yet" subtitle="Share your work and connect with the community." />}
        ListHeaderComponent={
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.followers ?? 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.following ?? 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>
            <View style={styles.postFooter}>
              <Text style={styles.postDate}>{new Date(item.created_at).toLocaleDateString('en-GB')}</Text>
              <View style={styles.engagementRow}>
                <View style={styles.engagementItem}>
                  <Ionicons name="heart-outline" size={16} color="#717171" />
                  <Text style={styles.engagementText}>{item.likes_count}</Text>
                </View>
                <View style={styles.engagementItem}>
                  <Ionicons name="chatbubble-outline" size={15} color="#717171" />
                  <Text style={styles.engagementText}>{item.comments_count}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost' as never)}
        accessibilityLabel="Create post"
      >
        <Ionicons name="create" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  list: { padding: 16, paddingBottom: 80 },
  statsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20, flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#222222' },
  statLabel: { fontSize: 13, color: '#717171', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#F0F0F0' },
  postCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  postTitle: { fontSize: 16, fontWeight: '700', color: '#222222', marginBottom: 6 },
  postContent: { fontSize: 14, color: '#717171', lineHeight: 20, marginBottom: 12 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 10 },
  postDate: { fontSize: 12, color: '#B0B0B0' },
  engagementRow: { flexDirection: 'row', gap: 14 },
  engagementItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  engagementText: { fontSize: 13, color: '#717171' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
});

export default SocialScreen;
