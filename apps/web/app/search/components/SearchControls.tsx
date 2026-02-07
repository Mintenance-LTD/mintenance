'use client';

import Link from 'next/link';
import { SearchBar } from '@/components/SearchBar';
import { Button } from '@/components/ui';
import { theme } from '@/lib/theme';
import Logo from '../../components/Logo';
import type { AdvancedSearchFilters } from '@mintenance/types';

type SearchType = 'jobs' | 'contractors';

interface SearchControlsProps {
  query: string;
  onQueryChange: (value: string) => void;
  searchType: SearchType;
  onSearchTypeChange: (type: SearchType) => void;
  filters: AdvancedSearchFilters;
  hasActiveFilters: boolean;
  resultsCount: number;
  isLoggedIn: boolean;
  onShowFilters: () => void;
  onSaveSearch: () => void;
  onClearAllFilters: () => void;
}

export function SearchControls({
  query,
  onQueryChange,
  searchType,
  onSearchTypeChange,
  filters,
  hasActiveFilters,
  resultsCount,
  isLoggedIn,
  onShowFilters,
  onSaveSearch,
  onClearAllFilters,
}: SearchControlsProps) {
  return (
    <>
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

      {/* Sticky Search Header */}
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
                onChange={onQueryChange}
                placeholder={`Search ${searchType}...`}
              />
            </div>
            <Button
              variant="outline"
              onClick={onShowFilters}
              style={{
                backgroundColor: hasActiveFilters ? `${theme.colors.primary}15` : undefined,
                color: hasActiveFilters ? theme.colors.primary : undefined,
                borderColor: hasActiveFilters ? theme.colors.primary : undefined
              }}
            >
              Filters {hasActiveFilters && '•'}
            </Button>
            {isLoggedIn && query.trim() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSaveSearch}
              >
                Save
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
              onClick={() => onSearchTypeChange('jobs')}
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
              Jobs ({searchType === 'jobs' ? resultsCount : '...'})
            </button>
            <button
              onClick={() => onSearchTypeChange('contractors')}
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
              Contractors ({searchType === 'contractors' ? resultsCount : '...'})
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
                onClick={onClearAllFilters}
                style={{ fontSize: theme.typography.fontSize.xs }}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
