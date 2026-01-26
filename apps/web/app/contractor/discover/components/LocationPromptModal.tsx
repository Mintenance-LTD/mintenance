'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, MapPinned, X, AlertCircle, Loader2 } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { logger } from '@mintenance/shared';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface LocationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSet: (location: LocationData) => void;
  contractorId: string;
}

interface LocationData {
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

// ============================================
// LOCATION PROMPT MODAL COMPONENT
// ============================================

export function LocationPromptModal({
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
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (permission.state === 'denied') {
          setError('Location permission denied. Please enable location access in your browser settings.');
          setIsLoadingGeo(false);
          return;
        }
      } catch (err) {
        // Permission API not fully supported, continue anyway
        logger.warn('Permission API check failed', err, { service: 'ui' });
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
            setError('Location permission denied. Please enable location access in your browser settings.');
            break;
          case 2: // POSITION_UNAVAILABLE
            setError('Location information is unavailable. Please try manual entry.');
            break;
          case 3: // TIMEOUT
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError('Unable to retrieve your location. Please try manual entry.');
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
        setError('Could not find location. Please check the address and try again.');
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
  const reverseGeocode = async (lat: number, lng: number): Promise<Partial<LocationData>> => {
    try {
      const response = await fetch('/api/geocode-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lat, lng }),
      });

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();

      if (data.formatted_address) {
        // Parse address components from formatted address
        const addressParts = data.formatted_address.split(',').map((p: string) => p.trim());

        return {
          address: data.formatted_address,
          city: addressParts[0] || undefined,
          postcode: addressParts.find((p: string) => /[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}/i.test(p)) || undefined,
        };
      }

      return {};
    } catch (err) {
      logger.error('Reverse geocoding error', err, { service: 'ui' });
      return {};
    }
  };

  // Geocode address to coordinates using SECURE PROXY
  const geocodeAddress = async (address: string): Promise<LocationData | null> => {
    try {
      const response = await fetch('/api/geocode-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();

      if (data.latitude && data.longitude && data.formatted_address) {
        // Parse address components from formatted address
        const addressParts = data.formatted_address.split(',').map((p: string) => p.trim());

        return {
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.formatted_address,
          city: addressParts[0] || undefined,
          postcode: addressParts.find((p: string) => /[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}/i.test(p)) || undefined,
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
        'X-CSRF-Token': (window as any).csrfToken || '',
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

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto animate-slideUp"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-modal-title"
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 border-b border-gray-200">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-7 h-7 text-teal-600" />
              </div>
              <div>
                <h2 id="location-modal-title" className="text-2xl font-bold text-gray-900">
                  Set Your Location
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Get personalized job recommendations near you
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {!showManualForm ? (
              <>
                {/* Benefits List */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">See jobs in your area first</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">Filter by distance from your location</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">Better match with local homeowners</p>
                  </div>
                </div>

                {/* Primary Action - Use Current Location */}
                <button
                  onClick={handleUseCurrentLocation}
                  disabled={isLoadingGeo}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoadingGeo ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Getting Your Location...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5" />
                      Use My Current Location
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">or</span>
                  </div>
                </div>

                {/* Secondary Action - Manual Entry */}
                <button
                  onClick={() => setShowManualForm(true)}
                  className="w-full py-3.5 px-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-teal-500 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <MapPinned className="w-5 h-5" />
                  Enter Address Manually
                </button>
              </>
            ) : (
              <>
                {/* Manual Address Form */}
                <form onSubmit={handleManualSubmit}>
                  <div className="mb-4">
                    <label htmlFor="manual-address" className="block text-sm font-medium text-gray-700 mb-2">
                      Enter your address or postcode
                    </label>
                    <input
                      id="manual-address"
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="e.g., SW1A 1AA or 10 Downing Street, London"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      disabled={isLoadingManual}
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualForm(false);
                        setManualAddress('');
                        setError(null);
                      }}
                      className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                      disabled={isLoadingManual}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoadingManual || !manualAddress.trim()}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingManual ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Location'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-200">
            <button
              onClick={() => {
                localStorage.setItem('location-prompt-dismissed', 'true');
                onClose();
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Skip for now
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              You can always set your location later in settings
            </p>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 200ms ease-out;
        }

        .animate-slideUp {
          animation: slideUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </>
  );
}

export default LocationPromptModal;
