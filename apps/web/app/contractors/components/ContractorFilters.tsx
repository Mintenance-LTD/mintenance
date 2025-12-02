'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

interface ContractorFiltersProps {
  selectedSpecialty: string;
  setSelectedSpecialty: (value: string) => void;
  selectedLocation: string;
  setSelectedLocation: (value: string) => void;
  minRating: number;
  setMinRating: (value: number) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (value: boolean) => void;
  availableOnly: boolean;
  setAvailableOnly: (value: boolean) => void;
  maxDistance: number;
  setMaxDistance: (value: number) => void;
  priceRange: string;
  setPriceRange: (value: string) => void;
  minExperience: number;
  setMinExperience: (value: number) => void;
  hasPortfolio: boolean;
  setHasPortfolio: (value: boolean) => void;
  uniqueSkills: string[];
  uniqueCities: string[];
  onClearAll: () => void;
}

export function ContractorFilters({
  selectedSpecialty,
  setSelectedSpecialty,
  selectedLocation,
  setSelectedLocation,
  minRating,
  setMinRating,
  verifiedOnly,
  setVerifiedOnly,
  availableOnly,
  setAvailableOnly,
  maxDistance,
  setMaxDistance,
  priceRange,
  setPriceRange,
  minExperience,
  setMinExperience,
  hasPortfolio,
  setHasPortfolio,
  uniqueSkills,
  uniqueCities,
  onClearAll,
}: ContractorFiltersProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '1.5rem',
      border: '1px solid #E5E7EB',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '700',
          color: '#111827',
          margin: 0,
        }}>
          Filters
        </h3>
        <button
          onClick={onClearAll}
          style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: 'transparent',
            color: '#6B7280',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Clear all
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Trade/Category */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem',
          }}>
            Trade / Category
          </label>
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '0.875rem',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Trades</option>
            {uniqueSkills.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem',
          }}>
            Location
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '0.875rem',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Locations</option>
            {uniqueCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Distance Radius */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem',
          }}>
            Distance: Within {maxDistance} miles
          </label>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            style={{
              width: '100%',
              cursor: 'pointer',
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#6B7280',
            marginTop: '0.25rem',
          }}>
            <span>5 mi</span>
            <span>100 mi</span>
          </div>
        </div>

        {/* Rating */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem',
          }}>
            Minimum Rating
          </label>
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '0.875rem',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            <option value="0">Any Rating</option>
            <option value="4.5">4.5+ Stars</option>
            <option value="4.0">4.0+ Stars</option>
            <option value="3.5">3.5+ Stars</option>
            <option value="3.0">3.0+ Stars</option>
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem',
          }}>
            Price Range
          </label>
          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '0.875rem',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            <option value="all">Any Price</option>
            <option value="budget">£ (Budget)</option>
            <option value="mid">££ (Mid-range)</option>
            <option value="premium">£££ (Premium)</option>
          </select>
        </div>

        {/* Experience */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem',
          }}>
            Minimum Experience
          </label>
          <select
            value={minExperience}
            onChange={(e) => setMinExperience(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '0.875rem',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            <option value="0">Any Experience</option>
            <option value="1">1+ years</option>
            <option value="3">3+ years</option>
            <option value="5">5+ years</option>
            <option value="10">10+ years</option>
          </select>
        </div>

        {/* Checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              style={{
                width: '1rem',
                height: '1rem',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>
              Verified only
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              style={{
                width: '1rem',
                height: '1rem',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>
              Available now
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={hasPortfolio}
              onChange={(e) => setHasPortfolio(e.target.checked)}
              style={{
                width: '1rem',
                height: '1rem',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>
              Has portfolio photos
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
