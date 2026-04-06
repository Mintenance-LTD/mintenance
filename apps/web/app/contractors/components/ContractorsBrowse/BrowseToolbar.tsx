'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

export type ViewMode = 'grid' | 'list' | 'map' | 'swipe';
export type SortOption = 'recommended' | 'nearest' | 'rating' | 'reviews' | 'recent';

interface BrowseToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  activeFiltersCount: number;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  compareListCount: number;
  onShowComparison: () => void;
  savedCount: number;
}

export function BrowseToolbar({
  viewMode,
  setViewMode,
  showFilters,
  setShowFilters,
  activeFiltersCount,
  sortBy,
  setSortBy,
  compareListCount,
  onShowComparison,
  savedCount,
}: BrowseToolbarProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      flexWrap: 'wrap',
      gap: '1rem',
    }}>
      {/* Left: View Modes & Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* View Toggle Buttons */}
        <div
          role="group"
          aria-label="View mode toggle"
          style={{
            display: 'flex',
            gap: '0.25rem',
            backgroundColor: 'white',
            padding: '0.25rem',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Switch to grid view"
            aria-pressed={viewMode === 'grid'}
            className="view-toggle-btn"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: viewMode === 'grid' ? '#0066CC' : 'transparent',
              color: viewMode === 'grid' ? 'white' : '#6B7280',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Icon name="dashboard" size={16} color={viewMode === 'grid' ? 'white' : '#6B7280'} aria-hidden="true" />
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            aria-label="Switch to list view"
            aria-pressed={viewMode === 'list'}
            className="view-toggle-btn"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: viewMode === 'list' ? '#0066CC' : 'transparent',
              color: viewMode === 'list' ? 'white' : '#6B7280',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Icon name="list" size={16} color={viewMode === 'list' ? 'white' : '#6B7280'} aria-hidden="true" />
            List
          </button>
          <button
            onClick={() => setViewMode('map')}
            aria-label="Switch to map view"
            aria-pressed={viewMode === 'map'}
            className="view-toggle-btn"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: viewMode === 'map' ? '#0066CC' : 'transparent',
              color: viewMode === 'map' ? 'white' : '#6B7280',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Icon name="map" size={16} color={viewMode === 'map' ? 'white' : '#6B7280'} aria-hidden="true" />
            Map
          </button>
          <button
            onClick={() => setViewMode('swipe')}
            aria-label="Switch to swipe view"
            aria-pressed={viewMode === 'swipe'}
            className="view-toggle-btn"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: viewMode === 'swipe' ? '#0066CC' : 'transparent',
              color: viewMode === 'swipe' ? 'white' : '#6B7280',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Icon name="heart" size={16} color={viewMode === 'swipe' ? 'white' : '#6B7280'} aria-hidden="true" />
            Swipe
          </button>
        </div>

        {/* Filters Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <Icon name="filter" size={16} color="#374151" aria-hidden="true" />
          Filters
          {activeFiltersCount > 0 && (
            <span style={{
              backgroundColor: '#0066CC',
              color: 'white',
              padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '700',
            }}>
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Right: Sort & Compare */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          style={{
            padding: '0.5rem 2.5rem 0.5rem 1rem',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <option value="recommended">Recommended</option>
          <option value="nearest">Nearest to Me</option>
          <option value="rating">Highest Rated</option>
          <option value="reviews">Most Reviews</option>
          <option value="recent">Recently Joined</option>
        </select>

        {/* Compare Button */}
        {compareListCount > 0 && (
          <button
            onClick={onShowComparison}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            Compare ({compareListCount})
          </button>
        )}

        {/* Saved Count */}
        {savedCount > 0 && (
          <div style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <Icon name="heart" size={16} color="#92400E" aria-hidden="true" />
            {savedCount} saved
          </div>
        )}
      </div>
    </div>
  );
}
