'use client';

import React, { useRef, useState, useEffect } from 'react';
import { logger } from '@mintenance/shared';

/**
 * SECURITY NOTE: This component NO LONGER uses client-side Google Maps API
 * to avoid exposing API keys in JavaScript bundles.
 *
 * Instead, it uses the secure /api/geocode-proxy endpoint for geocoding.
 * The proxy endpoint:
 * - Keeps API key server-side only
 * - Requires authentication
 * - Implements rate limiting
 * - Validates all inputs
 */

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: {
    city: string;
    country: string;
    address: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  required?: boolean;
  className?: string;
}

// Map Google Places country codes to form country codes
const COUNTRY_CODE_MAP: Record<string, string> = {
  'GB': 'UK', // United Kingdom
  'US': 'US', // United States
  'CA': 'CA', // Canada
  'AU': 'AU', // Australia
};

function normalizeCountryCode(code: string): string {
  return COUNTRY_CODE_MAP[code] || code || 'UK';
}

export function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address',
  style,
  required = false,
  className,
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to avoid dependency issues with callbacks
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);

  // Update refs when callbacks change
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onChange, onPlaceSelect]);

  /**
   * Geocode address using secure server-side proxy
   * No API key exposure - all geocoding happens server-side
   */
  const handleManualGeocode = async () => {
    if (!value || value.trim().length === 0) {
      return;
    }

    setIsGeocoding(true);
    setError(null);

    try {
      // Use secure server-side proxy endpoint
      const response = await fetch('/api/geocode-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: value.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          throw new Error(
            `Rate limit exceeded. Please try again in ${retryAfter || 60} seconds.`
          );
        }

        // Handle authentication errors
        if (response.status === 401) {
          throw new Error('Please sign in to use address geocoding.');
        }

        throw new Error(errorData.error || 'Failed to geocode address');
      }

      const data = await response.json();

      if (data.latitude && data.longitude && data.formatted_address) {
        // Extract city and country from formatted address
        const addressParts = data.formatted_address.split(',');
        const city = addressParts[0]?.trim() || '';
        const countryPart = addressParts[addressParts.length - 1]?.trim() || '';

        // Try to extract country code from the last part
        let country = 'UK'; // Default
        if (countryPart.includes('United Kingdom') || countryPart.includes('UK')) {
          country = 'UK';
        } else if (countryPart.includes('United States') || countryPart.includes('USA')) {
          country = 'US';
        } else if (countryPart.includes('Canada')) {
          country = 'CA';
        } else if (countryPart.includes('Australia')) {
          country = 'AU';
        }

        // Update the input value with the formatted address
        onChangeRef.current(data.formatted_address);

        // Call onPlaceSelect callback with geocoded data
        if (onPlaceSelectRef.current) {
          onPlaceSelectRef.current({
            city: city,
            country: country,
            address: data.formatted_address,
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }

        logger.info('Address geocoded successfully via secure proxy', {
          service: 'places-autocomplete',
        });
      } else {
        throw new Error('No location data returned');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to geocode address';
      setError(errorMessage);
      logger.error('Error geocoding address via proxy:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Auto-geocode when user presses Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value && value.trim().length > 0 && !isGeocoding) {
      e.preventDefault();
      handleManualGeocode();
    }
  };

  const showGeocodeButton = value && value.trim().length > 0 && !isGeocoding;

  return (
    <div className={className} style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setError(null); // Clear error when user types
        }}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        style={{
          ...style,
          paddingRight: isGeocoding || showGeocodeButton ? '80px' : style?.paddingRight,
        }}
        required={required}
        autoComplete="off"
        disabled={isGeocoding}
        title="Enter address and press Enter or click Geocode button"
      />

      {/* Loading Spinner */}
      {isGeocoding && (
        <>
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes places-autocomplete-spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}} />
          <div
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid #E5E7EB',
                borderTopColor: '#3B82F6',
                borderRadius: '50%',
                animation: 'places-autocomplete-spin 0.6s linear infinite',
              }}
            />
          </div>
        </>
      )}

      {/* Geocode Button */}
      {showGeocodeButton && (
        <button
          type="button"
          onClick={handleManualGeocode}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#10B981',
            backgroundColor: 'transparent',
            border: '1px solid #10B981',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#10B981';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#10B981';
          }}
          title="Geocode this address to get coordinates"
        >
          Geocode
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          fontSize: '12px',
          color: '#EF4444',
          marginTop: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Info Message */}
      <div style={{
        fontSize: '11px',
        color: '#6B7280',
        marginTop: '4px',
      }}>
        💡 Type address and press Enter or click Geocode
      </div>
    </div>
  );
}
