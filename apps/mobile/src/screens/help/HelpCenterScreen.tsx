/**
 * HelpCenterScreen - Help center with FAQ categories and popular articles
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

interface HelpArticle {
  id: string;
  title: string;
  preview: string;
  category: string;
  content?: string;
}

const FAQ_CATEGORIES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'getting-started', label: 'Getting Started', icon: 'rocket-outline' },
  { key: 'payments', label: 'Payments', icon: 'card-outline' },
  { key: 'jobs', label: 'Jobs', icon: 'construct-outline' },
  { key: 'account', label: 'Account', icon: 'person-outline' },
];

export const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['help-articles'],
    queryFn: async () => {
      const { data: rows, error: err } = await supabase
        .from('help_articles')
        .select('id, title, preview, category, content')
        .eq('published', true)
        .order('view_count', { ascending: false })
        .limit(20);
      if (err) throw new Error(err.message);
      return (rows || []).map((r: Record<string, unknown>): HelpArticle => ({
        id: r.id as string,
        title: (r.title as string) || '',
        preview: (r.preview as string) || '',
        category: (r.category as string) || '',
        content: r.content as string | undefined,
      }));
    },
  });

  const articles = data || [];
  const filtered = search
    ? articles.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()) || a.preview.toLowerCase().includes(search.toLowerCase()))
    : articles;

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView message="Failed to load help articles" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.backgroundSecondary} />
      <ScreenHeader title="Help Centre" showBack onBack={() => navigation.goBack()} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={theme.colors.textPrimary} colors={[theme.colors.textPrimary]} />}
        ListHeaderComponent={
          <>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search articles..."
                placeholderTextColor={theme.colors.textTertiary}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {!search && (
              <>
                <Text style={styles.sectionTitle}>Categories</Text>
                <View style={styles.categoryGrid}>
                  {FAQ_CATEGORIES.map((cat) => (
                    <TouchableOpacity key={cat.key} style={styles.categoryCard} activeOpacity={0.7}>
                      <Ionicons name={cat.icon} size={24} color={theme.colors.textPrimary} />
                      <Text style={styles.categoryLabel}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.sectionTitle}>Popular Articles</Text>
              </>
            )}
          </>
        }
        ListEmptyComponent={<EmptyState icon="help-circle-outline" title="No Articles Found" subtitle="Try a different search term." />}
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          return (
            <TouchableOpacity style={styles.articleCard} activeOpacity={0.7} onPress={() => setExpandedId(isExpanded ? null : item.id)}>
              <View style={styles.articleHeader}>
                <Text style={styles.articleTitle} numberOfLines={isExpanded ? undefined : 1}>{item.title}</Text>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textTertiary} />
              </View>
              <Text style={styles.articlePreview} numberOfLines={isExpanded ? undefined : 2}>
                {isExpanded && item.content ? item.content : item.preview}
              </Text>
              <View style={styles.articleMeta}>
                <Text style={styles.articleCategory}>{item.category}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  list: { padding: 16, paddingBottom: 32 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12,
    paddingHorizontal: 12, marginBottom: 20, height: 44,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.textPrimary, height: 44 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  categoryCard: {
    width: '48%', backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  articleCard: {
    backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  articleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  articleTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary, flex: 1, marginRight: 8 },
  articlePreview: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  articleMeta: { flexDirection: 'row' },
  articleCategory: { fontSize: 11, color: theme.colors.textTertiary, textTransform: 'capitalize' },
});

export default HelpCenterScreen;
