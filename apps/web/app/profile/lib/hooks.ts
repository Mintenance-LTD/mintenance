/**
 * Profile Hooks
 * Custom hooks for profile page functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@mintenance/shared';
import type { LocationSuggestion, GeolocationAlert } from './types';

/**
 * Hook for address search with debouncing
 */
export function useAddressSearch(location: string) {
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/geocoding/search?q=${encodeURIComponent(query)}`
      );

      if (response.ok) {
        const data = await response.json();
        setLocationSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch (error) {
      logger.error('Error searching addresses', error, {
        service: 'profile',
      });
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (location.trim().length >= 3) {
        searchAddresses(location);
      } else {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [location, searchAddresses]);

  return {
    locationSuggestions,
    showSuggestions,
    setShowSuggestions,
    isSearching,
  };
}

/**
 * Hook for geolocation detection
 */
export function useGeolocation() {
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [geolocationAlert, setGeolocationAlert] = useState<GeolocationAlert>({
    open: false,
    message: '',
  });

  const detectLocation = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setGeolocationAlert({
          open: true,
          message: 'Geolocation is not supported by your browser',
        });
        reject(new Error('Geolocation not supported'));
        return;
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
              throw new Error('Failed to get address');
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
            setIsDetectingLocation(false);
            resolve(finalLocation);
          } catch (error) {
            logger.error('Error getting address', error, {
              service: 'profile',
            });
            setIsDetectingLocation(false);
            reject(new Error('Could not determine your address. Please enter it manually.'));
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
          setGeolocationAlert({
            open: true,
            message,
          });
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return {
    isDetectingLocation,
    geolocationAlert,
    setGeolocationAlert,
    detectLocation,
  };
}

