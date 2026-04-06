'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import type { LocationSuggestion } from './types';

interface AddressFieldProps {
  address: string;
  onAddressChange: (value: string) => void;
  locationSuggestions: LocationSuggestion[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  isLoadingSuggestions: boolean;
  onSelectSuggestion: (suggestion: LocationSuggestion) => void;
}

export function AddressField({
  address,
  onAddressChange,
  locationSuggestions,
  showSuggestions,
  setShowSuggestions,
  isLoadingSuggestions,
  onSelectSuggestion,
}: AddressFieldProps) {
  return (
    <div style={{ position: 'relative' }}>
      <label htmlFor="address" style={{
        display: 'block',
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing[2],
      }}>
        Address *
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          id="address"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          onFocus={() => {
            if (locationSuggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder="Enter property address"
          required
          style={{
            width: '100%',
            padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
          }}
        />
        {isLoadingSuggestions && (
          <div style={{
            position: 'absolute',
            right: theme.spacing[3],
            top: '50%',
            transform: 'translateY(-50%)',
          }}>
            <Icon name="refresh" size={16} color={theme.colors.textSecondary} />
          </div>
        )}
      </div>

      {showSuggestions && locationSuggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: theme.spacing[1],
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.md,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 100,
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {locationSuggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => onSelectSuggestion(suggestion)}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                textAlign: 'left',
                border: 'none',
                backgroundColor: 'transparent',
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
              {suggestion.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
