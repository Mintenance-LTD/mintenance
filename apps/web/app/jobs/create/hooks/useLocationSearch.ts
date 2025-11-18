'use client';

import { useState, useEffect, useCallback } from 'react';

interface LocationSuggestion {
  display_name: string;
  place_id: string;
}

interface UseLocationSearchOptions {
  location: string;
  onLocationSelect?: (address: string) => void;
  debounceMs?: number;
}

interface UseLocationSearchReturn {
  suggestions: LocationSuggestion[];
  showSuggestions: boolean;
  isLoading: boolean;
  isDetectingLocation: boolean;
  searchAddresses: (query: string) => Promise<void>;
  handleLocationSelect: (address: string) => void;
  detectCurrentLocation: () => void;
  clearSuggestions: () => void;
}

/**
 * Hook for location search and autocomplete functionality
 * Handles address search, location detection, and suggestion management
 */
export function useLocationSearch({
  location,
  onLocationSelect,
  debounceMs = 500,
}: UseLocationSearchOptions): UseLocationSearchReturn {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Debounced address search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (location.trim().length >= 3) {
        searchAddresses(location);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [location, debounceMs]);

  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/geocoding/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to search addresses');
      }

      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setSuggestions([]);
      setShowSuggestions(false);
      // Don't show error to user - just silently fail (autocomplete is optional)
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLocationSelect = useCallback((address: string) => {
    if (onLocationSelect) {
      onLocationSelect(address);
    }
    setShowSuggestions(false);
    setSuggestions([]);
  }, [onLocationSelect]);

  const detectCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by your browser.');
    }

    setIsDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `/api/geocoding/reverse?lat=${latitude}&lon=${longitude}`
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to get address');
          }

          const data = await response.json();
          const address = data.address;
          let formattedLocation = '';

          if (address.road) formattedLocation += address.road;
          if (address.house_number) formattedLocation = address.house_number + ' ' + formattedLocation;
          if (address.suburb) formattedLocation += ', ' + address.suburb;
          if (address.city || address.town || address.village) {
            formattedLocation += ', ' + (address.city || address.town || address.village);
          }
          if (address.postcode) formattedLocation += ', ' + address.postcode;

          const finalLocation = formattedLocation.trim() || data.display_name;

          if (onLocationSelect) {
            onLocationSelect(finalLocation);
          }
          setShowSuggestions(false);
          setSuggestions([]);
        } catch (error) {
          console.error('Error getting address:', error);
          throw error;
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        let message = 'Unable to retrieve your location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message += 'Please enable location permissions in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            message += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message += 'Location request timed out.';
            break;
          default:
            message += 'An unknown error occurred.';
        }
        
        throw new Error(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [onLocationSelect]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  return {
    suggestions,
    showSuggestions,
    isLoading,
    isDetectingLocation,
    searchAddresses,
    handleLocationSelect,
    detectCurrentLocation,
    clearSuggestions,
  };
}

