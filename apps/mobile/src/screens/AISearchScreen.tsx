/**
 * AISearchScreen — advanced search with AI-powered semantic results,
 * autocomplete suggestions, filters, and a trending list.
 *
 * Was a 666-line monolith. Split 2026-05-09 (AUDIT_PUNCH_LIST P2 #44e)
 * into shared `ai-search/styles.ts`, `ai-search/typeConfig.ts`, and 6
 * leaf components. Public behaviour preserved.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ErrorView } from '../components/shared';
import {
  AISearchService,
  type SearchResult,
  type SearchFilters,
  type SearchSuggestion,
} from '../services/AISearchService';
import { logger } from '../utils/logger';
import { me } from '../design-system/mint-editorial';

import { styles } from './ai-search/theme/styles';
import { SearchBar } from './ai-search/components/SearchBar';
import { FiltersPanel } from './ai-search/components/FiltersPanel';
import { SearchResultItem } from './ai-search/components/SearchResultItem';
import { SuggestionItem } from './ai-search/components/SuggestionItem';
import { TrendingItem } from './ai-search/components/TrendingItem';
import { NoResults } from './ai-search/components/NoResults';

export const AISearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<SearchSuggestion[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AISearchService.getTrendingSearches(10)
      .then(setTrendingSearches)
      .catch((err) => logger.error('Failed to load trending searches', err));
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    AISearchService.getSearchSuggestions(query, 8)
      .then((next) => {
        setSuggestions(next);
        setShowSuggestions(true);
      })
      .catch((err) => logger.error('Failed to load suggestions', err));
  }, [query]);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);
      setShowSuggestions(false);

      try {
        const searchResults = await AISearchService.search(
          trimmed,
          filters,
          20
        );
        setResults(searchResults);
      } catch (err) {
        setError('Search failed. Please try again.');
        logger.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const handleQueryChange = useCallback(
    (next: string) => {
      setQuery(next);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(next);
      }, 300);
    },
    [performSearch]
  );

  const handleSuggestionPress = useCallback(
    (suggestion: SearchSuggestion) => {
      setQuery(suggestion.text);
      performSearch(suggestion.text);
    },
    [performSearch]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
      </View>

      <View style={styles.screenHeader}>
        <Text style={styles.eyebrow}>Search</Text>
        <Text style={styles.headline}>Find anything</Text>
        <Text style={styles.sub}>
          Contractors, jobs, services, properties — search across Mint.
        </Text>
      </View>

      <SearchBar
        query={query}
        onChangeQuery={handleQueryChange}
        onSubmit={() => performSearch(query)}
        onClear={() => setQuery('')}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((prev) => !prev)}
      />

      {showFilters && (
        <FiltersPanel filters={filters} onClear={() => setFilters({})} />
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={me.brand} />
          <Text style={styles.loadingText}>Searching with AI…</Text>
        </View>
      ) : error ? (
        <ErrorView message={error} onRetry={() => performSearch(query)} />
      ) : showSuggestions && suggestions.length > 0 ? (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Suggestions</Text>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.type}-${index}`}
            renderItem={({ item }) => (
              <SuggestionItem
                suggestion={item}
                onPress={handleSuggestionPress}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={({ item }) => <SearchResultItem result={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsContainer}
        />
      ) : query.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Trending searches</Text>
          <FlatList
            data={trendingSearches}
            keyExtractor={(_item, index) => `trending-${index}`}
            renderItem={({ item }) => (
              <TrendingItem trending={item} onPress={handleSuggestionPress} />
            )}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.trendingContainer}
          />
        </View>
      ) : (
        <NoResults />
      )}
    </SafeAreaView>
  );
};
