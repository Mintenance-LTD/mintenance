'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface ProfilePhotoUploadProps {
  formData: {
    firstName: string;
    lastName: string;
  };
  profileImage: File | null;
  setProfileImage: (file: File | null) => void;
  imagePreview: string | null;
  setImagePreview: (preview: string | null) => void;
  setError: (error: string | null) => void;
}

/**
 * ProfilePhotoUpload Component
 *
 * Circular profile photo display with upload/change functionality.
 * Validates file size (max 5MB) and file type (images only).
 */
export function ProfilePhotoUpload({
  formData,
  profileImage: _profileImage,
  setProfileImage,
  imagePreview,
  setImagePreview,
  setError,
}: ProfilePhotoUploadProps) {
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('File must be an image');
        return;
      }

      setProfileImage(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{
      marginBottom: theme.spacing[8],
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: theme.spacing[4],
    }}>
      <div style={{
        width: '144px',
        height: '144px',
        borderRadius: '50%',
        backgroundColor: theme.colors.backgroundSecondary,
        backgroundImage: imagePreview ? `url(${imagePreview})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: `3px solid ${theme.colors.border}`,
        fontSize: theme.typography.fontSize['4xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textSecondary,
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onClick={() => document.getElementById('profile-image-input')?.click()}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = theme.shadows.md;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      >
        {!imagePreview && (
          <>
            {formData.firstName?.[0] || 'U'}{formData.lastName?.[0] || ''}
          </>
        )}
        {imagePreview && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
          >
            <Icon name="camera" size={32} color="white" />
          </div>
        )}
      </div>

      <input
        id="profile-image-input"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: 'none' }}
      />

      <button
        type="button"
        onClick={() => document.getElementById('profile-image-input')?.click()}
        style={{
          padding: `${theme.spacing[2]} ${theme.spacing[5]}`,
          backgroundColor: theme.colors.primary,
          border: 'none',
          borderRadius: theme.borderRadius.lg,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          color: 'white',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.primaryLight;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.primary;
        }}
      >
        {imagePreview ? 'Change Photo' : 'Upload Photo'}
      </button>
    </div>
  );
}
