'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { PlacesAutocomplete } from '@/components/ui/PlacesAutocomplete';
import type { EditProfileFormData } from './types';

interface LocationContactTabProps {
  formData: EditProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<EditProfileFormData>>;
}

export function LocationContactTab({ formData, setFormData }: LocationContactTabProps) {
  return (
    <div>
      {/* Location Fields */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[6],
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}>
            City / Address
          </label>
          <PlacesAutocomplete
            value={formData.city}
            onChange={(value) => setFormData({ ...formData, city: value })}
            onPlaceSelect={(place) => {
              setFormData({
                ...formData,
                city: place.city,
                country: place.country,
                address: place.address,
                latitude: place.latitude,
                longitude: place.longitude,
              });
            }}
            placeholder="London or enter your address"
            style={{
              width: '100%',
              padding: theme.spacing[3],
              fontSize: theme.typography.fontSize.base,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.white,
              color: theme.colors.textPrimary,
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}>
            Country
          </label>
          <select
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            style={{
              width: '100%',
              padding: theme.spacing[3],
              fontSize: theme.typography.fontSize.base,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.white,
              color: theme.colors.textPrimary,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.colors.primary;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border;
            }}
          >
            <option value="UK">United Kingdom</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
          </select>
        </div>
      </div>

      {/* Phone */}
      <div style={{ marginBottom: theme.spacing[6] }}>
        <label style={{
          display: 'block',
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[2],
        }}>
          Phone Number
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          style={{
            width: '100%',
            padding: theme.spacing[3],
            fontSize: theme.typography.fontSize.base,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.white,
            color: theme.colors.textPrimary,
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
          placeholder="+44 7700 900000"
        />
      </div>
    </div>
  );
}
