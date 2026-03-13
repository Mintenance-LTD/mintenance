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

  const { data: posts, isLoading: postsLoading, error: postsError, refetch: refetchPosts } = useQuery({
    queryKey: ['contractor-posts'],
    queryFn: async () => {
      const res = await mobileApiClient.get<{ posts: Post[] }>('/api/contractor/posts');
      return res.posts || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['contractor-followers'],
    queryFn: async () => {
      const res = await mobileApiClient.get<{ stats: SocialStats }>('/api/contractor/followers');
      return res.stats || { followers: 0, following: 0 };
    },
  });

  if (postsLoading) return <LoadingSpinner />;
  if (postsError) return <ErrorView message="Failed to load social feed" onRetry={refetchPosts} />;

  return (
    <SafeAreaView style={styles.container}>
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
