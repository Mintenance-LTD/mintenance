'use client';

import React, { useState, FormEvent } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { getSkillIcon } from '@/lib/skills/skill-icon-mapping';
import { SkillsSelector } from './SkillsSelector';
import { EditProfileTabs, type EditProfileTabId } from './EditProfileTabs';
import { DangerZoneSection } from './DangerZoneSection';
import { BasicInfoTab } from './EditProfileModal/BasicInfoTab';
import { LocationContactTab } from './EditProfileModal/LocationContactTab';
import { BusinessInfoTab } from './EditProfileModal/BusinessInfoTab';
import { ModalFooter } from './EditProfileModal/ModalFooter';
import type { ContractorData, ProfileSaveData, EditProfileFormData } from './EditProfileModal/types';

interface EditProfileModalProps {
  contractor: ContractorData | null;
  skills: Array<{ skill_name: string }>;
  onClose: () => void;
  onSave: (data: ProfileSaveData) => Promise<void>;
}

/**
 * EditProfileModal Component
 *
 * Modal form for editing contractor profile information.
 * Sub-components: ProfilePhotoUpload, SkillsSelector, EditProfileTabs, DangerZoneSection.
 */
export function EditProfileModal({ contractor, skills, onClose, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState<EditProfileFormData>({
    firstName: contractor?.first_name || '',
    lastName: contractor?.last_name || '',
    bio: contractor?.bio || '',
    city: contractor?.city || '',
    country: contractor?.country || 'UK',
    phone: contractor?.phone || '',
    companyName: contractor?.company_name || '',
    licenseNumber: contractor?.license_number || '',
    isAvailable: contractor?.is_available ?? true,
    latitude: contractor?.latitude || undefined,
    longitude: contractor?.longitude || undefined,
    address: contractor?.address || undefined,
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(contractor?.profile_image_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    skills?.map(s => s.skill_name) || []
  );
  const [activeTab, setActiveTab] = useState<EditProfileTabId>('basic');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updateData = {
        ...formData,
        profileImage,
        skills: selectedSkills.map(skillName => ({
          skill_name: skillName,
          skill_icon: getSkillIcon(skillName),
        })),
      };

      await onSave(updateData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing[4],
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.xl,
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: theme.shadows.xl,
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div style={{
            padding: theme.spacing[6],
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.colors.surface,
          }}>
            <h2 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              Edit Profile
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                padding: theme.spacing[2],
                borderRadius: theme.borderRadius.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon name="x" size={20} color={theme.colors.textSecondary} />
            </button>
          </div>

          {/* Tabs */}
          <EditProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Modal Body */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: theme.spacing[6], overflowY: 'auto', flex: 1 }}>
              {/* Error Message */}
              {error && (
                <div style={{
                  backgroundColor: '#FEE2E2',
                  color: theme.colors.error,
                  padding: theme.spacing[4],
                  borderRadius: theme.borderRadius.lg,
                  marginBottom: theme.spacing[6],
                  fontSize: theme.typography.fontSize.sm,
                  border: `1px solid ${theme.colors.error}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                }}>
                  <Icon name="alertCircle" size={18} color={theme.colors.error} />
                  {error}
                </div>
              )}

              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <BasicInfoTab
                  formData={formData}
                  setFormData={setFormData}
                  profileImage={profileImage}
                  setProfileImage={setProfileImage}
                  imagePreview={imagePreview}
                  setImagePreview={setImagePreview}
                  setError={setError}
                />
              )}

              {/* Location & Contact Tab */}
              {activeTab === 'location' && (
                <LocationContactTab formData={formData} setFormData={setFormData} />
              )}

              {/* Business Info Tab */}
              {activeTab === 'business' && (
                <BusinessInfoTab formData={formData} setFormData={setFormData} />
              )}

              {/* Skills Tab */}
              {activeTab === 'skills' && (
                <SkillsSelector
                  selectedSkills={selectedSkills}
                  setSelectedSkills={setSelectedSkills}
                  setError={setError}
                />
              )}
            </div>

            {/* Delete Account Section */}
            <DangerZoneSection contractorId={contractor?.id} loading={loading} />

            {/* Modal Footer */}
            <ModalFooter loading={loading} onClose={onClose} />
          </form>
        </div>
      </div>
    </>
  );
}

export type { ContractorData, ProfileSaveData };
