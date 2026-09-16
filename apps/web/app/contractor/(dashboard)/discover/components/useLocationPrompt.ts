'use client';
import React, { useState, useEffect } from 'react';
import { logger } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';

export interface LocationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSet: (location: LocationData) => void;
  contractorId: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  postcode?: string;
}

interface GeolocationError {
  code: number;
  message: string;
}

export function useLocationPrompt({
  isOpen,
  onClose,
  onLocationSet,
  contractorId,
}: LocationPromptModalProps) {
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [isLoadingManual, setIsLoadingManual] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowManualForm(false);
      setError(null);
      setManualAddress('');
      setIsLoadingGeo(false);
      setIsLoadingManual(false);
    }
  }, [isOpen]);

  // Handle browser geolocation
  const handleUseCurrentLocation = async () => {
    setError(null);
    setIsLoadingGeo(true);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsLoadingGeo(false);
      return;
    }

    // Check permission status first (if supported)
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({
          name: 'geolocation' as PermissionName,
        });
        if (permission.state === 'denied') {
          setError(
            'Location permission denied. Please enable location access in your browser settings.'
          );
          setIsLoadingGeo(false);
          return;
        }
      } catch (err) {
        // Permission API not fully supported, continue anyway
        logger.warn('Permission API check failed', {
          error: err,
          service: 'ui',
        });
      }
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocode to get address
          const addressData = await reverseGeocode(latitude, longitude);

          // Save to database
          await saveLocationToProfile({
            latitude,
            longitude,
            ...addressData,
          });

          // Notify parent component
          onLocationSet({
            latitude,
            longitude,
            ...addressData,
          });

          // Close modal
          onClose();
        } catch (err) {
          setError('Failed to save location. Please try again.');
          logger.error('Location save error', err, { service: 'ui' });
        } finally {
          setIsLoadingGeo(false);
        }
      },
      (error: GeolocationError) => {
        setIsLoadingGeo(false);

        // Handle specific geolocation errors
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            setError(
              'Location permission denied. Please enable location access in your browser settings.'
            );
            break;
          case 2: // POSITION_UNAVAILABLE
            setError(
              'Location information is unavailable. Please try manual entry.'
            );
            break;
          case 3: // TIMEOUT
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError(
              'Unable to retrieve your location. Please try manual entry.'
            );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle manual address entry
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoadingManual(true);

    if (!manualAddress.trim()) {
      setError('Please enter an address');
      setIsLoadingManual(false);
      return;
    }

    try {
      // Geocode the address
      const locationData = await geocodeAddress(manualAddress);

      if (!locationData) {
        setError(
          'Could not find location. Please check the address and try again.'
        );
        setIsLoadingManual(false);
        return;
      }

      // Save to database
      await saveLocationToProfile(locationData);

      // Notify parent component
      onLocationSet(locationData);

      // Close modal
      onClose();
    } catch (err) {
      setError('Failed to save location. Please try again.');
      logger.error('Manual location save error', err, { service: 'ui' });
    } finally {
      setIsLoadingManual(false);
    }
  };

  // Reverse geocode coordinates to address using SECURE PROXY
  const reverseGeocode = async (
    lat: number,
    lng: number
  ): Promise<Partial<LocationData>> => {
    try {
      const response = await fetch('/api/geocode-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify({ lat, lng }),
      });

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();

      if (data.formatted_address) {
        // Parse address components from formatted address
        const addressParts = data.formatted_address
          .split(',')
          .map((p: string) => p.trim());

        return {
          address: data.formatted_address,
          city: addressParts[0] || undefined,
          postcode:
            addressParts.find((p: string) =>
              /[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}/i.test(p)
            ) || undefined,
        };
      }

      return {};
    } catch (err) {
      logger.error('Reverse geocoding error', err, { service: 'ui' });
      return {};
    }
  };

  // Geocode address to coordinates using SECURE PROXY
  const geocodeAddress = async (
    address: string
  ): Promise<LocationData | null> => {
    try {
      const response = await fetch('/api/geocode-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();

      if (
        Number.isFinite(data.latitude) &&
        Number.isFinite(data.longitude) &&
        data.formatted_address
      ) {
        // Parse address components from formatted address
        const addressParts = data.formatted_address
          .split(',')
          .map((p: string) => p.trim());

        return {
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.formatted_address,
          city: addressParts[0] || undefined,
          postcode:
            addressParts.find((p: string) =>
              /[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}/i.test(p)
            ) || undefined,
        };
      }

      return null;
    } catch (err) {
      logger.error('Geocoding error', err, { service: 'ui' });
      return null;
    }
  };

  // Save location to contractor profile
  const saveLocationToProfile = async (location: LocationData) => {
    const response = await fetch('/api/contractor/profile/location', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(await getCsrfHeaders()),
      },
      body: JSON.stringify({
        contractorId,
        ...location,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save location');
    }

    return response.json();
  };

  return {
    isLoadingGeo,
    isLoadingManual,
    showManualForm,
    setShowManualForm,
    error,
    setError,
    manualAddress,
    setManualAddress,
    handleUseCurrentLocation,
    handleManualSubmit,
  };
}
