'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { AdvancedSearchService } from '@/lib/services/AdvancedSearchService';
import { AdvancedSearchFiltersComponent } from '@/components/search/AdvancedSearchFilters';
import { SearchBar } from '@/components/SearchBar';
import { Button, Card } from '@/components/ui';
import { theme } from '@/lib/theme';
import { logger } from '@/lib/logger';
import Logo from '../components/Logo';
import Link from 'next/link';
import type {
  User,
  Job,
  ContractorProfile,
  ContractorSkill,
  AdvancedSearchFilters,
  SavedSearch,
  SearchResult
} from '@mintenance/types';

// Disable static optimization for this page
export const dynamic = 'force-dynamic';

type SearchType = 'jobs' | 'contractors';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [searchType, setSearchType] = useState<SearchType>('jobs');
  const [query, setQuery] = useState(searchParams?.get('q') || '');
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    skills: [],
    projectTypes: [],
    availability: 'flexible'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult<Job | ContractorProfile>>({
    items: [],
    totalCount: 0,
    hasMore: false
  });
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        // Load saved searches
        try {
          const saved = await AdvancedSearchService.getSavedSearches(currentUser.id);
          setSavedSearches(saved);
        } catch (error) {
          logger.error('Error loading saved searches', error);
        }
      }
    };
    loadUser();
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Boolean(filters.priceRange) ||
           filters.skills.length > 0 ||
           filters.projectTypes.length > 0 ||
           filters.availability !== 'flexible' ||
           Boolean(filters.urgency) ||
           Boolean(filters.projectComplexity) ||
           Boolean(filters.hasInsurance) ||
           Boolean(filters.isBackgroundChecked) ||
           Boolean(filters.hasPortfolio);
  }, [filters]);

  const performSearch = useCallback(async () => {
    if (!query.trim() && !hasActiveFilters) {
      return;
    }

    setLoading(true);
    try {
      let searchResults: SearchResult<Job | ContractorProfile>;

      if (searchType === 'jobs') {
        searchResults = await AdvancedSearchService.searchJobs(query, filters);
      } else {
        searchResults = await AdvancedSearchService.searchContractors(query, filters);
      }

      setResults(searchResults);

      if (user) {
        await AdvancedSearchService.trackSearchAnalytics(
          user.id,
          query,
          filters,
          searchResults.totalCount,
          `session_${Date.now()}`
        );
      }
    } catch (error) {
      logger.error('Search error', error);
    } finally {
      setLoading(false);
    }
  }, [filters, hasActiveFilters, query, searchType, user]);

  useEffect(() => {
    if (!query && !hasActiveFilters) {
      return;
    }

    void performSearch();
  }, [hasActiveFilters, performSearch, query]);

  const handleSaveSearch = async () => {
    const trimmedQuery = query.trim();
    if (!user || !trimmedQuery) {
      return;
    }

    const defaultName = `Search: ${trimmedQuery}`;
    const nameInput = prompt('Name for saved search:', defaultName)?.trim() ?? '';
    const name = nameInput.length > 0 ? nameInput : defaultName;

    if (savedSearches.some(saved => saved.name.trim().toLowerCase() === name.toLowerCase())) {
      alert('You already have a saved search with this name.');
      return;
    }

    try {
      await AdvancedSearchService.saveSearch(user.id, name, filters, false);
      alert('Search saved successfully!');

      const saved = await AdvancedSearchService.getSavedSearches(user.id);
      setSavedSearches(saved);
    } catch (error) {
      logger.error('Error saving search', error);
      alert('Failed to save search');
    }
  };

  const clearAllFilters = () => {
    setFilters({
      skills: [],
      projectTypes: [],
      availability: 'flexible'
    });
    setQuery('');
    setResults({ items: [], totalCount: 0, hasMore: false });
  };

  const renderJobResult = (job: Job) => (
    <Card
      key={job.id}
      style={{
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        cursor: 'pointer'
      }}
      hover={true}
      onClick={() => router.push(`/jobs/${job.id}`)}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm
      }}>
        <div>
          <h3 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            margin: 0,
            marginBottom: '4px'
          }}>
            {job.title}
          </h3>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            margin: 0
          }}>
            📍 {job.location} • {job.category}
          </p>
        </div>
        <div style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.success
        }}>
          ${job.budget?.toLocaleString()}
        </div>
      </div>

      <p style={{
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text,
        lineHeight: theme.typography.lineHeight.relaxed,
        margin: 0,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {job.description}
      </p>

      <div style={{
        marginTop: theme.spacing.sm,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textSecondary
        }}>
          Posted {new Date(job.createdAt || job.created_at || new Date()).toLocaleDateString()}
        </span>
        <div style={{
          backgroundColor: theme.colors.primary,
          color: theme.colors.white,
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          borderRadius: theme.borderRadius.full,
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.bold
        }}>
          {job.priority?.toUpperCase() || 'NORMAL'} PRIORITY
        </div>
      </div>
    </Card>
  );

  const renderContractorResult = (contractor: ContractorProfile) => (
    <Card
      key={contractor.id}
      style={{
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        cursor: 'pointer'
      }}
      hover={true}
      onClick={() => router.push(`/contractors/${contractor.id}`)}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: theme.spacing.md
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: theme.colors.backgroundSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: theme.typography.fontSize['2xl'],
          flexShrink: 0
        }}>
          {contractor.profileImageUrl ? (
            <img
              src={contractor.profileImageUrl}
              alt={contractor.first_name}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          ) : (
            '👤'
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: theme.spacing.xs
          }}>
            <div>
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                margin: 0
              }}>
                {contractor.first_name} {contractor.last_name}
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                marginTop: '4px'
              }}>
                <span style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.warning
                }}>
                  {'⭐'.repeat(Math.floor(contractor.rating || 0))} {contractor.rating?.toFixed(1)}
                </span>
                <span style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary
                }}>
                  {contractor.totalJobsCompleted} jobs completed
                </span>
              </div>
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.success
            }}>
              ${contractor.hourlyRate}/hr
            </div>
          </div>

          <p style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.text,
            lineHeight: theme.typography.lineHeight.relaxed,
            margin: 0,
            marginBottom: theme.spacing.sm,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {contractor.first_name} {contractor.last_name} - Licensed contractor
          </p>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.sm
          }}>
            {contractor.skills?.slice(0, 4).map((skill: ContractorSkill) => (
              <span
                key={skill.id}
                style={{
                  backgroundColor: `${theme.colors.primary}15`,
                  color: theme.colors.primary,
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.medium
                }}
              >
                {skill.skillName}
              </span>
            ))}
            {(contractor.skills?.length || 0) > 4 && (
              <span style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.xs
              }}>
                +{(contractor.skills?.length || 0) - 4} more
              </span>
            )}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              📅 Available: {contractor.availability}
            </span>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.info,
              fontWeight: theme.typography.fontWeight.medium
            }}>
              {contractor.yearsExperience} years experience
            </span>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.colors.backgroundSecondary
    }}>
      {/* Logo Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing[6],
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Logo />
          <span style={{
            marginLeft: theme.spacing[3],
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary
          }}>
            Mintenance
          </span>
        </Link>
      </div>

      {/* Header */}
      <div style={{
        backgroundColor: theme.colors.white,
        borderBottom: `1px solid ${theme.colors.border}`,
        padding: theme.spacing.lg,
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Search Controls */}
          <div style={{
            display: 'flex',
            gap: theme.spacing.md,
            alignItems: 'center',
            marginBottom: theme.spacing.md
          }}>
            <div style={{ flex: 1 }}>
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder={`Search ${searchType}...`}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(true)}
              style={{
                backgroundColor: hasActiveFilters ? `${theme.colors.primary}15` : undefined,
                color: hasActiveFilters ? theme.colors.primary : undefined,
                borderColor: hasActiveFilters ? theme.colors.primary : undefined
              }}
            >
              🔍 Filters {hasActiveFilters && '•'}
            </Button>
            {user && query.trim() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveSearch}
              >
                💾 Save
              </Button>
            )}
          </div>

          {/* Search Type Toggle */}
          <div style={{
            display: 'flex',
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.md
          }}>
            <button
              onClick={() => setSearchType('jobs')}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                borderRadius: theme.borderRadius.full,
                border: 'none',
                backgroundColor: searchType === 'jobs'
                  ? theme.colors.primary
                  : theme.colors.backgroundSecondary,
                color: searchType === 'jobs'
                  ? theme.colors.white
                  : theme.colors.text,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📋 Jobs ({searchType === 'jobs' ? results.totalCount : '...'})
            </button>
            <button
              onClick={() => setSearchType('contractors')}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                borderRadius: theme.borderRadius.full,
                border: 'none',
                backgroundColor: searchType === 'contractors'
                  ? theme.colors.primary
                  : theme.colors.backgroundSecondary,
                color: searchType === 'contractors'
                  ? theme.colors.white
                  : theme.colors.text,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🔧 Contractors ({searchType === 'contractors' ? results.totalCount : '...'})
            </button>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              marginBottom: theme.spacing.sm
            }}>
              <span style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary
              }}>
                Active filters:
              </span>
              {filters.skills.map(skill => (
                <span
                  key={skill}
                  style={{
                    backgroundColor: `${theme.colors.primary}15`,
                    color: theme.colors.primary,
                    padding: `2px ${theme.spacing.xs}`,
                    borderRadius: theme.borderRadius.sm,
                    fontSize: theme.typography.fontSize.xs
                  }}
                >
                  {skill}
                </span>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                style={{ fontSize: theme.typography.fontSize.xs }}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: theme.spacing.lg
      }}>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: theme.spacing.xl
          }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              color: theme.colors.textSecondary
            }}>
              🔄 Searching...
            </div>
          </div>
        ) : results.totalCount === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: theme.spacing.xl
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['4xl'],
              marginBottom: theme.spacing.lg
            }}>
              🔍
            </div>
            <h2 style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing.md
            }}>
              No {searchType} found
            </h2>
            <p style={{
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing.lg
            }}>
              Try adjusting your search query or filters to find more results.
            </p>
            {results.suggestions && results.suggestions.length > 0 && (
              <div>
                <p style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.sm
                }}>
                  Suggestions:
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: theme.spacing.xs,
                  flexWrap: 'wrap'
                }}>
                  {results.suggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setQuery(suggestion)}
                      style={{
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        borderRadius: theme.borderRadius.full,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.white,
                        color: theme.colors.primary,
                        fontSize: theme.typography.fontSize.sm,
                        cursor: 'pointer'
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.lg
            }}>
              <h2 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                margin: 0
              }}>
                {results.totalCount.toLocaleString()} {searchType} found
              </h2>
            </div>

            {results.items.map(item =>
              searchType === 'jobs'
                ? renderJobResult(item as Job)
                : renderContractorResult(item as ContractorProfile)
            )}

            {results.hasMore && (
              <div style={{
                textAlign: 'center',
                marginTop: theme.spacing.xl
              }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Load more results logic would go here
                    logger.userAction('Load more results', { searchType, query });
                  }}
                >
                  Load More Results
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Search Filters Modal */}
      <AdvancedSearchFiltersComponent
        filters={filters}
        onChange={setFilters}
        onApply={() => setShowFilters(false)}
        onClear={clearAllFilters}
        isVisible={showFilters}
        onClose={() => setShowFilters(false)}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>}>
      <SearchContent />
    </Suspense>
  );
}