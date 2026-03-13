/**
 * DiscoverScreen - Discover contractors by category
 * @filesize Target: <200 lines
 */
import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { mobileApiClient } from '../../utils/mobileApiClient';

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
      const params = selectedCategory !== 'All' ? `?category=${selectedCategory.toLowerCase()}` : '';
      const res = await mobileApiClient.get<{ contractors: DiscoverContractor[] }>(`/api/discover${params}`);
      return res.contractors || [];
    },
  });

  const contractors = data || [];

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView message="Failed to load contractors" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Discover" showBack onBack={() => navigation.goBack()} />

      <FlatList
        data={contractors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#222222" colors={['#222222']} />}
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
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                    <Text style={styles.reviewCount}>({item.review_count})</Text>
                  </View>
                  <View style={styles.distanceWrap}>
                    <Ionicons name="location-outline" size={14} color="#B0B0B0" />
                    <Text style={styles.distanceText}>{item.distance_km.toFixed(1)} km</Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ContractorProfile' as never, { id: item.id } as never)}
            >
              <Text style={styles.viewBtnText}>View Profile</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  list: { padding: 16, paddingBottom: 32 },
  chipRow: { paddingBottom: 16, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0' },
  chipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#717171' },
  chipTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarWrap: { marginRight: 12 },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#222222' },
  trade: { fontSize: 13, color: '#717171', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 16 },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '600', color: '#222222' },
  reviewCount: { fontSize: 12, color: '#B0B0B0' },
  distanceWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  distanceText: { fontSize: 12, color: '#B0B0B0' },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 10,
  },
  viewBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});

export default DiscoverScreen;
