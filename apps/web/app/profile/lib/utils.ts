/**
 * Profile Utilities
 * Utility functions for profile page
 */

import { logger } from '@mintenance/shared';

/**
 * Format address from reverse geocoding response
 */
export function formatAddressFromGeocoding(address: {
  road?: string;
  house_number?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  postcode?: string;
}): string {
  let formattedLocation = '';

  if (address.road) formattedLocation += address.road;
  if (address.house_number) formattedLocation = address.house_number + ' ' + formattedLocation;
  if (address.suburb) formattedLocation += ', ' + address.suburb;
  if (address.city || address.town || address.village) {
    formattedLocation += ', ' + (address.city || address.town || address.village);
  }
  if (address.postcode) formattedLocation += ', ' + address.postcode;

  return formattedLocation.trim();
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'Image must be less than 5MB' };
  }
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please select an image file' };
  }
  return { valid: true };
}

/**
 * Read image file as data URL
 */
export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      logger.error('Error reading image file', error, {
        service: 'profile',
      });
      reject(new Error('Failed to read image file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Save profile data
 */
export async function saveProfile(
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
  },
  profileImageFile: File | null,
  currentProfileImage: string | null
): Promise<{ success: boolean; error?: string; profileImageUrl?: string }> {
  try {
    // If profile image changed, upload it first
    if (profileImageFile) {
      const formDataUpload = new FormData();
      formDataUpload.append('profileImage', profileImageFile);
      formDataUpload.append('firstName', formData.firstName);
      formDataUpload.append('lastName', formData.lastName);
      formDataUpload.append('email', formData.email);
      formDataUpload.append('phone', formData.phone);
      formDataUpload.append('location', formData.location);

      const uploadResponse = await fetch('/api/user/update-profile', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const uploadData = await uploadResponse.json();
      return {
        success: true,
        profileImageUrl: uploadData.profileImageUrl || currentProfileImage || undefined,
      };
    }

    // Update profile data without image
    const updateResponse = await fetch('/api/user/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(errorData.error || 'Failed to update profile');
    }

    return { success: true };
  } catch (error) {
    logger.error('Error saving profile', error, {
      service: 'profile',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save profile',
    };
  }
}

