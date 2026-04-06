'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

interface BrowseHeroProps {
  searchInputId: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resultsCount: number;
}

export function BrowseHero({
  searchInputId,
  searchQuery,
  setSearchQuery,
  resultsCount,
}: BrowseHeroProps) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0066CC 0%, #004C99 100%)',
      color: 'white',
      padding: '3rem 2rem',
      marginBottom: '2rem',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: '800',
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em',
        }}>
          Find Trusted Contractors
        </h1>
        <p style={{
          fontSize: '1.25rem',
          opacity: 0.95,
          marginBottom: '2rem',
        }}
          aria-live="polite"
          aria-atomic="true"
        >
          Browse {resultsCount} verified contractor{resultsCount !== 1 ? 's' : ''} ready to help with your project
        </p>

        {/* Search Bar */}
        <div style={{
          maxWidth: '800px',
          position: 'relative',
        }}>
          <Icon name="search" size={20} color="#9CA3AF" aria-hidden="true" style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
          }} />
          <input
            id={searchInputId}
            type="search"
            placeholder="Search contractors by name, skills, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-describedby={searchQuery ? `${searchInputId}-results` : undefined}
            className="search-input"
            style={{
              width: '100%',
              padding: '1rem 3rem',
              fontSize: '1rem',
              borderRadius: '12px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              color: '#111827',
              outline: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
