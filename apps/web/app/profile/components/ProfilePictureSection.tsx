/**
 * Profile Picture Section Component
 */

'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface ProfilePictureSectionProps {
  profileImage: string | null;
  initials: string;
  isEditing: boolean;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfilePictureSection({
  profileImage,
  initials,
  isEditing,
  onImageSelect,
}: ProfilePictureSectionProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: theme.spacing[4],
      marginBottom: theme.spacing[8],
      paddingBottom: theme.spacing[8],
      borderBottom: `1px solid ${theme.colors.border}`,
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: theme.borderRadius.full,
          backgroundColor: theme.colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: theme.typography.fontWeight.bold,
          fontSize: theme.typography.fontSize['2xl'],
          overflow: 'hidden',
          border: `4px solid ${theme.colors.border}`,
        }}>
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            initials
          )}
        </div>
        {isEditing && (
          <label
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '36px',
              height: '36px',
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.primary,
              border: `3px solid white`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1E293B';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primary;
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={onImageSelect}
              style={{ display: 'none' }}
            />
            <Icon name="camera" size={18} color="white" />
          </label>
        )}
      </div>
      {isEditing && (
        <p style={{
          margin: 0,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textSecondary,
          textAlign: 'center',
        }}>
          Click the camera icon to change your profile picture
        </p>
      )}
    </div>
  );
}

