'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { useAddPropertyForm } from './AddPropertyModal/useAddPropertyForm';
import { AddressField } from './AddPropertyModal/AddressField';
import { PhotoUploader } from './AddPropertyModal/PhotoUploader';
import type { AddPropertyModalProps } from './AddPropertyModal/types';

export function AddPropertyModal(props: AddPropertyModalProps) {
  // Defensive prop destructuring with defaults to prevent test crashes
  const {
    isOpen = false,
    onClose = () => {},
    onSuccess = () => {},
  } = props || {};

  const {
    formData,
    setFormData,
    isSubmitting,
    error,
    locationSuggestions,
    showSuggestions,
    setShowSuggestions,
    isLoadingSuggestions,
    imagePreviews,
    isUploadingImages,
    handleSelectSuggestion,
    handleImageSelect,
    removeImage,
    handleSubmit,
  } = useAddPropertyForm(isOpen, onClose, onSuccess);

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

          <AddressField
            address={formData.address}
            onAddressChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
            locationSuggestions={locationSuggestions}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            onSelectSuggestion={handleSelectSuggestion}
          />

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

          <PhotoUploader
            imagePreviews={imagePreviews}
            isUploadingImages={isUploadingImages}
            isSubmitting={isSubmitting}
            onImageSelect={handleImageSelect}
            onRemoveImage={removeImage}
          />

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
