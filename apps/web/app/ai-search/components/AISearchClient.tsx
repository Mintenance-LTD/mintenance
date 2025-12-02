'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import Logo from '@/app/components/Logo';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { AISearchService, SearchResult, SearchFilters, SearchSuggestion } from '@/lib/services/AISearchService';
import type { User } from '@mintenance/types';
import { logger } from '@mintenance/shared';

interface AISearchClientProps {
  user: Pick<User, 'id' | 'role' | 'email'>;
}

export function AISearchClient({ user }: AISearchClientProps) {
  const router = useRouter();
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

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'job':
        return 'briefcase';
      case 'contractor':
        return 'profile';
      case 'service':
        return 'settings';
      default:
        return 'search';
    }
  };

  const getResultTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'job':
        return theme.colors.primary;
      case 'contractor':
        return theme.colors.info;
      case 'service':
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderSearchResult = (item: SearchResult) => (
    <div
      key={item.id}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: '20px',
        padding: theme.spacing[6],
        marginBottom: theme.spacing[4],
        cursor: 'pointer',
        border: `1px solid ${theme.colors.border}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onClick={() => router.push(item.type === 'job' ? `/jobs/${item.id}` : `/contractor/${item.id}`)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', gap: theme.spacing[4] }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: `${getResultTypeColor(item.type)}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={getResultIcon(item.type)} size={24} color={getResultTypeColor(item.type)} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing[2] }}>
            <div>
              <h3
                style={{
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.text,
                  margin: 0,
                  marginBottom: theme.spacing[1],
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.description}
              </p>
            </div>

            <div
              style={{
                backgroundColor: `${theme.colors.success}15`,
                color: theme.colors.success,
                padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                borderRadius: '12px',
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.bold,
              }}
            >
              {Math.round(item.relevanceScore * 100)}% Match
            </div>
          </div>

          <div style={{ display: 'flex', gap: theme.spacing[3], marginTop: theme.spacing[3] }}>
            {item.metadata.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                <Icon name="mapPin" size={14} color={theme.colors.textSecondary} />
                <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                  {item.metadata.location}
                </span>
              </div>
            )}
            {item.metadata.price && (
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                <Icon name="currencyDollar" size={14} color={theme.colors.textSecondary} />
                <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                  ${item.metadata.price.toLocaleString()}
                </span>
              </div>
            )}
            {item.metadata.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                <Icon name="star" size={14} color={theme.colors.warning} />
                <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                  {item.metadata.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuggestion = (item: SearchSuggestion) => (
    <div
      key={item.text}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing[2],
        padding: theme.spacing[3],
        cursor: 'pointer',
        borderRadius: '12px',
        transition: 'background-color 0.2s',
      }}
      onClick={() => handleSuggestionPress(item)}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Icon
        name={item.type === 'query' ? 'search' : item.type === 'category' ? 'dashboard' : 'mapPin'}
        size={18}
        color={theme.colors.textSecondary}
      />
      <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.text }}>{item.text}</span>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.backgroundSecondary }}>
      {/* Logo Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing[6],
          backgroundColor: theme.colors.surface,
          borderBottom: `1px solid ${theme.colors.border}`,
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Logo />
          <span
            style={{
              marginLeft: theme.spacing[3],
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}
          >
            Mintenance
          </span>
        </Link>
      </div>

      {/* Title Header */}
      <div style={{ backgroundColor: theme.colors.primary, paddingTop: '60px', paddingBottom: '20px' }}>
        <div style={{ textAlign: 'center', paddingLeft: '20px', paddingRight: '20px' }}>
          <h1
            style={{
              fontSize: theme.typography.fontSize['4xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: 'white',
              margin: 0,
              marginBottom: '8px',
            }}
          >
            🤖 AI-Powered Search
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSize.xl,
              color: 'rgba(255,255,255,0.9)',
              fontWeight: theme.typography.fontWeight.medium,
              margin: 0,
            }}
          >
            Find exactly what you need with semantic search
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: theme.spacing[6] }}>
        {/* Search Bar */}
        <div style={{ marginBottom: theme.spacing[8], position: 'relative' }}>
          <div style={{ display: 'flex', gap: theme.spacing[3] }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="Search for jobs, contractors, or services..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                style={{
                  width: '100%',
                  padding: `${theme.spacing[4]} ${theme.spacing[5]}`,
                  paddingLeft: theme.spacing[12],
                  fontSize: theme.typography.fontSize.lg,
                  borderRadius: '16px',
                  border: `2px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.primary;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.border;
                }}
              />
              <div style={{ position: 'absolute', left: theme.spacing[4], top: '50%', transform: 'translateY(-50%)' }}>
                <Icon name="search" size={24} color={theme.colors.textSecondary} />
              </div>
            </div>

            <button
              onClick={handleSearch}
              style={{
                padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
                backgroundColor: theme.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Search
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: theme.spacing[2],
                backgroundColor: theme.colors.surface,
                borderRadius: '16px',
                border: `1px solid ${theme.colors.border}`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                zIndex: 100,
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              {suggestions.map((suggestion) => renderSuggestion(suggestion))}
            </div>
          )}
        </div>

        {/* Trending Searches */}
        {!loading && results.length === 0 && trendingSearches.length > 0 && (
          <div style={{ marginBottom: theme.spacing[8] }}>
            <h2
              style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.text,
                marginBottom: theme.spacing[4],
              }}
            >
              🔥 Trending Searches
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
              {trendingSearches.map((search) => (
                <button
                  key={search.text}
                  onClick={() => handleSuggestionPress(search)}
                  style={{
                    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                    backgroundColor: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '20px',
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.text,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.primary;
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = theme.colors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.surface;
                    e.currentTarget.style.color = theme.colors.text;
                    e.currentTarget.style.borderColor = theme.colors.border;
                  }}
                >
                  {search.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: theme.spacing[12] }}>
            <div style={{ fontSize: theme.typography.fontSize['2xl'], marginBottom: theme.spacing[4] }}>🔄</div>
            <p style={{ fontSize: theme.typography.fontSize.lg, color: theme.colors.textSecondary }}>
              Searching with AI...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            style={{
              backgroundColor: `${theme.colors.error}15`,
              border: `1px solid ${theme.colors.error}`,
              borderRadius: '16px',
              padding: theme.spacing[4],
              marginBottom: theme.spacing[6],
            }}
          >
            <p style={{ color: theme.colors.error, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing[6],
              }}
            >
              <h2
                style={{
                  fontSize: theme.typography.fontSize['2xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.text,
                  margin: 0,
                }}
              >
                {results.length} results found
              </h2>
            </div>

            {results.map((item) => renderSearchResult(item))}
          </div>
        )}

        {/* Empty State */}
        {!loading && query && results.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: theme.spacing[12] }}>
            <div style={{ fontSize: theme.typography.fontSize['4xl'], marginBottom: theme.spacing[4] }}>🔍</div>
            <h2
              style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                marginBottom: theme.spacing[2],
              }}
            >
              No results found
            </h2>
            <p style={{ fontSize: theme.typography.fontSize.base, color: theme.colors.textSecondary }}>
              Try adjusting your search terms or browse trending searches above
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
