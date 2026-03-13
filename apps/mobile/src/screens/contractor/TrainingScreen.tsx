/**
 * TrainingScreen - Contractor training resources and modules
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
import { useAuth } from '../../contexts/AuthContext';

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: string;
  completed: boolean;
  duration_minutes: number;
  url?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  safety: '#EF4444',
  skills: '#3B82F6',
  compliance: '#F59E0B',
  business: '#10B981',
};

export const TrainingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-training', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: rows, error: err } = await supabase
        .from('training_modules')
        .select('*')
        .order('title', { ascending: true });
      if (err) throw new Error(err.message);
      return (rows || []).map((m: Record<string, unknown>): TrainingModule => ({
        id: m.id as string,
        title: m.title as string || '',
        description: m.description as string || '',
        category: m.category as string || 'general',
        completed: (m.completed as boolean) ?? false,
        duration_minutes: (m.duration_minutes as number) || 0,
        url: m.url as string | undefined,
      }));
    },
    enabled: !!user?.id,
  });

  const modules = data || [];
  const filtered = selectedCategory
    ? modules.filter((m) => m.category === selectedCategory)
    : modules;
  const categories = [...new Set(modules.map((m) => m.category))];

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView message="Failed to load training modules" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
      <ScreenHeader title="Training" showBack onBack={() => navigation.goBack()} />

      {categories.length > 0 && (
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, !selectedCategory && styles.chipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#222222" colors={['#222222']} />}
        ListEmptyComponent={<EmptyState icon="school-outline" title="No Training Modules" subtitle="Check back later for new content." />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              </View>
              {item.completed && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </View>
              )}
            </View>
            <View style={styles.cardFooter}>
              <View style={[styles.categoryTag, { backgroundColor: (CATEGORY_COLORS[item.category] || '#717171') + '18' }]}>
                <Text style={[styles.categoryText, { color: CATEGORY_COLORS[item.category] || '#717171' }]}>
                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                </Text>
              </View>
              <View style={styles.duration}>
                <Ionicons name="time-outline" size={14} color="#B0B0B0" />
                <Text style={styles.durationText}>{item.duration_minutes} min</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  list: { padding: 16, paddingBottom: 32 },
  chipRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0' },
  chipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#717171' },
  chipTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardInfo: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#222222' },
  cardDesc: { fontSize: 13, color: '#717171', marginTop: 4, lineHeight: 18 },
  checkBadge: { marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durationText: { fontSize: 12, color: '#B0B0B0' },
});

export default TrainingScreen;
