'use client';

import React, { useEffect, useRef, useState } from 'react';

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
}

/**
 * PlacesAutocomplete Component
 * 
 * Wraps an input field with Google Places Autocomplete functionality.
 * Extracts city, country, and coordinates from selected place.
 */

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
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const scriptCreatedRef = useRef(false);
  const isLoadedRef = useRef(false);
  
  // Use refs to avoid dependency issues with callbacks
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  
  // Update refs when callbacks change
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onChange, onPlaceSelect]);

  useEffect(() => {
    // Check if Google Maps is already loaded
    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined' && (window as any).google?.maps?.places?.Autocomplete) {
        setIsLoaded(true);
        isLoadedRef.current = true;
        return true;
      }
      return false;
    };

    // Check immediately if already loaded
    if (checkGoogleMaps()) {
      return undefined;
    }

    let cleanup: (() => void) | undefined = undefined;

    // Check if any Google Maps script is already loading/loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script exists, wait for it to load
      const checkInterval = setInterval(() => {
        if (checkGoogleMaps()) {
          clearInterval(checkInterval);
        }
      }, 100);

      // Stop checking after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 10000);

      cleanup = () => clearInterval(checkInterval);
    } else {
      // Load Google Maps script if not already loaded
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const scriptId = 'google-maps-places-script';
        
        // Create and load script
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        
        scriptCreatedRef.current = true;
        
        script.onload = () => {
          checkGoogleMaps();
        };

        document.head.appendChild(script);

        cleanup = () => {
          // Cleanup: only remove script if we created it and it hasn't loaded yet
          const scriptElement = document.getElementById(scriptId);
          if (scriptElement && scriptCreatedRef.current && !isLoadedRef.current) {
            try {
              document.head.removeChild(scriptElement);
            } catch (e) {
              // Script may have already been removed
            }
          }
        };
      } else {
        console.warn('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured');
      }
    }

    return cleanup;
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) {
      return undefined;
    }

    // Initialize Autocomplete
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['geocode', 'establishment'],
      fields: ['address_components', 'formatted_address', 'geometry'],
    });

    autocompleteRef.current = autocomplete;

    // Handle place selection
    autocomplete.addListener('place_changed', () => {
      setIsGeocoding(true);
      const place = autocomplete.getPlace();

      if (!place.geometry || !place.address_components) {
        setIsGeocoding(false);
        return;
      }

      // Extract city and country from address components
      let city = '';
      let country = '';
      let streetNumber = '';
      let route = '';

      place.address_components.forEach((component) => {
        const types = component.types;

        if (types.includes('locality') || types.includes('postal_town')) {
          city = component.long_name;
        } else if (types.includes('administrative_area_level_1') && !city) {
          // Fallback to state if no city found
          city = component.long_name;
        } else if (types.includes('country')) {
          country = normalizeCountryCode(component.short_name);
        } else if (types.includes('street_number')) {
          streetNumber = component.long_name;
        } else if (types.includes('route')) {
          route = component.long_name;
        }
      });

      // Use formatted address if city not found
      const formattedAddress = place.formatted_address || '';
      if (!city && formattedAddress) {
        // Try to extract city from formatted address
        const parts = formattedAddress.split(',');
        if (parts.length > 0) {
          city = parts[0].trim();
        }
      }

      // Default to UK if no country found
      if (!country) {
        country = 'UK';
      }

      // Set input value to formatted address or city
      const displayValue = city || formattedAddress || value;
      onChangeRef.current(displayValue);

      // Call onPlaceSelect callback with extracted data
      if (onPlaceSelectRef.current) {
        try {
          onPlaceSelectRef.current({
            city: city || formattedAddress.split(',')[0]?.trim() || '',
            country: normalizeCountryCode(country || 'UK'),
            address: formattedAddress,
            latitude: place.geometry?.location?.lat(),
            longitude: place.geometry?.location?.lng(),
          });
        } catch (error) {
          console.error('Error in onPlaceSelect callback:', error);
        }
      }
      setIsGeocoding(false);
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, value]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...style,
          paddingRight: isGeocoding ? '40px' : style?.paddingRight,
        }}
        required={required}
        autoComplete="off"
        disabled={!isLoaded}
      />
      {isGeocoding && (
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
              animation: 'spin 0.6s linear infinite',
            }}
          />
          <style jsx>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

