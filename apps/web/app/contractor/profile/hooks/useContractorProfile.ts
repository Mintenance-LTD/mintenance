import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { logger } from '@mintenance/shared';
import { queryKeys } from '@/lib/react-query-client';

/**
 * Sprint 7 (4.6): replaced router.refresh() with React Query invalidation.
 * router.refresh() reloaded the whole route tree which blew away the form's
 * own state — users editing a second field while Save was in flight lost
 * their input on success. invalidateQueries targets only the contractor's
 * detail cache, so the page re-fetches data without a full component tree
 * remount and local form state survives.
 */
export interface ContractorData {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  profile_image_url?: string;
  admin_verified?: boolean;
  bio?: string;
  city?: string;
  country?: string;
  phone?: string;
  company_name?: string;
  license_number?: string;
  created_at?: string;
}
export interface ContractorMetrics {
  profileCompletion: number;
  averageRating: number;
  totalReviews: number;
  jobsCompleted: number;
  winRate: number;
  totalEarnings: number;
  totalBids: number;
}
interface ProfileFormData {
  first_name: string;
  last_name: string;
  bio: string;
  city: string;
  phone: string;
  company_name: string;
  license_number: string;
}
export function useContractorProfile(
  initialContractor: ContractorData,
  initialMetrics: ContractorMetrics
) {
  const queryClient = useQueryClient();
  const [contractor, setContractor] = useState(initialContractor);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: contractor.first_name || '',
    last_name: contractor.last_name || '',
    bio: contractor.bio || '',
    city: contractor.city || '',
    phone: contractor.phone || '',
    company_name: contractor.company_name || '',
    license_number: contractor.license_number || '',
  });
  const updateFormField = useCallback(
    (field: keyof ProfileFormData, value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );
  const saveProfile = useCallback(
    async (csrfToken: string) => {
      setIsSaving(true);
      try {
        const response = await fetch(
          `/api/contractors/${contractor.id}/profile`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify(formData),
          }
        );
        if (!response.ok) {
          throw new Error('Failed to update profile');
        }
        const updatedProfile = await response.json();
        setContractor((prev) => ({
          ...prev,
          ...updatedProfile,
        }));
        toast.success('Profile updated successfully!');
        setIsEditing(false);
        // Sprint 7 (4.6): scoped cache invalidation instead of full route
        // refresh. Keeps any concurrently-edited form state alive.
        queryClient.invalidateQueries({
          queryKey: queryKeys.contractors.details(contractor.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.contractors.all,
        });
        logger.info('Profile updated', {
          contractorId: contractor.id,
          fields: Object.keys(formData),
        });
        return true;
      } catch (error) {
        logger.error('Failed to update profile', {
          error: error instanceof Error ? error.message : 'Unknown error',
          contractorId: contractor.id,
        });
        toast.error('Failed to update profile. Please try again.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [contractor.id, formData, queryClient]
  );
  const uploadProfileImage = useCallback(
    async (file: File, csrfToken: string) => {
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', 'profile');
        const response = await fetch(
          `/api/contractors/${contractor.id}/upload-image`,
          {
            method: 'POST',
            headers: {
              'X-CSRF-Token': csrfToken,
            },
            body: formData,
          }
        );
        if (!response.ok) {
          throw new Error('Failed to upload image');
        }
        const { url } = await response.json();
        setContractor((prev) => ({
          ...prev,
          profile_image_url: url,
        }));
        toast.success('Profile photo updated!');
        // Sprint 7 (4.6): scoped invalidation instead of router.refresh()
        queryClient.invalidateQueries({
          queryKey: queryKeys.contractors.details(contractor.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.contractors.all,
        });
        return url;
      } catch (error) {
        logger.error('Failed to upload profile image', {
          error: error instanceof Error ? error.message : 'Unknown error',
          contractorId: contractor.id,
        });
        toast.error('Failed to upload image. Please try again.');
        return null;
      }
    },
    [contractor.id, queryClient]
  );
  const cancelEdit = useCallback(() => {
    setFormData({
      first_name: contractor.first_name || '',
      last_name: contractor.last_name || '',
      bio: contractor.bio || '',
      city: contractor.city || '',
      phone: contractor.phone || '',
      company_name: contractor.company_name || '',
      license_number: contractor.license_number || '',
    });
    setIsEditing(false);
  }, [contractor]);
  return {
    contractor,
    metrics,
    isEditing,
    isSaving,
    formData,
    setIsEditing,
    updateFormField,
    saveProfile,
    uploadProfileImage,
    cancelEdit,
  };
}
