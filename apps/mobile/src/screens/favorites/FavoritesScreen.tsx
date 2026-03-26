/**
 * FavoritesScreen - Saved/favorite contractors list
 * @filesize Target: <200 lines
 */
import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform, RefreshControl, TextInput, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';

interface FavoriteContractor {
  id: string;
  contractor_id: string;
  name: string;
  trade: string;
  rating: number;
  review_count: number;
  profile_image_url?: string;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <View style={styles.stars}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name={star <= Math.round(rating) ? 'star' : 'star-outline'}
        size={14}
        color={star <= Math.round(rating) ? theme.colors.accent : '#D1D5DB'}
      />
    ))}
    <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
  </View>
);

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('favorite_contractors')
        .select('id, contractor_id, profiles:contractor_id(id, first_name, last_name, trade, rating, review_count, profile_image_url)')
        .eq('user_id', user.id);
      if (error) throw new Error(error.message);
      return (data || []).map((r: Record<string, unknown>): FavoriteContractor => {
        const profile = r.profiles as Record<string, unknown> | null;
        return {
          id: (r.id as string) || '',
          contractor_id: (r.contractor_id as string) || '',
          name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
          trade: (profile?.trade as string) || '',
          rating: (profile?.rating as number) || 0,
          review_count: (profile?.review_count as number) || 0,
          profile_image_url: profile?.profile_image_url as string | undefined,
        };
      });
    },
    enabled: !!user?.id,
  });

  const removeMutation = useMutation({
    mutationFn: async (contractorId: string) => {
      await mobileApiClient.delete(`/api/properties/favorites?property_id=${contractorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const handleRemove = (item: FavoriteContractor) => {
    Alert.alert(
      'Remove Favourite',
      `Remove ${item.name} from your favourites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(item.contractor_id) },
      ],
    );
  };

  const favorites = data || [];

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView message="Failed to load favourites" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.backgroundSecondary} />
      <ScreenHeader title="Favourites" showBack onBack={() => navigation.goBack()} />

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={theme.colors.textPrimary} colors={[theme.colors.textPrimary]} />}
        ListEmptyComponent={
          <EmptyState icon="heart-outline" title="No Favourites Yet" subtitle="Save contractors you like to find them quickly later." />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatarWrap}>
              <Ionicons name="person-circle-outline" size={48} color="#D1D5DB" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.trade}>{item.trade}</Text>
              <StarRating rating={item.rating} />
              <Text style={styles.reviewCount}>{item.review_count} review{item.review_count !== 1 ? 's' : ''}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemove(item)}
              accessibilityLabel={`Remove ${item.name} from favourites`}
            >
              <Ionicons name="heart-dislike-outline" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 16,
    padding: 14, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  avatarWrap: { marginRight: 12 },
  cardContent: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  trade: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  ratingText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  reviewCount: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  removeBtn: { padding: 8 },
});

export default FavoritesScreen;
