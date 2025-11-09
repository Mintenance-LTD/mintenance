'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { ContractorCard } from './ContractorCard';
import { ContractorMapView } from './ContractorMapView';

interface ContractorsBrowseClientProps {
  contractors: any[];
  uniqueSkills: string[];
  uniqueCities: string[];
  currentFilters: {
    skill?: string;
    location?: string;
    minRating?: string;
  };
}

export function ContractorsBrowseClient({
  contractors,
  uniqueSkills,
  uniqueCities,
  currentFilters,
}: ContractorsBrowseClientProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter contractors based on search query
  const filteredContractors = contractors.filter((contractor) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${contractor.first_name} ${contractor.last_name}`.toLowerCase();
    const skills = contractor.contractor_skills?.map((s: any) => s.skill_name.toLowerCase()).join(' ') || '';
    const city = contractor.city?.toLowerCase() || '';
    return fullName.includes(query) || skills.includes(query) || city.includes(query);
  });

  return (
    <>
      {/* View Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing[8],
        }}
      >
        <div>
          <h1
            style={{
              fontSize: theme.typography.fontSize['4xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing[3],
            }}
          >
            Find Trusted Contractors
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.textSecondary,
            }}
          >
            Browse {filteredContractors.length} verified contractors ready to help with your project
          </p>
        </div>

        {/* Toggle Buttons */}
        <div
          style={{
            display: 'flex',
            gap: theme.spacing[2],
            backgroundColor: theme.colors.backgroundSecondary,
            padding: theme.spacing[1],
            borderRadius: '12px',
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: viewMode === 'grid' ? theme.colors.primary : 'transparent',
              color: viewMode === 'grid' ? 'white' : theme.colors.text,
              border: 'none',
              borderRadius: '8px',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
            }}
          >
            <Icon name="dashboard" size={16} color={viewMode === 'grid' ? 'white' : theme.colors.text} />
            List View
          </button>
          <button
            onClick={() => setViewMode('map')}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: viewMode === 'map' ? theme.colors.primary : 'transparent',
              color: viewMode === 'map' ? 'white' : theme.colors.text,
              border: 'none',
              borderRadius: '8px',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
            }}
          >
            <Icon name="map" size={16} color={viewMode === 'map' ? 'white' : theme.colors.text} />
            Map View
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          padding: theme.spacing[6],
          marginBottom: theme.spacing[6],
          border: `1px solid ${theme.colors.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
          <Icon name="search" size={20} color={theme.colors.textSecondary} />
          <input
            type="text"
            placeholder="Search contractors by name, skills, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: theme.spacing[3],
              fontSize: theme.typography.fontSize.base,
              borderRadius: '12px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.backgroundSecondary,
              color: theme.colors.text,
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.colors.primary;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border;
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                padding: theme.spacing[2],
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icon name="x" size={20} color={theme.colors.textSecondary} />
            </button>
          )}
        </div>
      </div>

      {/* Search Filters */}
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          padding: theme.spacing[6],
          marginBottom: theme.spacing[8],
          border: `1px solid ${theme.colors.border}`,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing[4],
          }}
        >
          {/* Skill Filter */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text,
                marginBottom: theme.spacing[2],
              }}
            >
              Skill
            </label>
            <form method="get" action="/contractors">
              <select
                name="skill"
                defaultValue={currentFilters.skill || ''}
                onChange={(e) => e.target.form?.submit()}
                style={{
                  width: '100%',
                  padding: theme.spacing[3],
                  fontSize: theme.typography.fontSize.base,
                  borderRadius: '12px',
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  color: theme.colors.text,
                  cursor: 'pointer',
                }}
              >
                <option value="">All Skills</option>
                {uniqueSkills.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
              {currentFilters.location && (
                <input type="hidden" name="location" value={currentFilters.location} />
              )}
              {currentFilters.minRating && (
                <input type="hidden" name="minRating" value={currentFilters.minRating} />
              )}
            </form>
          </div>

          {/* Location Filter */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text,
                marginBottom: theme.spacing[2],
              }}
            >
              Location
            </label>
            <form method="get" action="/contractors">
              <select
                name="location"
                defaultValue={currentFilters.location || ''}
                onChange={(e) => e.target.form?.submit()}
                style={{
                  width: '100%',
                  padding: theme.spacing[3],
                  fontSize: theme.typography.fontSize.base,
                  borderRadius: '12px',
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  color: theme.colors.text,
                  cursor: 'pointer',
                }}
              >
                <option value="">All Locations</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              {currentFilters.skill && <input type="hidden" name="skill" value={currentFilters.skill} />}
              {currentFilters.minRating && (
                <input type="hidden" name="minRating" value={currentFilters.minRating} />
              )}
            </form>
          </div>

          {/* Min Rating Filter */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text,
                marginBottom: theme.spacing[2],
              }}
            >
              Minimum Rating
            </label>
            <form method="get" action="/contractors">
              <select
                name="minRating"
                defaultValue={currentFilters.minRating || ''}
                onChange={(e) => e.target.form?.submit()}
                style={{
                  width: '100%',
                  padding: theme.spacing[3],
                  fontSize: theme.typography.fontSize.base,
                  borderRadius: '12px',
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  color: theme.colors.text,
                  cursor: 'pointer',
                }}
              >
                <option value="">Any Rating</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.0">4.0+ Stars</option>
                <option value="3.5">3.5+ Stars</option>
                <option value="3.0">3.0+ Stars</option>
              </select>
              {currentFilters.skill && <input type="hidden" name="skill" value={currentFilters.skill} />}
              {currentFilters.location && (
                <input type="hidden" name="location" value={currentFilters.location} />
              )}
            </form>
          </div>
        </div>

        {/* Clear Filters Link */}
        {(currentFilters.skill || currentFilters.location || currentFilters.minRating) && (
          <span
            className="clear-filters-link-wrapper"
            style={{
              display: 'inline-block',
              marginTop: theme.spacing[4],
            }}
          >
            <Link
              href="/contractors"
              style={{
                display: 'inline-block',
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                backgroundColor: theme.colors.backgroundSecondary,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '12px',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Clear All Filters
            </Link>
          </span>
        )}
      </div>

      {/* Content - Grid or Map */}
      {viewMode === 'map' ? (
        <ContractorMapView contractors={filteredContractors} />
      ) : filteredContractors.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: theme.spacing[6],
          }}
        >
          {filteredContractors.map((contractor: any) => (
            <ContractorCard key={contractor.id} contractor={contractor} />
          ))}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: '20px',
            padding: theme.spacing[12],
            textAlign: 'center',
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <Icon name="search" size={48} color={theme.colors.textSecondary} style={{ marginBottom: theme.spacing[4] }} />
          <p
            style={{
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[4],
            }}
          >
            {searchQuery ? `No contractors found matching "${searchQuery}"` : 'No contractors found matching your criteria'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              window.location.href = '/contractors';
            }}
            style={{
              padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
              backgroundColor: theme.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            className="clear-search-button"
          >
            Clear search and filters
          </button>
        </div>
      )}
      <style dangerouslySetInnerHTML={{
        __html: `
          .clear-filters-link-wrapper:hover a {
            background-color: ${theme.colors.primary} !important;
            color: white !important;
          }
          .clear-search-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
        `
      }} />
    </>
  );
}

