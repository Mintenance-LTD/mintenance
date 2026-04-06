'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { ProfilePhotoUpload } from '../ProfilePhotoUpload';
import type { EditProfileFormData } from './types';

interface BasicInfoTabProps {
  formData: EditProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<EditProfileFormData>>;
  profileImage: File | null;
  setProfileImage: React.Dispatch<React.SetStateAction<File | null>>;
  imagePreview: string | null;
  setImagePreview: React.Dispatch<React.SetStateAction<string | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function BasicInfoTab({
  formData,
  setFormData,
  profileImage,
  setProfileImage,
  imagePreview,
  setImagePreview,
  setError,
}: BasicInfoTabProps) {
  return (
    <div>
      {/* Profile Photo Upload */}
      <ProfilePhotoUpload
        formData={formData}
        profileImage={profileImage}
        setProfileImage={setProfileImage}
        imagePreview={imagePreview}
        setImagePreview={setImagePreview}
        setError={setError}
      />

      {/* Name Fields */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[6],
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}>
            First Name
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            style={{
              width: '100%',
              padding: theme.spacing[3],
              fontSize: theme.typography.fontSize.base,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.white,
              color: theme.colors.textPrimary,
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.colors.primary;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border;
            }}
            required
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}>
            Last Name
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            style={{
              width: '100%',
              padding: theme.spacing[3],
              fontSize: theme.typography.fontSize.base,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.white,
              color: theme.colors.textPrimary,
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.colors.primary;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border;
            }}
            required
          />
        </div>
      </div>

      {/* Bio */}
      <div style={{ marginBottom: theme.spacing[6] }}>
        <label style={{
          display: 'block',
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[2],
        }}>
          Bio / Description
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={5}
          maxLength={500}
          style={{
            width: '100%',
            padding: theme.spacing[3],
            fontSize: theme.typography.fontSize.base,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.white,
            color: theme.colors.textPrimary,
            fontFamily: 'inherit',
            resize: 'vertical',
            transition: 'border-color 0.2s',
            lineHeight: '1.6',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
          placeholder="Tell homeowners about your experience, specialties, and what makes you unique..."
        />
        <div style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textSecondary,
          marginTop: theme.spacing[2],
          textAlign: 'right',
        }}>
          {formData.bio.length}/500 characters
        </div>
      </div>

      {/* Availability Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing[5],
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.border}`,
      }}>
        <div>
          <label style={{
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            display: 'block',
            marginBottom: theme.spacing[1],
          }}>
            Available for New Projects
          </label>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            margin: 0,
          }}>
            Show your profile to homeowners looking for contractors
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
          style={{
            width: '60px',
            height: '32px',
            borderRadius: theme.borderRadius.full,
            backgroundColor: formData.isAvailable ? theme.colors.success : theme.colors.border,
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background-color 0.2s',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '4px',
            left: formData.isAvailable ? '32px' : '4px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'white',
            transition: 'left 0.2s',
            boxShadow: theme.shadows.sm,
          }} />
        </button>
      </div>
    </div>
  );
}
