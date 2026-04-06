'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface BrowseEmptyStateProps {
  onClearAll: () => void;
}

export function BrowseEmptyState({ onClearAll }: BrowseEmptyStateProps) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 2rem',
      backgroundColor: 'white',
      borderRadius: '16px',
      border: '1px solid #E5E7EB',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '1rem',
      }}>
        <Search className="w-16 h-16 text-gray-300" />
      </div>
      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '0.5rem',
      }}>
        No contractors found
      </h3>
      <p style={{
        fontSize: '1rem',
        color: '#6B7280',
        marginBottom: '1.5rem',
      }}>
        Try adjusting your filters or search criteria
      </p>
      <button
        onClick={onClearAll}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#0066CC',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        Clear All Filters
      </button>
    </div>
  );
}
