/**
 * Location Input Component
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import type { LocationSuggestion } from '../lib/types';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string) => void;
  suggestions: LocationSuggestion[];
  showSuggestions: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onDetectLocation: () => void;
  isDetectingLocation: boolean;
}

export function LocationInput({
  value,
  onChange,
  onSelect,
  suggestions,
  showSuggestions,
  onFocus,
  onBlur,
  onDetectLocation,
  isDetectingLocation,
}: LocationInputProps) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: theme.spacing[2] }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="Enter your address"
            style={{
              width: '100%',
              padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.lg,
              border: `1px solid ${theme.colors.border}`,
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.backgroundSecondary,
              outline: 'none',
            }}
          />
          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: theme.spacing[1],
              backgroundColor: theme.colors.white,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.lg,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              maxHeight: '300px',
              overflowY: 'auto',
            }}>
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.place_id}
                  onClick={() => onSelect(suggestion.display_name)}
                  onMouseDown={(e) => e.preventDefault()}
                  style={{
                    padding: theme.spacing[3],
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textPrimary,
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: theme.spacing[2],
                  }}>
                    <Icon name="mapPin" size={16} color={theme.colors.textSecondary} style={{ marginTop: '2px' }} />
                    <span>{suggestion.display_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={onDetectLocation}
          disabled={isDetectingLocation}
          leftIcon={<Icon name="mapPin" size={16} />}
        >
          {isDetectingLocation ? 'Detecting...' : 'Use My Location'}
        </Button>
      </div>
    </div>
  );
}

