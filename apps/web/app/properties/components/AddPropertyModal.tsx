'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPropertyModal({ isOpen, onClose, onSuccess }: AddPropertyModalProps) {
  const [formData, setFormData] = useState({
    property_name: '',
    address: '',
    property_type: 'residential' as 'residential' | 'commercial' | 'rental',
    is_primary: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name: string; place_id: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        property_name: '',
        address: '',
        property_type: 'residential',
        is_primary: false,
      });
      setError('');
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  }, [isOpen]);

  // Debounced address search for autocomplete
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.address.trim().length >= 3) {
        searchAddresses(formData.address);
      } else {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.address]);

  const searchAddresses = async (query: string) => {
    if (query.length < 3) return;

    setIsLoadingSuggestions(true);
    try {
      // Use geocoding API for address autocomplete
      const response = await fetch(
        `/api/geocoding/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to search addresses');
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setLocationSuggestions(data.map((item: any) => ({
          display_name: item.display_name || item.address || item.name,
          place_id: item.place_id || item.osm_id || Math.random().toString(),
        })));
        setShowSuggestions(data.length > 0);
      }
    } catch (err) {
      console.error('Error fetching address suggestions:', err);
      setLocationSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: { display_name: string; place_id: string }) => {
    setFormData(prev => ({ ...prev, address: suggestion.display_name }));
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.property_name.trim()) {
      setError('Property name is required');
      return;
    }

    if (!formData.address.trim()) {
      setError('Address is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create property');
      }

      // Success - close modal and refresh
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create property. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: theme.spacing[4],
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing[6],
        }}>
          <h2 style={{
            margin: 0,
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            Add New Property
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: theme.borderRadius.md,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.textSecondary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: theme.spacing[4],
            padding: theme.spacing[3],
            backgroundColor: '#FEE2E2',
            border: '1px solid #EF4444',
            borderRadius: theme.borderRadius.md,
            color: '#EF4444',
            fontSize: theme.typography.fontSize.sm,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          {/* Property Name */}
          <div>
            <label htmlFor="property_name" style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              Property Name *
            </label>
            <input
              type="text"
              id="property_name"
              value={formData.property_name}
              onChange={(e) => setFormData(prev => ({ ...prev, property_name: e.target.value }))}
              placeholder="e.g., My Home, Rental Property, Office Building"
              required
              style={{
                width: '100%',
                padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surface,
              }}
            />
          </div>

          {/* Address with Autocomplete */}
          <div style={{ position: 'relative' }}>
            <label htmlFor="address" style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              Address *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                onFocus={() => {
                  if (locationSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Enter property address"
                required
                style={{
                  width: '100%',
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surface,
                }}
              />
              {isLoadingSuggestions && (
                <div style={{
                  position: 'absolute',
                  right: theme.spacing[3],
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}>
                  <Icon name="refresh" size={16} color={theme.colors.textSecondary} />
                </div>
              )}
            </div>

            {/* Address Suggestions */}
            {showSuggestions && locationSuggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: theme.spacing[1],
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 100,
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                {locationSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    style={{
                      width: '100%',
                      padding: theme.spacing[3],
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textPrimary,
                      borderBottom: `1px solid ${theme.colors.border}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {suggestion.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Property Type */}
          <div>
            <label htmlFor="property_type" style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              Property Type *
            </label>
            <select
              id="property_type"
              value={formData.property_type}
              onChange={(e) => setFormData(prev => ({ ...prev, property_type: e.target.value as 'residential' | 'commercial' | 'rental' }))}
              required
              style={{
                width: '100%',
                padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surface,
                cursor: 'pointer',
              }}
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="rental">Rental</option>
            </select>
          </div>

          {/* Primary Property Checkbox */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            padding: theme.spacing[3],
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.md,
          }}>
            <input
              type="checkbox"
              id="is_primary"
              checked={formData.is_primary}
              onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
              }}
            />
            <label htmlFor="is_primary" style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textPrimary,
              cursor: 'pointer',
              flex: 1,
            }}>
              Set as primary property
            </label>
          </div>

          {/* Form Actions */}
          <div style={{
            display: 'flex',
            gap: theme.spacing[3],
            marginTop: theme.spacing[2],
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                backgroundColor: 'transparent',
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                border: 'none',
                borderRadius: theme.borderRadius.md,
                backgroundColor: theme.colors.primary,
                color: 'white',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1,
              }}
            >
              {isSubmitting ? 'Adding...' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

