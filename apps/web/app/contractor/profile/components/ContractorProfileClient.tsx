'use client';

import React, { useState } from 'react';
import { ProfileHeader } from './ProfileHeader';
import { ProfileStats } from './ProfileStats';
import { ProfileGallery } from './ProfileGallery';
import { ProfileReviews } from './ProfileReviews';
import { ProfileQuickActions } from './ProfileQuickActions';
import { EditProfileModal } from './EditProfileModal';
import { SkillsManagementModal } from './SkillsManagementModal';
import { PhotoUploadModal } from './PhotoUploadModal';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { useCSRF } from '@/lib/hooks/useCSRF';

interface ContractorProfileClientProps {
  contractor: any;
  skills: Array<{ skill_name: string }>;
  reviews: any[];
  completedJobs: any[];
  posts: any[];
  metrics: {
    profileCompletion: number;
    averageRating: number;
    totalReviews: number;
    jobsCompleted: number;
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
      formData.append('isAvailable', data.isAvailable.toString());

      if (data.profileImage) {
        formData.append('profileImage', data.profileImage);
      }

      const response = await fetch('/api/contractor/update-profile', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      throw error;
    }
  };

  const handleSaveSkills = async (selectedSkills: string[]) => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[12] }}>
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[8] }}>
          <ProfileGallery
            completedJobs={completedJobs || []}
            posts={posts || []}
            onAddPhotos={() => setShowPhotoModal(true)}
          />
          <ProfileReviews reviews={reviews || []} />
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal
          contractor={contractor}
          skills={skills}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveProfile}
        />
      )}

      {showSkillsModal && (
        <SkillsManagementModal
          currentSkills={skills || []}
          onClose={() => setShowSkillsModal(false)}
          onSave={handleSaveSkills}
        />
      )}

      {showPhotoModal && (
        <PhotoUploadModal
          onClose={() => setShowPhotoModal(false)}
          onUpload={handleUploadPhotos}
        />
      )}
    </div>
  );
}

