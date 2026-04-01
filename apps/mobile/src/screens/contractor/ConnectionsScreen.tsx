import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ScreenHeader,
  LoadingSpinner,
  ErrorView,
} from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';

interface Connection {
  id: string;
  name: string;
  trade: string;
  rating: number;
  review_count: number;
  avatar_url?: string;
  is_following: boolean;
}

export const ConnectionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-connections', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: rows, error: err } = await supabase
        .from('contractor_connections')
        .select(
          'id, connected_contractor_id, is_following, profiles:profiles!connected_contractor_id(full_name, trade, rating, review_count, avatar_url)'
        )
        .eq('contractor_id', user.id);
      if (err) throw new Error(err.message);
      return (rows || []).map((r: Record<string, unknown>): Connection => {
        const profile = r.profiles as Record<string, unknown> | null;
        return {
          id: r.id as string,
          name: (profile?.full_name as string) || 'Unknown',
          trade: (profile?.trade as string) || '',
          rating: (profile?.rating as number) || 0,
          review_count: (profile?.review_count as number) || 0,
          avatar_url: profile?.avatar_url as string | undefined,
          is_following: (r.is_following as boolean) ?? true,
        };
      });
    },
    enabled: !!user?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, follow }: { id: string; follow: boolean }) => {
      if (follow) {
        const { error: err } = await supabase
          .from('contractor_connections')
          .update({ is_following: true })
          .eq('id', id);
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await supabase
          .from('contractor_connections')
          .update({ is_following: false })
          .eq('id', id);
        if (err) throw new Error(err.message);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['contractor-connections'] }),
  });

  const connections = data || [];
  const filtered = useMemo(() => {
    if (!search.trim()) return connections;
    const q = search.toLowerCase();
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.trade.toLowerCase().includes(q)
    );
  }, [connections, search]);

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return <ErrorView message='Failed to load connections' onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />
      <ScreenHeader
        title='Connections'
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchWrap}>
        <Ionicons name='search' size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder='Search by name or trade...'
          placeholderTextColor={theme.colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons
              name='close-circle'
              size={18}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
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
            icon='people-outline'
            title='No Connections'
            subtitle='Connect with other contractors in your area.'
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Ionicons
                name='person'
                size={24}
                color={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.trade}>{item.trade}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name='star' size={14} color='#F5A623' />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                <Text style={styles.reviewCount}>({item.review_count})</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.followBtn,
                item.is_following && styles.followingBtn,
              ]}
              onPress={() =>
                toggleMutation.mutate({
                  id: item.id,
                  follow: !item.is_following,
                })
              }
            >
              <Text
                style={[
                  styles.followText,
                  item.is_following && styles.followingText,
                ]}
              >
                {item.is_following ? 'Following' : 'Connect'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginLeft: 8,
    paddingVertical: 0,
  },
  list: { padding: 16, paddingTop: 8 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  trade: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  reviewCount: { fontSize: 12, color: theme.colors.textTertiary },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  followingBtn: { backgroundColor: theme.colors.backgroundTertiary },
  followText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  followingText: { color: theme.colors.textSecondary },
});

export default ConnectionsScreen;
