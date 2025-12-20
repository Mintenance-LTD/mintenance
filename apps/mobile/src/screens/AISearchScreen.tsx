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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../components/shared';
import { AISearchService, SearchResult, SearchFilters, SearchSuggestion } from '../services/AISearchService';
import { logger } from '../utils/logger';

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

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters((prev: SearchFilters) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'job':
        return 'briefcase-outline';
      case 'contractor':
        return 'person-outline';
      case 'service':
        return 'construct-outline';
      default:
        return 'search-outline';
    }
  };

  const getResultTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'job':
        return theme.colors.primary;
      case 'contractor':
        return theme.colors.secondary;
      case 'service':
        return theme.colors.accent;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.resultItem}>
      <View style={styles.resultContent}>
        <View style={styles.resultIcon}>
          <Ionicons
            name={getResultIcon(item.type) as any}
            size={24}
            color={getResultTypeColor(item.type)}
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
                <Ionicons name="location-outline" size={14} color={theme.colors.textTertiary} />
                <Text style={styles.metadataText}>{item.metadata.location}</Text>
              </View>
            )}
            {item.metadata.price && (
              <View style={styles.metadataItem}>
                <Ionicons name="cash-outline" size={14} color={theme.colors.textTertiary} />
                <Text style={styles.metadataText}>${item.metadata.price}</Text>
              </View>
            )}
            {item.metadata.rating && (
              <View style={styles.metadataItem}>
                <Ionicons name="star-outline" size={14} color={theme.colors.textTertiary} />
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
      </View>
    </TouchableOpacity>
  );

  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <Ionicons
        name={item.type === 'query' ? 'search-outline' : item.type === 'category' ? 'grid-outline' : 'location-outline'}
        size={20}
        color={theme.colors.textTertiary}
      />
      <Text style={styles.suggestionText}>{item.text}</Text>
    </TouchableOpacity>
  );

  const renderTrendingSearch = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      style={styles.trendingItem}
      onPress={() => handleSuggestionPress(item)}
    >
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
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options-outline" size={20} color={theme.colors.primary} />
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

          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
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
          <Ionicons name="search-outline" size={64} color={theme.colors.textTertiary} />
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
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
  },
  filterButton: {
    padding: theme.spacing.sm,
  },
  filtersContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  filterLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  filterValue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  filterValueText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
  clearFiltersButton: {
    alignSelf: 'flex-end',
    paddingVertical: theme.spacing.sm,
  },
  clearFiltersText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  suggestionsContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  suggestionsTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  suggestionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.md,
  },
  resultsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  resultItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  resultIcon: {
    marginRight: theme.spacing.md,
  },
  resultDetails: {
    flex: 1,
  },
  resultTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  resultDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  resultMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  metadataText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing.xs,
  },
  relevanceScore: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 20,
  },
  scoreText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.secondary,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  trendingContainer: {
    paddingBottom: theme.spacing.xl,
  },
  trendingItem: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    margin: theme.spacing.xs,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  trendingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  noResultsTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  noResultsSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});