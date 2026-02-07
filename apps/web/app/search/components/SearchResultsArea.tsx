'use client';

import { Button } from '@/components/ui';
import { theme } from '@/lib/theme';
import { logger } from '@/lib/logger';
import { JobResultCard } from './JobResultCard';
import { ContractorResultCard } from './ContractorResultCard';
import type { Job, ContractorProfile, SearchResult } from '@mintenance/types';

type SearchType = 'jobs' | 'contractors';

interface SearchResultsAreaProps {
  loading: boolean;
  searchType: SearchType;
  query: string;
  results: SearchResult<Job | ContractorProfile>;
  onQueryChange: (value: string) => void;
  onNavigateToJob: (jobId: string) => void;
  onNavigateToContractor: (contractorId: string) => void;
}

export function SearchResultsArea({
  loading,
  searchType,
  query,
  results,
  onQueryChange,
  onNavigateToJob,
  onNavigateToContractor,
}: SearchResultsAreaProps) {
  if (loading) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: theme.spacing.lg
      }}>
        <div style={{
          textAlign: 'center',
          padding: theme.spacing.xl
        }}>
          <div style={{
            fontSize: theme.typography.fontSize.lg,
            color: theme.colors.textSecondary
          }}>
            Searching...
          </div>
        </div>
      </div>
    );
  }

  if (results.totalCount === 0) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: theme.spacing.lg
      }}>
        <div style={{
          textAlign: 'center',
          padding: theme.spacing.xl
        }}>
          <div style={{
            fontSize: theme.typography.fontSize['4xl'],
            marginBottom: theme.spacing.lg
          }}>
            &#128269;
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
                    onClick={() => onQueryChange(suggestion)}
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
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: theme.spacing.lg
    }}>
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
          ? <JobResultCard key={item.id} job={item as Job} onClick={onNavigateToJob} />
          : <ContractorResultCard key={item.id} contractor={item as ContractorProfile} onClick={onNavigateToContractor} />
      )}

      {results.hasMore && (
        <div style={{
          textAlign: 'center',
          marginTop: theme.spacing.xl
        }}>
          <Button
            variant="outline"
            onClick={() => {
              logger.userAction('Load more results', { searchType, query });
            }}
          >
            Load More Results
          </Button>
        </div>
      )}
    </div>
  );
}
