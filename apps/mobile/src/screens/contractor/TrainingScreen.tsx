/**
 * TrainingScreen - Contractor training resources and modules
 * @filesize Target: <200 lines
 */
import React, { useState } from 'react';
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
  safety: theme.colors.error,
  skills: '#3B82F6',
  compliance: theme.colors.accent,
  business: theme.colors.primary,
};

export const TrainingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-training', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await supabase
          .from('contractor_training')
          .select(
            'id, course_name, provider, completion_date, hours, certificate_url, category, notes'
          )
          .eq('contractor_id', user.id)
          .order('completion_date', { ascending: false });
        if (error) return [];
        return (data || []).map(
          (m: Record<string, unknown>): TrainingModule => ({
            id: (m.id as string) || '',
            title: (m.course_name as string) || '',
            description: (m.provider as string) || (m.notes as string) || '',
            category: (m.category as string) || 'general',
            completed: !!m.completion_date,
            duration_minutes: ((m.hours as number) || 0) * 60,
            url: m.certificate_url as string | undefined,
          })
        );
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
  });

  const modules = data || [];
  const filtered = selectedCategory
    ? modules.filter((m) => m.category === selectedCategory)
    : modules;
  const categories = [...new Set(modules.map((m) => m.category))];

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return (
      <ErrorView message='Failed to load training modules' onRetry={refetch} />
    );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />
      <ScreenHeader
        title='Training'
        showBack
        onBack={() => navigation.goBack()}
      />

      {categories.length > 0 && (
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, !selectedCategory && styles.chipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.chipText,
                !selectedCategory && styles.chipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                selectedCategory === cat && styles.chipActive,
              ]}
              onPress={() =>
                setSelectedCategory(cat === selectedCategory ? null : cat)
              }
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategory === cat && styles.chipTextActive,
                ]}
              >
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
            icon='school-outline'
            title='No Training Modules'
            subtitle='Check back later for new content.'
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
              {item.completed && (
                <View style={styles.checkBadge}>
                  <Ionicons
                    name='checkmark-circle'
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
              )}
            </View>
            <View style={styles.cardFooter}>
              <View
                style={[
                  styles.categoryTag,
                  {
                    backgroundColor:
                      (CATEGORY_COLORS[item.category] ||
                        theme.colors.textSecondary) + '18',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color:
                        CATEGORY_COLORS[item.category] ||
                        theme.colors.textSecondary,
                    },
                  ]}
                >
                  {item.category.charAt(0).toUpperCase() +
                    item.category.slice(1)}
                </Text>
              </View>
              <View style={styles.duration}>
                <Ionicons
                  name='time-outline'
                  size={14}
                  color={theme.colors.textTertiary}
                />
                <Text style={styles.durationText}>
                  {item.duration_minutes} min
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  list: { padding: 16, paddingBottom: 32 },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  chipTextActive: { color: theme.colors.textInverse },
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: { flex: 1, marginRight: 12 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  checkBadge: { marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durationText: { fontSize: 12, color: theme.colors.textTertiary },
});
