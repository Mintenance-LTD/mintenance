'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import type { ImagePreview } from './types';

interface PhotoUploaderProps {
  imagePreviews: ImagePreview[];
  isUploadingImages: boolean;
  isSubmitting: boolean;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
}

export function PhotoUploader({
  imagePreviews,
  isUploadingImages,
  isSubmitting,
  onImageSelect,
  onRemoveImage,
}: PhotoUploaderProps) {
  const disabled = isUploadingImages || isSubmitting;

  return (
    <div>
      <label htmlFor="property_photos" style={{
        display: 'block',
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing[2],
      }}>
        Property Photos {imagePreviews.length > 0 && `(${imagePreviews.length}/10)`}
      </label>
      <input
        type="file"
        id="property_photos"
        accept="image/*"
        multiple
        onChange={onImageSelect}
        disabled={disabled}
        style={{ display: 'none' }}
      />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[3],
      }}>
        <label
          htmlFor="property_photos"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing[2],
            padding: theme.spacing[4],
            border: `2px dashed ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            backgroundColor: theme.colors.backgroundSecondary,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = theme.colors.primary;
              e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
          }}
        >
          <Icon name="image" size={20} color={theme.colors.primary} />
          <span style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textPrimary,
            fontWeight: theme.typography.fontWeight.medium,
          }}>
            {isUploadingImages ? 'Uploading...' : 'Click to add photos (max 10)'}
          </span>
        </label>

        {imagePreviews.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: theme.spacing[2],
          }}>
            {imagePreviews.map((preview, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: theme.borderRadius.md,
                  overflow: 'hidden',
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                }}
              >
                <img
                  src={preview.preview}
                  alt={`Property photo ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(index)}
                  disabled={disabled}
                  style={{
                    position: 'absolute',
                    top: theme.spacing[1],
                    right: theme.spacing[1],
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  <Icon name="x" size={14} color="white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
