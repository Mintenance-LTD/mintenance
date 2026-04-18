'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@mintenance/shared';

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

  // Sprint 7 (6.2): AbortController so in-flight geocode requests are
  // cancelled when the user types another character (debounce re-fires)
  // or the component unmounts. Without this we get "setState on unmounted
  // component" warnings and stale results clobbering newer ones.
  const abortRef = useRef<AbortController | null>(null);

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

  // Abort any in-flight request on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) return;

    // Cancel any previous in-flight search first
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/geocoding/search?q=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to search addresses');
      }

      const data = await response.json();
      // If another search superseded us before the response came back,
      // do not overwrite its state.
      if (abortRef.current !== controller) return;
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      // Aborted requests arrive as a DOMException — these are expected
      // and should be silent.
      if ((error as { name?: string })?.name === 'AbortError') return;
      logger.error('Error searching addresses:', error);
      if (abortRef.current === controller) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      // Don't show error to user - just silently fail (autocomplete is optional)
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
      }
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
          logger.error('Error getting address:', error);
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

