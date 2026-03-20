/**
 * DiscoverScreen - Discover contractors by category
 * @filesize Target: <200 lines
 */
import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform, RefreshControl, TextInput, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { theme } from '../../theme';

interface DiscoverContractor {
  id: string;
  name: string;
  trade: string;
  rating: number;
  review_count: number;
  distance_km: number;
  profile_image_url?: string;
}

const CATEGORIES = ['All', 'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Roofing', 'Cleaning', 'HVAC'];

export const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['discover-contractors', selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('contractor_profiles')
        .select('id, full_name, trade, rating, review_count, distance_km, profile_image_url')
        .order('rating', { ascending: false });
      if (selectedCategory !== 'All') {
        query = query.ilike('trade', `%${selectedCategory.toLowerCase()}%`);
      }
      const { data: rows, error: err } = await query;
      if (err) throw new Error(err.message);
      return (rows || []).map((r: Record<string, unknown>): DiscoverContractor => ({
        id: r.id as string,
        name: (r.full_name as string) || '',
        trade: (r.trade as string) || '',
        rating: (r.rating as number) || 0,
        review_count: (r.review_count as number) || 0,
        distance_km: (r.distance_km as number) || 0,
        profile_image_url: r.profile_image_url as string | undefined,
      }));
    },
  });

  const contractors = data || [];

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView message="Failed to load contractors" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.backgroundSecondary} />
      <ScreenHeader title="Discover" showBack onBack={() => navigation.goBack()} />

      <FlatList
        data={contractors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={theme.colors.textPrimary} colors={[theme.colors.textPrimary]} />}
        ListHeaderComponent={
          <FlatList
            horizontal
            data={CATEGORIES}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            renderItem={({ item: cat }) => (
              <TouchableOpacity
                style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            )}
          />
        }
        ListEmptyComponent={
          <EmptyState icon="search-outline" title="No Contractors Found" subtitle="Try selecting a different category." />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatarWrap}>
                <Ionicons name="person-circle-outline" size={52} color="#D1D5DB" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.trade}>{item.trade}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.ratingWrap}>
                    <Ionicons name="star" size={14} color={theme.colors.accent} />
                    <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                    <Text style={styles.reviewCount}>({item.review_count})</Text>
                  </View>
                  <View style={styles.distanceWrap}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.textTertiary} />
                    <Text style={styles.distanceText}>{item.distance_km.toFixed(1)} km</Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewBtn}
              activeOpacity={0.7}
              onPress={() => (navigation as { navigate: (screen: string, params: Record<string, string>) => void }).navigate('ContractorProfile', { id: item.id })}
            >
              <Text style={styles.viewBtnText}>View Profile</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.textInverse} />
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
  chipRow: { paddingBottom: 16, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.textInverse },
  card: {
    backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarWrap: { marginRight: 12 },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  trade: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 16 },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  reviewCount: { fontSize: 12, color: theme.colors.textTertiary },
  distanceWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  distanceText: { fontSize: 12, color: theme.colors.textTertiary },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 10,
  },
  viewBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textInverse },
});

export default DiscoverScreen;
