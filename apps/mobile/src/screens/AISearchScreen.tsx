/**
 * AISearchScreen Component
 *
 * Advanced search interface with AI-powered semantic search, filters, and suggestions.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, ErrorView } from '../components/shared';
import { AISearchService, SearchResult, SearchFilters, SearchSuggestion } from '../services/AISearchService';
import { logger } from '../utils/logger';
import { theme } from '../theme';

const RESULT_TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  job: { icon: 'briefcase-outline', color: '#3B82F6', bg: '#DBEAFE' },
  contractor: { icon: 'person-outline', color: theme.colors.primary, bg: theme.colors.primaryLight },
  service: { icon: 'construct-outline', color: '#8B5CF6', bg: '#EDE9FE' },
  default: { icon: 'search-outline', color: theme.colors.textSecondary, bg: theme.colors.backgroundSecondary },
};

export const AISearchScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTrendingSearches();
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      loadSuggestions();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  const loadTrendingSearches = async () => {
    try {
      const trending = await AISearchService.getTrendingSearches(10);
      setTrendingSearches(trending);
    } catch (error) {
      logger.error('Failed to load trending searches', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const suggestionList = await AISearchService.getSearchSuggestions(query, 8);
      setSuggestions(suggestionList);
      setShowSuggestions(true);
    } catch (error) {
      logger.error('Failed to load suggestions', error);
    }
  };

  const performSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const searchResults = await AISearchService.search(searchQuery, filters, 20);
      setResults(searchResults);
    } catch (err) {
      setError('Search failed. Please try again.');
      logger.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch();
    }, 300);
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    performSearch(suggestion.text);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getTypeConfig = (type: SearchResult['type']) => {
    return RESULT_TYPE_CONFIG[type] || RESULT_TYPE_CONFIG.default;
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const config = getTypeConfig(item.type);
    return (
      <TouchableOpacity
        style={styles.resultItem}
        accessibilityRole='button'
        accessibilityLabel={`${item.type}: ${item.title}. ${item.description}. ${Math.round(item.relevanceScore * 100)}% match`}
      >
        <View style={[styles.resultIconWrap, { backgroundColor: config.bg }]}>
          <Ionicons
            name={config.icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={config.color}
          />
        </View>
        <View style={styles.resultDetails}>
          <Text style={styles.resultTitle}>{item.title}</Text>
          <Text style={styles.resultDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.resultMetadata}>
            {item.metadata.location && (
              <View style={styles.metadataItem}>
                <Ionicons name="location-outline" size={13} color={theme.colors.textTertiary} />
                <Text style={styles.metadataText}>{item.metadata.location}</Text>
              </View>
            )}
            {item.metadata.price && (
              <View style={styles.metadataItem}>
                <Ionicons name="cash-outline" size={13} color={theme.colors.textTertiary} />
                <Text style={styles.metadataText}>${item.metadata.price}</Text>
              </View>
            )}
            {item.metadata.rating && (
              <View style={styles.metadataItem}>
                <Ionicons name="star" size={13} color={theme.colors.accent} />
                <Text style={styles.metadataText}>{item.metadata.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.relevanceScore}>
          <Text style={styles.scoreText}>
            {Math.round(item.relevanceScore * 100)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
      accessibilityRole='button'
      accessibilityLabel={`Search suggestion: ${item.text}`}
    >
      <View style={styles.suggestionIconWrap}>
        <Ionicons
          name={item.type === 'query' ? 'search-outline' : item.type === 'category' ? 'grid-outline' : 'location-outline'}
          size={16}
          color={theme.colors.textSecondary}
        />
      </View>
      <Text style={styles.suggestionText}>{item.text}</Text>
      <Ionicons name="arrow-forward" size={16} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );

  const renderTrendingSearch = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      style={styles.trendingItem}
      onPress={() => handleSuggestionPress(item)}
      accessibilityRole='button'
      accessibilityLabel={`Trending search: ${item.text}`}
    >
      <Ionicons name="trending-up" size={14} color={theme.colors.accent} style={{ marginRight: 6 }} />
      <Text style={styles.trendingText}>{item.text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="AI Search" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={theme.colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, contractors, services..."
            placeholderTextColor={theme.colors.textTertiary}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              handleSearch();
            }}
            onSubmitEditing={() => performSearch()}
            returnKeyType="search"
            accessibilityLabel='AI search'
            accessibilityHint='Type to search for jobs, contractors, or services'
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              accessibilityRole='button'
              accessibilityLabel='Clear search'
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
          accessibilityRole='button'
          accessibilityLabel={showFilters ? 'Hide search filters' : 'Show search filters'}
          accessibilityState={{ expanded: showFilters }}
        >
          <Ionicons name="options-outline" size={20} color={showFilters ? theme.colors.textInverse : theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Category</Text>
            <TouchableOpacity style={styles.filterValue}>
              <Text style={styles.filterValueText}>
                {filters.category || 'All Categories'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Location</Text>
            <TouchableOpacity style={styles.filterValue}>
              <Text style={styles.filterValueText}>
                {filters.location || 'Any Location'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={clearFilters}
            accessibilityRole='button'
            accessibilityLabel='Clear all search filters'
          >
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Searching with AI...</Text>
        </View>
      ) : error ? (
        <ErrorView message={error} onRetry={() => performSearch()} />
      ) : showSuggestions && suggestions.length > 0 ? (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Suggestions</Text>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.type}-${index}`}
            renderItem={renderSuggestion}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderSearchResult}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsContainer}
        />
      ) : query.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Trending Searches</Text>
          <FlatList
            data={trendingSearches}
            keyExtractor={(item, index) => `trending-${index}`}
            renderItem={renderTrendingSearch}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.trendingContainer}
          />
        </View>
      ) : (
        <View style={styles.noResultsContainer}>
          <View style={styles.noResultsIconWrap}>
            <Ionicons name="search-outline" size={32} color={theme.colors.textTertiary} accessible={false} />
          </View>
          <Text style={styles.noResultsTitle}>No Results Found</Text>
          <Text style={styles.noResultsSubtitle}>
            Try adjusting your search terms or filters
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filtersContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  filterValue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  filterValueText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  clearFiltersButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
  },
  clearFiltersText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  suggestionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  suggestionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  resultsContainer: {
    padding: 16,
  },
  resultItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
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
  resultIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultDetails: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  resultMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  relevanceScore: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 14,
  },
  trendingContainer: {
    paddingBottom: 24,
    gap: 10,
  },
  trendingItem: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    margin: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  trendingText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noResultsIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
  noResultsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
