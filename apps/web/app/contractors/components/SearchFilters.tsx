'use client';

import React from 'react';
import { theme } from '@/lib/theme';

interface SearchFiltersProps {
  skills: string[];
  cities: string[];
  currentFilters: {
    skill?: string;
    location?: string;
    minRating?: string;
  };
}

export function SearchFilters({ skills, cities, currentFilters }: SearchFiltersProps) {
  return (
    <form
      method="get"
      action="/contractors"
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
        marginBottom: theme.spacing[8],
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: theme.spacing[4],
      }}>
        {/* Skill Filter */}
        <div>
          <label style={{
            display: 'block',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text,
            marginBottom: theme.spacing[2],
          }}>
            Skill
          </label>
          <select
            name="skill"
            defaultValue={currentFilters.skill || ''}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
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
            {skills.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label style={{
            display: 'block',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text,
            marginBottom: theme.spacing[2],
          }}>
            Location
          </label>
          <select
            name="location"
            defaultValue={currentFilters.location || ''}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
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
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Min Rating Filter */}
        <div>
          <label style={{
            display: 'block',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text,
            marginBottom: theme.spacing[2],
          }}>
            Minimum Rating
          </label>
          <select
            name="minRating"
            defaultValue={currentFilters.minRating || ''}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
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
        </div>
      </div>

      {/* Clear Filters Button */}
      {(currentFilters.skill || currentFilters.location || currentFilters.minRating) && (
        <a
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
        </a>
      )}
    </form>
  );
}
