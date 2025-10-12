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
            Browse {contractors.length} verified contractors ready to help with your project
          </p>
        </div>

        {/* Toggle Buttons */}
        <div
          style={{
            display: 'flex',
            gap: theme.spacing[2],
            backgroundColor: theme.colors.backgroundSecondary,
            padding: theme.spacing[1],
            borderRadius: theme.borderRadius.lg,
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
              borderRadius: theme.borderRadius.md,
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
              borderRadius: theme.borderRadius.md,
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

      {/* Search Filters */}
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
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
                  borderRadius: theme.borderRadius.md,
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
                  borderRadius: theme.borderRadius.md,
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
                  borderRadius: theme.borderRadius.md,
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
          <Link
            href="/contractors"
            style={{
              display: 'inline-block',
              marginTop: theme.spacing[4],
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: theme.colors.backgroundSecondary,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            Clear All Filters
          </Link>
        )}
      </div>

      {/* Content - Grid or Map */}
      {viewMode === 'map' ? (
        <ContractorMapView contractors={contractors} />
      ) : contractors.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: theme.spacing[6],
          }}
        >
          {contractors.map((contractor: any) => (
            <ContractorCard key={contractor.id} contractor={contractor} />
          ))}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[12],
            textAlign: 'center',
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <p
            style={{
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[4],
            }}
          >
            No contractors found matching your criteria
          </p>
          <Link
            href="/contractors"
            style={{
              color: theme.colors.primary,
              textDecoration: 'none',
              fontSize: theme.typography.fontSize.base,
            }}
          >
            Clear filters
          </Link>
        </div>
      )}
    </>
  );
}

