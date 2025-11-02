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
      // Script exists, wait for it to load and Places API to initialize
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds (100 * 100ms)
      
      const checkInterval = setInterval(() => {
        attempts++;
        if (checkGoogleMaps()) {
          clearInterval(checkInterval);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.warn('Google Maps Places API script exists but failed to initialize after 10 seconds. Ensure Places API is enabled in Google Cloud Console.');
        }
      }, 100);

      cleanup = () => clearInterval(checkInterval);
    } else {
      // Load Google Maps script if not already loaded
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured. Please set it in your .env.local file.');
        return undefined;
      }
      
      const scriptId = 'google-maps-places-script';
      
      // Check if script is already being loaded by another component
      if (document.getElementById(scriptId)) {
        // Wait for it to load and Places API to initialize
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds
        const checkInterval = setInterval(() => {
          attempts++;
          if (checkGoogleMaps()) {
            clearInterval(checkInterval);
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.error('Google Maps Places API failed to load after 10 seconds. Ensure Places API is enabled in Google Cloud Console.');
          }
        }, 100);
        cleanup = () => clearInterval(checkInterval);
      } else {
        // Create and load script
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        
        scriptCreatedRef.current = true;
        
        script.onload = () => {
          // Wait a bit for the Places API to initialize after script load
          let attempts = 0;
          const maxAttempts = 50; // 5 seconds max wait
          
          const checkInterval = setInterval(() => {
            attempts++;
            if (checkGoogleMaps()) {
              clearInterval(checkInterval);
              // Success - API is loaded, no need to log
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              // Only log as warning, not error - autocomplete is optional
              console.warn('Google Maps Places API did not initialize after 5 seconds. Autocomplete will be unavailable, but manual address entry still works.');
            }
          }, 100);
        };

        script.onerror = () => {
          console.error('Failed to load Google Maps Places API script. Check your API key and ensure Places API is enabled.');
          setIsLoaded(false);
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
      }
    }

    return cleanup;
  }, []);

  useEffect(() => {
    // Don't initialize if Google Maps isn't loaded or input isn't ready
    if (!isLoaded || !inputRef.current) {
      return undefined;
    }

    // Double-check that Google Maps Places API is actually available
    if (typeof window === 'undefined' || !(window as any).google?.maps?.places?.Autocomplete) {
      console.warn('Google Maps Places API not available, autocomplete disabled');
      return undefined;
    }

    // Clean up any existing autocomplete instance
    if (autocompleteRef.current) {
      try {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      } catch (e) {
        // Ignore errors during cleanup
      }
      autocompleteRef.current = null;
    }

    // Small delay to ensure input is fully ready
    const initTimeout = setTimeout(() => {
      if (!inputRef.current) {
        return;
      }

      try {
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
      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
      }
    }, 100); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(initTimeout);
      if (autocompleteRef.current) {
        try {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
        } catch (e) {
          // Ignore errors during cleanup
        }
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded]); // Removed 'value' from dependencies - don't recreate autocomplete when value changes

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const hasApiKey = !!apiKey;
  
  // Allow manual typing even if autocomplete isn't loaded yet
  // Autocomplete is a nice-to-have, but users should always be able to type
  const isInputDisabled = false; // Never disable - allow manual entry even without autocomplete

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isLoaded ? placeholder : hasApiKey ? 'Type address (autocomplete loading...)' : placeholder}
        style={{
          ...style,
          paddingRight: isGeocoding ? '40px' : style?.paddingRight,
          opacity: 1, // Always fully visible
        }}
        required={required}
        autoComplete="off"
        disabled={isInputDisabled}
      />
      {isGeocoding && (
        <>
          <style dangerouslySetInnerHTML={{ __html: `
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
      {!hasApiKey && (
        <div style={{
          fontSize: '12px',
          color: '#F59E0B',
          marginTop: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span>⚠️</span>
          <span>Google Maps API key not configured. Address autocomplete disabled.</span>
        </div>
      )}
    </div>
  );
}

