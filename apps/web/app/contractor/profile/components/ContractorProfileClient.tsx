'use client';

import React, { useState } from 'react';
import { ProfileHeader } from './ProfileHeader';
import { ProfileStats, PerformanceSnapshot } from './ProfileStats';
import { ProfileGallery } from './ProfileGallery';
import { ProfileReviews } from './ProfileReviews';
import { ProfileQuickActions } from './ProfileQuickActions';
import { EditProfileDialog } from './EditProfileDialog';
import { SkillsManagementDialog } from './SkillsManagementDialog';
import { PhotoUploadDialog } from './PhotoUploadDialog';
import { ContractorDataPrivacy } from './ContractorDataPrivacy';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { useCSRF } from '@/lib/hooks/useCSRF';

interface ContractorProfileClientProps {
  contractor: any;
  skills: Array<{ skill_name: string; skill_icon?: string | null }>;
  reviews: any[];
  completedJobs: any[];
  posts: any[];
  metrics: {
    profileCompletion: number;
    averageRating: number;
    totalReviews: number;
    jobsCompleted: number;
    winRate?: number; // Optional for backward compatibility
  };
}

/**
 * ContractorProfileClient Component
 * 
 * Client-side wrapper for contractor profile with modal management.
 * Following Single Responsibility Principle - manages profile interactions.
 * 
 * @filesize Target: <250 lines
 */
export function ContractorProfileClient({
  contractor,
  skills,
  reviews,
  completedJobs,
  posts,
  metrics,
}: ContractorProfileClientProps) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const { csrfToken } = useCSRF();

  const handleSaveProfile = async (data: any) => {
    try {
      if (!csrfToken) {
        throw new Error('Security token not available. Please refresh the page.');
      }

      const formData = new FormData();
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      formData.append('bio', data.bio);
      formData.append('city', data.city);
      formData.append('country', data.country);
      formData.append('phone', data.phone);
      formData.append('companyName', data.companyName || '');
      formData.append('licenseNumber', data.licenseNumber || '');
      formData.append('isAvailable', data.isAvailable.toString());

      // Add coordinates and address if available from Places Autocomplete
      if (data.latitude !== undefined) {
        formData.append('latitude', data.latitude.toString());
      }
      if (data.longitude !== undefined) {
        formData.append('longitude', data.longitude.toString());
      }
      if (data.address) {
        formData.append('address', data.address);
      }

      if (data.profileImage) {
        formData.append('profileImage', data.profileImage);
      }

      const response = await fetch('/api/contractor/update-profile', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
        credentials: 'include', // Include cookies for CSRF validation
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.details || error.message || error.error || 'Failed to update profile';
        throw new Error(errorMessage);
      }

      // Save skills if provided
      if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
        try {
          const skillsResponse = await fetch('/api/contractor/manage-skills', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken,
            },
            credentials: 'include', // Include cookies for CSRF validation
            body: JSON.stringify({ skills: data.skills }),
          });

          if (!skillsResponse.ok) {
            const skillsError = await skillsResponse.json();
            console.warn('Failed to update skills:', skillsError.message || 'Unknown error');
            // Don't throw - profile update succeeded, skills update is secondary
          }
        } catch (skillsError) {
          console.warn('Error updating skills:', skillsError);
          // Don't throw - profile update succeeded, skills update is secondary
        }
      }

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      throw error;
    }
  };

  const handleSaveSkills = async (selectedSkills: Array<{ skill_name: string; skill_icon: string }> | string[]) => {
    try {
      if (!csrfToken) {
        throw new Error('Security token not available. Please refresh the page.');
      }

      const response = await fetch('/api/contractor/manage-skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include', // Include cookies for CSRF validation
        body: JSON.stringify({ skills: selectedSkills }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update skills');
      }

      // Refresh the page to show updated skills
      router.refresh();
    } catch (error) {
      throw error;
    }
  };

  const handleUploadPhotos = async (data: { files: File[], title: string, category: string }) => {
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('category', data.category);
      
      data.files.forEach((file, index) => {
        formData.append(`photos`, file);
      });

      const response = await fetch('/api/contractor/upload-photos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload photos');
      }

      // Refresh the page to show new photos
      router.refresh();
    } catch (error) {
      throw error;
    }
  };

  return (
    <div 
      suppressHydrationWarning
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        rowGap: theme.spacing[12],
        columnGap: theme.spacing[12],
        paddingLeft: theme.spacing[6] 
      }}>
      <ProfileHeader
        contractor={contractor}
        metrics={metrics}
        onEditProfile={() => setShowEditModal(true)}
        onManageSkills={() => setShowSkillsModal(true)}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          gap: theme.spacing[10],
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[8] }}>
          <ProfileQuickActions unreadMessagesCount={0} />
          <ProfileStats
            metrics={metrics}
            skills={skills || []}
            onManageSkills={() => setShowSkillsModal(true)}
          />
          <ContractorDataPrivacy contractorId={contractor.id} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[8] }}>
          <PerformanceSnapshot metrics={metrics} />
          <ProfileGallery
            completedJobs={completedJobs || []}
            posts={posts || []}
            onAddPhotos={() => setShowPhotoModal(true)}
          />
          <ProfileReviews reviews={reviews || []} />
        </div>
      </div>

      <EditProfileDialog
        open={showEditModal}
        onOpenChange={setShowEditModal}
        contractor={contractor}
        skills={skills}
        onSave={handleSaveProfile}
      />

      <SkillsManagementDialog
        open={showSkillsModal}
        onOpenChange={setShowSkillsModal}
        currentSkills={skills || []}
        onSave={handleSaveSkills}
      />

      <PhotoUploadDialog
        open={showPhotoModal}
        onOpenChange={setShowPhotoModal}
        onUpload={handleUploadPhotos}
      />
    </div>
  );
}

